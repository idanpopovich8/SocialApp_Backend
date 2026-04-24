import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import CommentModel from '../models/comment_model';
import PostModel from '../models/post_model';
import { IUserDocument } from '../models/user_model';
import { AuthRequest } from '../middleware/auth_middleware';
import createError from 'http-errors';

// ------------------------------------------------------------------
// Create a Comment
// ------------------------------------------------------------------
export const createComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');
    if (!content) throw createError(400, 'Content is required');

    if (!postId || typeof postId !== 'string') {
      throw createError(400, 'Valid Post ID is required');
    }

    const post = await PostModel.findOne({
      _id: postId,
      isDeleted: { $ne: true },
    });
    if (!post) throw createError(404, 'Post not found');

    const newComment = await CommentModel.create({
      postId: new mongoose.Types.ObjectId(postId),
      content,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await newComment.populate('createdBy', 'fullName image');
    const creator = newComment.createdBy as unknown as IUserDocument;

    res.status(201).json({
      id: newComment._id.toString(),
      content: newComment.content,
      createdAt: newComment.createdAt,
      createdBy: {
        id: creator._id.toString(),
        fullName: creator.fullName,
        image: creator.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Update a Comment
// ------------------------------------------------------------------
export const updateComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');
    if (!content) throw createError(400, 'Content is required');

    const comment = await CommentModel.findById(id);
    if (!comment) throw createError(404, 'Comment not found');

    if (comment.createdBy.toString() !== userId) {
      throw createError(403, 'You are not authorized to edit this comment');
    }

    comment.content = content;
    await comment.save();

    await comment.populate('createdBy', 'fullName image');
    const creator = comment.createdBy as unknown as IUserDocument;

    res.status(200).json({
      id: comment._id.toString(),
      content: comment.content,
      createdAt: comment.createdAt,
      createdBy: {
        id: creator._id.toString(),
        fullName: creator.fullName,
        image: creator.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Delete a Comment
// ------------------------------------------------------------------
export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');

    const comment = await CommentModel.findById(id);
    if (!comment) throw createError(404, 'Comment not found');

    if (comment.createdBy.toString() !== userId) {
      throw createError(403, 'You are not authorized to delete this comment');
    }

    await CommentModel.findByIdAndDelete(id);

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
