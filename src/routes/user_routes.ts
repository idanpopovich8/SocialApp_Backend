import express from 'express';
import {
  register,
  login,
  logout,
  refresh,
  googleSignin,
} from '../controllers/user_controller';
import { uploadMiddleware } from '../middleware/upload_middleware';

const router = express.Router();

router.post('/register', uploadMiddleware('users').single('image'), register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/google', googleSignin);

export default router;
