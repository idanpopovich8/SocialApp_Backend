import express from 'express';
import {
  register,
  login,
  logout,
  refresh,
  googleSignin,
  getProfile,
  updateProfile,
} from '../controllers/user_controller';
import { uploadMiddleware } from '../middleware/upload_middleware';
import { authMiddleware } from '../middleware/auth_middleware';

const router = express.Router();

router.post('/register', uploadMiddleware('users').single('image'), register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/google', googleSignin);
router.get('/me', authMiddleware, getProfile);
router.put(
  '/me',
  authMiddleware,
  uploadMiddleware('users').single('image'),
  updateProfile,
);

export default router;
