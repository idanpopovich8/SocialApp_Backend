import express from 'express';
import {
  register,
  login,
  logout,
  refresh,
  googleSignin,
} from '../controllers/user_controller';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/google', googleSignin);

export default router;
