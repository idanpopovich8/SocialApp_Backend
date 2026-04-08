import { Socket, Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import MessageModel from '../models/message_model';
import ConversationModel from '../models/conversation_model';

export const setupMessageHandlers = (socket: Socket, io: SocketIOServer) => {
  const userId = socket.data.userId;

  /**
   * Event: message:send
   * Send a message to a conversation
   * Saves to DB and broadcasts to all participants in real-time
   */
  socket.on(
    'message:send',
    async (data: { conversationId: string; content: string }, callback) => {
      try {
        const conversationId = new mongoose.Types.ObjectId(data.conversationId);
        const senderId = new mongoose.Types.ObjectId(userId);

        // Verify conversation exists and user is participant
        const conversation = await ConversationModel.findById(conversationId);

        if (!conversation) {
          return callback({ success: false, error: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some((p) =>
          p.equals(senderId),
        );

        if (!isParticipant) {
          return callback({ success: false, error: 'Not a participant' });
        }

        // Create message
        const message = await MessageModel.create({
          conversationId,
          senderId,
          content: data.content,
        });

        // Update conversation's last message
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Populate sender info
        await message.populate('senderId', 'fullName image email');

        const messageData = {
          messageId: message._id.toString(),
          conversationId: conversationId.toString(),
          senderId: senderId.toString(),
          sender: message.senderId,
          content: message.content,
          createdAt: message.createdAt,
        };

        // Broadcast to all participants in conversation room
        io.to(`conversation:${conversationId}`).emit(
          'message:received',
          messageData,
        );

        // Callback to sender
        callback({ success: true, message: messageData });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to send message';
        callback({ success: false, error: errorMessage });
      }
    },
  );

  /**
   * Event: message:loadHistory
   * Load paginated message history for a conversation
   */
  socket.on(
    'message:loadHistory',
    async (
      data: {
        conversationId: string;
        limit?: number;
        skip?: number;
      },
      callback,
    ) => {
      try {
        const conversationId = new mongoose.Types.ObjectId(data.conversationId);
        const limit = data.limit || 50;
        const skip = data.skip || 0;

        // Get total count
        const totalCount = await MessageModel.countDocuments({
          conversationId,
        });

        // Get paginated messages
        const messages = await MessageModel.find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .populate('senderId', 'fullName image email')
          .lean();

        callback({
          success: true,
          messages: messages.reverse(), // Return oldest to newest
          hasMore: skip + limit < totalCount,
          totalCount,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load history';
        callback({ success: false, error: errorMessage });
      }
    },
  );

  /**
   * Event: message:edit
   * Edit a message (owner only)
   */
  socket.on(
    'message:edit',
    async (
      data: { messageId: string; content: string; conversationId: string },
      callback,
    ) => {
      try {
        const messageId = new mongoose.Types.ObjectId(data.messageId);
        const conversationId = new mongoose.Types.ObjectId(data.conversationId);

        const message = await MessageModel.findById(messageId);

        if (!message) {
          return callback({ success: false, error: 'Message not found' });
        }

        // Verify ownership
        if (!message.senderId.equals(new mongoose.Types.ObjectId(userId))) {
          return callback({ success: false, error: 'Not authorized' });
        }

        // Update message
        message.content = data.content;
        await message.save();
        await message.populate('senderId', 'fullName image email');

        const messageData = {
          messageId: message._id.toString(),
          conversationId: conversationId.toString(),
          content: message.content,
          updatedAt: message.updatedAt || new Date(),
        };

        // Broadcast to conversation
        io.to(`conversation:${conversationId}`).emit(
          'message:updated',
          messageData,
        );

        callback({ success: true, message: messageData });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to edit message';
        callback({ success: false, error: errorMessage });
      }
    },
  );

  /**
   * Event: message:delete
   * Delete a message (owner only)
   */
  socket.on(
    'message:delete',
    async (data: { messageId: string; conversationId: string }, callback) => {
      try {
        const messageId = new mongoose.Types.ObjectId(data.messageId);
        const conversationId = new mongoose.Types.ObjectId(data.conversationId);

        const message = await MessageModel.findById(messageId);

        if (!message) {
          return callback({ success: false, error: 'Message not found' });
        }

        // Verify ownership
        if (!message.senderId.equals(new mongoose.Types.ObjectId(userId))) {
          return callback({ success: false, error: 'Not authorized' });
        }

        // Delete message
        await MessageModel.deleteOne({ _id: messageId });

        // Broadcast deletion
        io.to(`conversation:${conversationId}`).emit('message:deleted', {
          messageId: messageId.toString(),
          conversationId: conversationId.toString(),
        });

        callback({ success: true, message: 'Message deleted' });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete message';
        callback({ success: false, error: errorMessage });
      }
    },
  );
};
