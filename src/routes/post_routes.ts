import express from 'express';
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getPostsByUserId,
  toggleLike,
} from '../controllers/post_controller';
import { authMiddleware } from '../middleware/auth_middleware';
import { uploadMiddleware } from '../middleware/upload_middleware';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/user/:userId', getPostsByUserId);
router.get('/:id', getPostById);

// 🟢 Add uploadMiddleware('posts').single('file') BEFORE the controller
router.post(
  '/',
  authMiddleware,
  uploadMiddleware('posts').single('image'),
  createPost,
);
router.put(
  '/:id',
  authMiddleware,
  uploadMiddleware('posts').single('image'),
  updatePost,
);

router.delete('/:id', authMiddleware, deletePost);
router.post('/:id/like', authMiddleware, toggleLike);

export default router;
