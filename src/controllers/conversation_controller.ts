import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import createError from 'http-errors';
import ConversationModel from '../models/conversation_model';
import MessageModel from '../models/message_model';
import { AuthRequest } from '../middleware/auth_middleware';

const toObjectId = (
  value: string,
  fieldName: string,
): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createError(400, `${fieldName} is invalid`);
  }
  return new mongoose.Types.ObjectId(value);
};

/**
 * Create a new conversation
 */
export const createConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;
    const { participantIds } = req.body;

    if (!userId) throw createError(401, 'User not authenticated');
    if (
      !participantIds ||
      !Array.isArray(participantIds) ||
      participantIds.some((id: unknown) => typeof id !== 'string')
    ) {
      throw createError(400, 'participantIds must be an array');
    }

    // Ensure creator is included
    const dedupedParticipantIds = Array.from(
      new Set(participantIds.filter((id: string) => id !== userId)),
    );
    const allParticipants = [userId, ...dedupedParticipantIds].map(
      (id: string) => toObjectId(id, 'participantId'),
    );

    const conversation = await ConversationModel.create({
      participants: allParticipants,
    });

    await conversation.populate('participants', 'fullName image email');

    res.status(201).json({
      conversationId: conversation._id.toString(),
      participants: conversation.participants,
      createdAt: conversation.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all conversations for authenticated user
 */
export const getUserConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requesterId = req.user?._id;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;

    if (!requesterId) throw createError(401, 'User not authenticated');
    const userId = toObjectId(requesterId, 'userId');

    const conversations = await ConversationModel.find({
      participants: userId,
    })
      .populate('participants', 'fullName image email')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await ConversationModel.countDocuments({
      participants: userId,
    });

    res.status(200).json({
      conversations: conversations.map((conv) => ({
        conversationId: conv._id.toString(),
        participants: conv.participants,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      })),
      total,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific conversation with messages
 */
export const getConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { conversationId } = req.params;
    const requesterId = req.user?._id;
    const limit = parseInt(req.query.messageLimit as string) || 50;
    const skip = parseInt(req.query.messageSkip as string) || 0;

    if (!requesterId) throw createError(401, 'User not authenticated');
    if (!conversationId || typeof conversationId !== 'string') {
      throw createError(400, 'Conversation ID is required');
    }
    const userId = toObjectId(requesterId, 'userId');
    const convoId = toObjectId(conversationId, 'Conversation ID');

    // Verify user is participant
    const conversation = await ConversationModel.findById(convoId);

    if (!conversation) throw createError(404, 'Conversation not found');

    const isParticipant = conversation.participants.some((p) =>
      p.equals(userId),
    );

    if (!isParticipant)
      throw createError(403, 'Not a participant in this conversation');

    await conversation.populate('participants', 'fullName image email');

    // Get message count
    const totalMessages = await MessageModel.countDocuments({
      conversationId: convoId,
    });

    // Get paginated messages
    const messages = await MessageModel.find({ conversationId: convoId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('senderId', 'fullName image email')
      .lean();

    res.status(200).json({
      conversationId: conversation._id.toString(),
      participants: conversation.participants,
      messages: messages.reverse(), // Return oldest to newest
      totalMessages,
      hasMore: skip + limit < totalMessages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add participant to conversation
 */
export const addParticipant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { conversationId } = req.params;
    const { newUserId } = req.body;
    const requesterId = req.user?._id;

    if (!requesterId) throw createError(401, 'User not authenticated');
    if (!conversationId || typeof conversationId !== 'string') {
      throw createError(400, 'Conversation ID is required');
    }
    if (!newUserId || typeof newUserId !== 'string') {
      throw createError(400, 'New user ID is required');
    }
    const userId = toObjectId(requesterId, 'userId');
    const convoId = toObjectId(conversationId, 'Conversation ID');
    const newUserObjectId = toObjectId(newUserId, 'New user ID');

    const conversation = await ConversationModel.findById(convoId);

    if (!conversation) throw createError(404, 'Conversation not found');
    if (!conversation.participants.some((p) => p.equals(userId))) {
      throw createError(403, 'Not a participant in this conversation');
    }

    // Check if user already in conversation
    if (conversation.participants.some((p) => p.equals(newUserObjectId))) {
      throw createError(400, 'User already in conversation');
    }

    // Add user
    conversation.participants.push(newUserObjectId);
    await conversation.save();
    await conversation.populate('participants', 'fullName image email');

    res.status(200).json({
      conversationId: conversation._id.toString(),
      participants: conversation.participants,
      message: 'User added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Leave conversation
 */
export const leaveConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { conversationId } = req.params;
    const requesterId = req.user?._id;

    if (!requesterId) throw createError(401, 'User not authenticated');
    if (!conversationId || typeof conversationId !== 'string')
      throw createError(400, 'Conversation ID is required');
    const userId = toObjectId(requesterId, 'userId');

    const convoId = toObjectId(conversationId, 'Conversation ID');

    const conversation = await ConversationModel.findById(convoId);

    if (!conversation) throw createError(404, 'Conversation not found');
    if (!conversation.participants.some((p) => p.equals(userId))) {
      throw createError(403, 'Not a participant in this conversation');
    }

    // Remove user from participants
    conversation.participants = conversation.participants.filter(
      (p) => !p.equals(userId),
    );
    await conversation.save();

    res.status(200).json({
      message: 'Left conversation successfully',
      conversationId: convoId.toString(),
    });
  } catch (error) {
    next(error);
  }
};
