import { Socket, Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import UserModel from '../models/user_model';

export const setupPresenceHandlers = (socket: Socket, io: SocketIOServer) => {
  const userId = socket.data.userId;

  /**
   * Event: user:online
   * User comes online - update status in database
   */
  socket.on('user:online', async () => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Update user status
      await UserModel.updateOne(
        { _id: userObjectId },
        {
          onlineStatus: 'online',
          lastSeen: new Date(),
        },
      );

      // Broadcast to all connected clients
      io.emit('user:statusChanged', {
        userId,
        status: 'online',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  });

  /**
   * Event: user:away
   * User status changed to away
   */
  socket.on('user:away', async () => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      await UserModel.updateOne(
        { _id: userObjectId },
        {
          onlineStatus: 'away',
          lastSeen: new Date(),
        },
      );

      io.emit('user:statusChanged', {
        userId,
        status: 'away',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error setting user away:', error);
    }
  });

  /**
   * Event: On disconnect
   * User goes offline - update status (handled in main socket_handlers.ts)
   */

  /**
   * Event: user:typing
   * User is typing in a conversation - show to others
   */
  socket.on(
    'user:typing',
    (data: { conversationId: string; isTyping: boolean }) => {
      try {
        socket.broadcast
          .to(`conversation:${data.conversationId}`)
          .emit('user:typing', {
            userId,
            conversationId: data.conversationId,
            isTyping: data.isTyping,
          });
      } catch (error) {
        console.error('Error broadcasting typing:', error);
      }
    },
  );

  // On disconnect, update user as offline
  socket.on('disconnect', async () => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      await UserModel.updateOne(
        { _id: userObjectId },
        {
          onlineStatus: 'offline',
          lastSeen: new Date(),
        },
      );

      // Broadcast to all clients
      io.emit('user:statusChanged', {
        userId,
        status: 'offline',
        lastSeen: new Date(),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  });
};
