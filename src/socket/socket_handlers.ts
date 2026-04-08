import { Socket, Server as SocketIOServer } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/socket_auth_middleware';
import { setupConversationHandlers } from './conversation_handlers';
import { setupMessageHandlers } from './message_handlers';

/**
 * Main Socket.io event handler setup
 * Organizes all event listeners by feature domain
 */
export const setupSocketHandlers = (io: SocketIOServer) => {
  // Apply JWT authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    console.log(`✓ User ${userId} connected. Socket ID: ${socket.id}`);

    // Join user-specific room for direct notifications
    socket.join(`user:${userId}`);

    // Setup feature-specific event handlers
    setupConversationHandlers(socket, io);
    setupMessageHandlers(socket, io);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`✗ User ${userId} disconnected. Socket ID: ${socket.id}`);
      socket.leave(`user:${userId}`);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error(`Socket error from user ${userId}:`, error);
    });
  });
};
