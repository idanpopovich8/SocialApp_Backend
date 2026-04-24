/**
 * Socket.io room naming utilities
 * Provides consistent room naming conventions for the application
 */

/**
 * Get user-specific room name
 * Used for direct notifications to a user
 * @param userId - The user ID
 * @returns Room name: "user:${userId}"
 */
export const getUserRoom = (userId: string): string => {
  return `user:${userId}`;
};

/**
 * Get conversation room name
 * Used for broadcasting messages to all participants in a conversation
 * @param conversationId - The conversation ID
 * @returns Room name: "conversation:${conversationId}"
 */
export const getConversationRoom = (conversationId: string): string => {
  return `conversation:${conversationId}`;
};

/**
 * Get typing indicator room name
 * Used for showing typing status in a conversation
 * @param conversationId - The conversation ID
 * @returns Room name: "typing:${conversationId}"
 */
export const getTypingRoom = (conversationId: string): string => {
  return `typing:${conversationId}`;
};

/**
 * Get notifications room name
 * Used for broadcast notifications to all connected users
 * @returns Room name: "notifications"
 */
export const getNotificationsRoom = (): string => {
  return 'notifications';
};

/**
 * All room type constants
 */
export const ROOM_TYPES = {
  USER: 'user',
  CONVERSATION: 'conversation',
  TYPING: 'typing',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Extract user ID from user room name
 * @param roomName - The room name (e.g., "user:123")
 * @returns The user ID
 */
export const extractUserIdFromRoom = (roomName: string): string => {
  const [, userId] = roomName.split(':');
  return userId?.toString() || '';
};

/**
 * Extract conversation ID from conversation room name
 * @param roomName - The room name (e.g., "conversation:456")
 * @returns The conversation ID
 */
export const extractConversationIdFromRoom = (roomName: string): string => {
  const [, conversationId] = roomName.split(':');
  return conversationId?.toString() || '';
};
