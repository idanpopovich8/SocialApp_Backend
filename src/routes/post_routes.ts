import express from 'express';
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getPostsByUserId,
} from '../controllers/post_controller';
import { authMiddleware } from '../middleware/auth_middleware';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/user/:userId', getPostsByUserId);
router.get('/:id', getPostById);
router.post('/', authMiddleware, createPost);
router.put('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);

export default router;
