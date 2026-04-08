import express from 'express';
import {
  getConversationMessages,
  getMessage,
  editMessage,
  deleteMessage,
} from '../controllers/message_controller';
import { authMiddleware } from '../middleware/auth_middleware';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/messages/conversations/:conversationId
 * Get message history for a conversation (paginated)
 */
router.get('/conversations/:conversationId', getConversationMessages);

/**
 * GET /api/messages/:messageId
 * Get single message
 */
router.get('/:messageId', getMessage);

/**
 * PUT /api/messages/:messageId
 * Edit message (owner only)
 */
router.put('/:messageId', editMessage);

/**
 * DELETE /api/messages/:messageId
 * Delete message (owner only)
 */
router.delete('/:messageId', deleteMessage);

export default router;
