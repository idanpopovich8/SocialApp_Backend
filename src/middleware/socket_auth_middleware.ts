import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

/**
 * Socket.io middleware for JWT authentication
 * Extracts and verifies JWT token from socket handshake
 * Attaches decoded user ID to socket.data
 *
 * Token can be passed via:
 * - socket.handshake.auth.token (recommended)
 * - socket.handshake.query.token
 */
export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    // Extract token from auth or query parameters
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token as string,
      process.env.JWT_SECRET as string,
    ) as {
      _id: string;
    };

    // Attach user ID to socket data for use in event handlers
    socket.data.userId = decoded._id;

    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Authentication failed';
    next(new Error(`Authentication: ${errorMessage}`));
  }
};
