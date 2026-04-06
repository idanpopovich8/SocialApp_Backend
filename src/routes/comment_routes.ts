import express from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/comment_controller';
import { authMiddleware } from '../middleware/auth_middleware';

const router = express.Router();

// ------------------------------------------------------------------
// Comment Routes
// ------------------------------------------------------------------

router.post('/:postId', authMiddleware, createComment);
router.put('/:id', authMiddleware, updateComment);
router.delete('/:id', authMiddleware, deleteComment);

export default router;
