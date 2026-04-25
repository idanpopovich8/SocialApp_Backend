import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import PostModel from '../models/post_model';
import { IUserDocument } from '../models/user_model';
import { ICommentDocument } from '../models/comment_model';
import { AuthRequest } from '../middleware/auth_middleware';
import createError from 'http-errors';
import '../models/comment_model';

interface SerializedComment {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: {
    id: string;
    fullName: string;
    image: string | undefined;
  };
}

interface PopulatedUserRef {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  image?: string;
}

interface PaginationParams {
  limit: number;
  skip: number;
}

const resolveBaseUrl = (): string => {
  let base = process.env.BASE_URL;
  if (!base) {
    const port = process.env.PORT || 5001;
    base = `http://localhost:${port}/`;
  }
  return base.endsWith('/') ? base : `${base}/`;
};

const isPopulatedUser = (value: unknown): value is PopulatedUserRef => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'fullName' in value
  );
};

const serializeComments = (comments: unknown): SerializedComment[] => {
  if (!Array.isArray(comments)) return [];

  return (comments as ICommentDocument[])
    .filter((comment) => isPopulatedUser(comment.createdBy))
    .map((comment) => {
      const commentCreator = comment.createdBy as unknown as PopulatedUserRef;
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
    });
};

const parsePagination = (
  limitRaw: unknown,
  skipRaw: unknown,
): PaginationParams => {
  const limit = Number(limitRaw ?? 10);
  const skip = Number(skipRaw ?? 0);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createError(400, 'limit must be an integer between 1 and 100');
  }
  if (!Number.isInteger(skip) || skip < 0) {
    throw createError(400, 'skip must be a non-negative integer');
  }

  return { limit, skip };
};

