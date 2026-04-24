import { Socket, Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import ConversationModel from '../models/conversation_model';
import MessageModel from '../models/message_model';

export const setupConversationHandlers = (
  socket: Socket,
  io: SocketIOServer,
) => {
  const userId = socket.data.userId;
  const currentUserId = new mongoose.Types.ObjectId(userId);

  /**
   * Event: conversation:create
   * Create a new group conversation with multiple participants
   */
  socket.on(
    'conversation:create',
    async (data: { participantIds: string[] }, callback) => {
      try {
        // Ensure creator is included in participants
        const allParticipants = [
          userId,
          ...data.participantIds.filter((id) => id !== userId),
        ].map((id) => new mongoose.Types.ObjectId(id));

        // Create conversation
        const conversation = await ConversationModel.create({
          participants: allParticipants,
        });

        await conversation.populate('participants', 'fullName image email');

        // Add creator to conversation room
        socket.join(`conversation:${conversation._id}`);

        // Notify all participants (both online and offline will join when they load the app)
        io.to(`conversation:${conversation._id}`).emit('conversation:created', {
          conversationId: conversation._id.toString(),
          participants: conversation.participants,
          createdAt: conversation.createdAt,
        });

        callback({
          success: true,
          conversationId: conversation._id.toString(),
          message: 'Conversation created',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create conversation';
        callback({ success: false, error: errorMessage });
      }
    },
  );

  /**
   * Event: conversation:join
   * Join an existing conversation and load message history
   */
  socket.on(
    'conversation:join',
    async (data: { conversationId: string }, callback) => {
      try {
        const conversationId = new mongoose.Types.ObjectId(data.conversationId);

        // Verify user is participant in conversation
        const conversation = await ConversationModel.findById(conversationId);

        if (!conversation) {
          return callback({ success: false, error: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some((participantId) =>
          participantId.equals(currentUserId),
        );

        if (!isParticipant) {
          return callback({ success: false, error: 'Not a participant' });
        }

        // Join Socket.io room for this conversation
        socket.join(`conversation:${conversationId}`);

        // Load recent message history (latest 50 messages)
        const messages = await MessageModel.find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('senderId', 'fullName image')
          .lean();

        callback({
          success: true,
          messages: messages.reverse(), // Return oldest to newest
          conversationId: conversationId.toString(),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to join conversation';
        callback({ success: false, error: errorMessage });
      }
    },
  );

  /**
   * Event: conversation:leave
   * Leave a conversation
   */
  socket.on('conversation:leave', (data: { conversationId: string }) => {
    try {
      const conversationId = `conversation:${data.conversationId}`;
      socket.leave(conversationId);

      // Notify others in conversation
      io.to(conversationId).emit('user:leftConversation', {
        userId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      console.error('Error leaving conversation:', error);
    }
  });

  /**
   * Event: conversation:addUser
   * Add a participant to an existing conversation
   */
  socket.on(
    'conversation:addUser',
    async (data: { conversationId: string; newUserId: string }, callback) => {
      try {
        const conversationId = new mongoose.Types.ObjectId(data.conversationId);
        const newUserId = new mongoose.Types.ObjectId(data.newUserId);

        const conversation = await ConversationModel.findById(conversationId);

        if (!conversation) {
          return callback({ success: false, error: 'Conversation not found' });
        }

        if (!conversation.participants.some((p) => p.equals(currentUserId))) {
          return callback({ success: false, error: 'Not a participant' });
        }

        // Check if user already in conversation
        if (conversation.participants.some((p) => p.equals(newUserId))) {
          return callback({
            success: false,
            error: 'User already in conversation',
          });
        }

        // Add user to conversation
        conversation.participants.push(newUserId);
        await conversation.save();
        await conversation.populate('participants', 'fullName image email');

        // Notify conversation participants
        io.to(`conversation:${conversationId}`).emit('conversation:userAdded', {
          conversationId: conversationId.toString(),
          userId: newUserId.toString(),
          participants: conversation.participants,
        });

        callback({ success: true, message: 'User added' });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to add user';
        callback({ success: false, error: errorMessage });
      }
    },
  );

  /**
   * Event: conversation:removeUser
   * Remove a participant from a conversation
   */
  socket.on(
    'conversation:removeUser',
    async (data: { conversationId: string; userId: string }, callback) => {
      try {
        const conversationId = new mongoose.Types.ObjectId(data.conversationId);
        const targetUserId = new mongoose.Types.ObjectId(data.userId);

        const conversation = await ConversationModel.findById(conversationId);

        if (!conversation) {
          return callback({ success: false, error: 'Conversation not found' });
        }

        if (!conversation.participants.some((p) => p.equals(currentUserId))) {
          return callback({ success: false, error: 'Not a participant' });
        }

        // Remove user from participants
        conversation.participants = conversation.participants.filter(
          (p) => !p.equals(targetUserId),
        );
        await conversation.save();

        // Notify conversation participants
        io.to(`conversation:${conversationId}`).emit(
          'conversation:userRemoved',
          {
            conversationId: conversationId.toString(),
            userId: targetUserId.toString(),
          },
        );

        callback({ success: true, message: 'User removed' });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to remove user';
        callback({ success: false, error: errorMessage });
      }
    },
  );
};
