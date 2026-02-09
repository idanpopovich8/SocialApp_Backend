import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import PostModel from '../models/post_model';
import { IUserDocument } from '../models/user_model';
import { ICommentDocument } from '../models/comment_model';
import { ILike } from '../types';
import { AuthRequest } from '../middleware/auth_middleware';
import createError from 'http-errors';
import '../models/comment_model';

// ------------------------------------------------------------------
// Create a new Post
// ------------------------------------------------------------------
export const createPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { content, image } = req.body;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');
    if (!content) throw createError(400, 'Content is required');

    // Create Post (Without comments array)
    const newPost = await PostModel.create({
      content,
      image,
      createdBy: new mongoose.Types.ObjectId(userId),
      likes: [],
    });

    await newPost.populate('createdBy', 'fullName image email');
    const creator = newPost.createdBy as unknown as IUserDocument;

    res.status(201).json({
      id: newPost._id.toString(),
      content: newPost.content,
      image: newPost.image,
      likes: [],
      comments: [],
      commentsCount: 0,
      createdBy: {
        id: creator._id.toString(),
        fullName: creator.fullName,
        image: creator.image,
      },
      createdAt: newPost.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Get All Posts
// ------------------------------------------------------------------
export const getAllPosts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const posts = await PostModel.find({ isDeleted: { $ne: true } })
      .populate('createdBy', 'fullName image')
      .populate({
        path: 'comments',
        populate: {
          path: 'createdBy',
          select: 'fullName image',
        },
      })
      .sort({ createdAt: -1 });

    const formattedPosts = posts.map((post) => {
      const creator = post.createdBy as unknown as IUserDocument;

      return {
        id: post._id.toString(),
        content: post.content,
        image: post.image,
        createdAt: post.createdAt,
        commentsCount: post.comments ? post.comments.length : 0,

        likes: post.likes.map((like: ILike) => ({
          id: like._id ? like._id.toString() : '',
          userId: like.userId.toString(),
        })),

        comments: post.comments
          ? (post.comments as unknown as ICommentDocument[]).map((comment) => {
              const commentCreator =
                comment.createdBy as unknown as IUserDocument;
              return {
                id: comment._id.toString(),
                content: comment.content,
                createdAt: comment.createdAt,
                createdBy: {
                  id: commentCreator._id.toString(),
                  fullName: commentCreator.fullName,
                  image: commentCreator.image,
                },
              };
            })
          : [],

        createdBy: {
          id: creator._id.toString(),
          fullName: creator.fullName,
          image: creator.image,
        },
      };
    });

    res.status(200).json(formattedPosts);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Update Post
// ------------------------------------------------------------------
export const updatePost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { content, image } = req.body;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');

    const post = await PostModel.findById(id);
    if (!post) throw createError(404, 'Post not found');

    if (post.createdBy.toString() !== userId) {
      throw createError(403, 'You are not authorized to edit this post');
    }

    if (content) post.content = content;
    if (image !== undefined) post.image = image;

    await post.save();

    await post.populate('createdBy', 'fullName image email');
    await post.populate({
      path: 'comments',
      populate: { path: 'createdBy', select: 'fullName image' },
    });

    const creator = post.createdBy as unknown as IUserDocument;

    res.status(200).json({
      id: post._id.toString(),
      content: post.content,
      image: post.image,
      likes: post.likes,
      // 🟢 FIX: Same fix here
      comments: post.comments
        ? (post.comments as unknown as ICommentDocument[]).map((comment) => {
            const commentCreator =
              comment.createdBy as unknown as IUserDocument;
            return {
              id: comment._id.toString(),
              content: comment.content,
              createdAt: comment.createdAt,
              createdBy: {
                id: commentCreator._id.toString(),
                fullName: commentCreator.fullName,
                image: commentCreator.image,
              },
            };
          })
        : [],
      commentsCount: post.comments ? post.comments.length : 0,
      createdBy: {
        id: creator._id.toString(),
        fullName: creator.fullName,
        image: creator.image,
      },
      createdAt: post.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Delete Post
// ------------------------------------------------------------------
export const deletePost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');

    const post = await PostModel.findById(id);
    if (!post) throw createError(404, 'Post not found');

    if (post.createdBy.toString() !== userId) {
      throw createError(403, 'You are not authorized to delete this post');
    }

    // Soft Delete
    post.isDeleted = true;
    await post.save();

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getPostsByUserId = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.params;

    // 1. Validation: Ensure userId exists
    if (!userId || typeof userId !== 'string') {
      throw createError(400, 'User ID is required');
    }

    // 2. Query: Convert string to ObjectId explicitly
    const posts = await PostModel.find({
      createdBy: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true },
    })
      .populate('createdBy', 'fullName image')
      .populate({
        path: 'comments',
        populate: {
          path: 'createdBy',
          select: 'fullName image',
        },
      })
      .sort({ createdAt: -1 });

    // The rest of your mapping code is fine...
    const formattedPosts = posts.map((post) => {
      // ... same mapping logic as before ...
      const creator = post.createdBy as unknown as IUserDocument;
      return {
        id: post._id.toString(),
        content: post.content,
        image: post.image,
        createdAt: post.createdAt,
        commentsCount: post.comments ? post.comments.length : 0,
        likes: post.likes.map((like: ILike) => ({
          id: like._id ? like._id.toString() : '',
          userId: like.userId.toString(),
        })),
        comments: post.comments
          ? (post.comments as unknown as ICommentDocument[]).map((comment) => {
              const commentCreator =
                comment.createdBy as unknown as IUserDocument;
              return {
                id: comment._id.toString(),
                content: comment.content,
                createdAt: comment.createdAt,
                createdBy: {
                  id: commentCreator._id.toString(),
                  fullName: commentCreator.fullName,
                  image: commentCreator.image,
                },
              };
            })
          : [],
        createdBy: {
          id: creator._id.toString(),
          fullName: creator.fullName,
          image: creator.image,
        },
      };
    });

    res.status(200).json(formattedPosts);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Get Single Post by ID
// ------------------------------------------------------------------
export const getPostById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw createError(400, 'Post ID is required and must be a string');
    }
    const post = await PostModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: { $ne: true },
    })
      .populate('createdBy', 'fullName image')
      .populate({
        path: 'comments',
        populate: {
          path: 'createdBy',
          select: 'fullName image',
        },
      });

    if (!post) {
      throw createError(404, 'Post not found');
    }

    // Format the single post to match your API structure
    const creator = post.createdBy as unknown as IUserDocument;

    const formattedPost = {
      id: post._id.toString(),
      content: post.content,
      image: post.image,
      createdAt: post.createdAt,
      commentsCount: post.comments ? post.comments.length : 0,

      likes: post.likes.map((like: ILike) => ({
        id: like._id ? like._id.toString() : '',
        userId: like.userId.toString(),
      })),

      comments: post.comments
        ? (post.comments as unknown as ICommentDocument[]).map((comment) => {
            const commentCreator =
              comment.createdBy as unknown as IUserDocument;
            return {
              id: comment._id.toString(),
              content: comment.content,
              createdAt: comment.createdAt,
              createdBy: {
                id: commentCreator._id.toString(),
                fullName: commentCreator.fullName,
                image: commentCreator.image,
              },
            };
          })
        : [],

      createdBy: {
        id: creator._id.toString(),
        fullName: creator.fullName,
        image: creator.image,
      },
    };

    res.status(200).json(formattedPost);
  } catch (error) {
    next(error);
  }
};
