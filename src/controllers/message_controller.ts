import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import createError from 'http-errors';
import MessageModel from '../models/message_model';
import ConversationModel from '../models/conversation_model';
import { AuthRequest } from '../middleware/auth_middleware';

/**
 * Get message history for a conversation (paginated)
 */
export const getConversationMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { conversationId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    if (!userId) throw createError(401, 'User not authenticated');
    if (!conversationId) throw createError(400, 'Conversation ID is required');

    const convoId = new mongoose.Types.ObjectId(conversationId as string);

    // Verify user is participant
    const conversation = await ConversationModel.findById(convoId);

    if (!conversation) throw createError(404, 'Conversation not found');

    const isParticipant = conversation.participants.some((p) =>
      p.equals(userId),
    );

    if (!isParticipant)
      throw createError(403, 'Not a participant in this conversation');

    // Get message count
    const totalCount = await MessageModel.countDocuments({
      conversationId: convoId,
    });

    // Get paginated messages (ordered newest to oldest for skip/limit)
    const messages = await MessageModel.find({ conversationId: convoId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('senderId', 'fullName image email')
      .lean();

    res.status(200).json({
      messages: messages.reverse(), // Return oldest to newest
      conversationId: conversationId.toString(),
      hasMore: skip + limit < totalCount,
      totalCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single message
 */
export const getMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { messageId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    if (!userId) throw createError(401, 'User not authenticated');
    if (!messageId) throw createError(400, 'Message ID is required');

    const msgId = new mongoose.Types.ObjectId(messageId as string);

    const message = await MessageModel.findById(msgId).populate(
      'senderId',
      'fullName image email',
    );

    if (!message) throw createError(404, 'Message not found');

    res.status(200).json({
      messageId: message._id.toString(),
      conversationId: message.conversationId.toString(),
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit message (owner only)
 */
export const editMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    if (!userId) throw createError(401, 'User not authenticated');
    if (!messageId) throw createError(400, 'Message ID is required');
    if (!content) throw createError(400, 'Content is required');

    const msgId = new mongoose.Types.ObjectId(messageId as string);

    const message = await MessageModel.findById(msgId);

    if (!message) throw createError(404, 'Message not found');

    // Verify ownership
    if (!message.senderId.equals(userId)) {
      throw createError(403, 'Not authorized to edit this message');
    }

    // Update message
    message.content = content;
    await message.save();
    await message.populate('senderId', 'fullName image email');

    res.status(200).json({
      messageId: message._id.toString(),
      conversationId: message.conversationId.toString(),
      content: message.content,
      updatedAt: message.updatedAt || new Date(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete message (owner only)
 */
export const deleteMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { messageId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    if (!userId) throw createError(401, 'User not authenticated');
    if (!messageId) throw createError(400, 'Message ID is required');

    const msgId = new mongoose.Types.ObjectId(messageId as string);

    const message = await MessageModel.findById(msgId);

    if (!message) throw createError(404, 'Message not found');

    // Verify ownership
    if (!message.senderId.equals(userId)) {
      throw createError(403, 'Not authorized to delete this message');
    }

    const conversationId = message.conversationId.toString();

    // Delete message
    await MessageModel.deleteOne({ _id: msgId });

    res.status(200).json({
      messageId: messageId,
      conversationId,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
