import express from 'express';
import {
  createConversation,
  getUserConversations,
  getConversation,
  addParticipant,
  leaveConversation,
} from '../controllers/conversation_controller';
import { authMiddleware } from '../middleware/auth_middleware';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', createConversation);

/**
 * GET /api/conversations
 * Get all conversations for authenticated user
 */
router.get('/', getUserConversations);

/**
 * GET /api/conversations/:conversationId
 * Get specific conversation with messages
 */
router.get('/:conversationId', getConversation);

/**
 * PUT /api/conversations/:conversationId/add-participant
 * Add a participant to conversation
 */
router.put('/:conversationId/add-participant', addParticipant);

/**
 * DELETE /api/conversations/:conversationId
 * Leave conversation
 */
router.delete('/:conversationId', leaveConversation);

export default router;
