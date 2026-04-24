import { Response, NextFunction } from 'express';
import createError from 'http-errors';
import { AuthRequest } from '../middleware/auth_middleware';
import {
  generatePostAssist,
  PostAssistInput,
} from '../services/ai_post_assist_service';

type AssistBody = {
  draft?: string;
  intent?: 'help-request' | 'offer-help' | 'general';
  tone?: 'friendly' | 'formal' | 'short';
};

const MAX_DRAFT_LENGTH = 5000;

export const postAssist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw createError(401, 'Unauthorized');
    }

    const { draft, intent, tone } = req.body as AssistBody;
    if (!draft || typeof draft !== 'string' || draft.trim().length < 10) {
      throw createError(
        400,
        'draft is required and must contain at least 10 characters',
      );
    }
    if (draft.length > MAX_DRAFT_LENGTH) {
      throw createError(
        400,
        `draft must be at most ${MAX_DRAFT_LENGTH} characters`,
      );
    }

    const assistInput: PostAssistInput = {
      userId,
      draft: draft.trim(),
    };
    if (intent) assistInput.intent = intent;
    if (tone) assistInput.tone = tone;

    const aiResult = await generatePostAssist(assistInput);

    res.status(200).json({
      message: 'AI suggestion generated',
      data: aiResult,
    });
  } catch (error) {
    next(error);
  }
};