// ------------------------------------------------------------------
// Create a new Post
// ------------------------------------------------------------------
export const createPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { content, removeImage } = req.body as {
      content?: string;
      removeImage?: string | boolean;
    };
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');
    if (!content) throw createError(400, 'Content is required');

    let fullImageUrl = '';
    if (req.file) {
      const base = resolveBaseUrl();
      fullImageUrl = base + 'public/uploads/posts/' + req.file.filename;
    }

    // Create Post
    const newPost = await PostModel.create({
      content,
      image: fullImageUrl,
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
      likesCount: 0,
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
// Get all posts
// ------------------------------------------------------------------
export const getAllPosts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { limit, skip } = parsePagination(req.query.limit, req.query.skip);
    const filter = { isDeleted: { $ne: true } };

    const total = await PostModel.countDocuments(filter);
    const posts = await PostModel.find({ isDeleted: { $ne: true } })
      .populate('createdBy', 'fullName image')
      .populate({
        path: 'comments',
        populate: {
          path: 'createdBy',
          select: 'fullName image',
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const formattedPosts = posts
      .filter((post) => isPopulatedUser(post.createdBy))
      .map((post) => {
        const creator = post.createdBy as unknown as PopulatedUserRef;
        const comments = serializeComments(post.comments);
        return {
          id: post._id.toString(),
          content: post.content,
          image: post.image,
          createdAt: post.createdAt,
          commentsCount: comments.length,
          likesCount: post.likesCount || 0,

          likes: post.likes.map((likeId) => likeId.toString()),
          comments,

          createdBy: {
            id: creator._id.toString(),
            fullName: creator.fullName,
            image: creator.image,
          },
        };
      });

    res.status(200).json({
      items: formattedPosts,
      total,
      hasMore: skip + limit < total,
      limit,
      skip,
    });
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
    const { content, removeImage } = req.body as {
      content?: string;
      removeImage?: string | boolean;
    };
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');

    const post = await PostModel.findById(id);
    if (!post) throw createError(404, 'Post not found');

    if (post.createdBy.toString() !== userId) {
      throw createError(403, 'You are not authorized to edit this post');
    }

    if (content) post.content = content;

    const shouldRemoveImage =
      removeImage === true || removeImage === 'true' || removeImage === '1';

    // Replace image and remove old file
    if (req.file) {
      if (post.image) {
        try {
          const urlParts = post.image.split('public/');

          if (urlParts.length > 1) {
            const relativePath = 'public/' + urlParts[1];
            const absolutePath = path.join(__dirname, '../../', relativePath);

            if (fs.existsSync(absolutePath)) {
              fs.unlinkSync(absolutePath);
              console.log(`Deleted old image: ${absolutePath}`);
            }
          }
        } catch (err) {
          console.error('Failed to delete old image:', err);
        }
      }

      const base = resolveBaseUrl();
      post.image = base + 'public/uploads/posts/' + req.file.filename;
    } else if (shouldRemoveImage && post.image) {
      try {
        const urlParts = post.image.split('public/');
        if (urlParts.length > 1) {
          const relativePath = 'public/' + urlParts[1];
          const absolutePath = path.join(__dirname, '../../', relativePath);
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`Deleted image: ${absolutePath}`);
          }
        }
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
      post.image = '';
    }

    await post.save();

    await post.populate('createdBy', 'fullName image email');
    await post.populate({
      path: 'comments',
      populate: { path: 'createdBy', select: 'fullName image' },
    });

    const creator = post.createdBy as unknown as PopulatedUserRef;
    const comments = serializeComments(post.comments);

    res.status(200).json({
      id: post._id.toString(),
      content: post.content,
      image: post.image,
      likesCount: post.likesCount || 0,
      likes: post.likes,
      comments,
      commentsCount: comments.length,
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
// Delete post
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
    const { limit, skip } = parsePagination(req.query.limit, req.query.skip);

    if (!userId || typeof userId !== 'string') {
      throw createError(400, 'User ID is required');
    }

    const filter = {
      createdBy: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true },
    };

    const total = await PostModel.countDocuments(filter);
    const posts = await PostModel.find(filter)
      .populate('createdBy', 'fullName image')
      .populate({
        path: 'comments',
        populate: {
          path: 'createdBy',
          select: 'fullName image',
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const formattedPosts = posts
      .filter((post) => isPopulatedUser(post.createdBy))
      .map((post) => {
        const creator = post.createdBy as unknown as PopulatedUserRef;
        const comments = serializeComments(post.comments);
        return {
          id: post._id.toString(),
          content: post.content,
          image: post.image,
          createdAt: post.createdAt,
          commentsCount: comments.length,
          likesCount: post.likesCount || 0,
          likes: post.likes.map((likeId) => likeId.toString()),
          comments,
          createdBy: {
            id: creator._id.toString(),
            fullName: creator.fullName,
            image: creator.image,
          },
        };
      });

    res.status(200).json({
      items: formattedPosts,
      total,
      hasMore: skip + limit < total,
      limit,
      skip,
    });
  } catch (error) {
    next(error);
  }
};

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

    if (!isPopulatedUser(post.createdBy)) {
      throw createError(500, 'Post creator data is corrupted');
    }
    const creator = post.createdBy as unknown as PopulatedUserRef;
    const comments = serializeComments(post.comments);

    const formattedPost = {
      id: post._id.toString(),
      content: post.content,
      image: post.image,
      createdAt: post.createdAt,
      commentsCount: comments.length,
      likesCount: post.likesCount || 0,

      likes: post.likes.map((likeId) => likeId.toString()),
      comments,

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

// Toggle Like on a Post
// ------------------------------------------------------------------
export const toggleLike = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');
    if (!id || typeof id !== 'string') {
      throw createError(400, 'Post ID is required and must be a string');
    }

    const post = await PostModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!post) throw createError(404, 'Post not found');

    const userAlreadyLiked = post.likes.some(
      (likeId) => likeId.toString() === userId.toString(),
    );

    if (userAlreadyLiked) {
      post.likes = post.likes.filter(
        (likeId) => likeId.toString() !== userId.toString(),
      );
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    } else {
      post.likes.push(new mongoose.Types.ObjectId(userId));
      post.likesCount = (post.likesCount || 0) + 1;
    }

    await post.save();

    res.status(200).json({
      message: userAlreadyLiked ? 'Like removed' : 'Post liked',
      liked: !userAlreadyLiked,
      likesCount: post.likesCount,
    });
  } catch (error) {
    next(error);
  }
};
