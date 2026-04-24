import express from 'express';
import { authMiddleware } from '../middleware/auth_middleware';
import { postAssist } from '../controllers/ai_controller';

const router = express.Router();

router.post('/post-assist', authMiddleware, postAssist);

export default router;
