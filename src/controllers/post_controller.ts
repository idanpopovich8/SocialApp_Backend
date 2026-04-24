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

// ------------------------------------------------------------------
// Create a new Post
// ------------------------------------------------------------------
export const createPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 🟢 1. Image is NOT in req.body anymore
    const { content } = req.body;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');
    if (!content) throw createError(400, 'Content is required');

    // 🟢 2. Handle Image Upload Logic
    let fullImageUrl = '';
    if (req.file) {
      // Dynamic Base URL Logic
      let base = process.env.BASE_URL;
      if (!base) {
        const port = process.env.PORT || 5001;
        base = `http://localhost:${port}/`;
      }

      fullImageUrl = base + 'public/uploads/posts/' + req.file.filename;
    }

    // Create Post
    const newPost = await PostModel.create({
      content,
      image: fullImageUrl, // 🟢 3. Save the generated URL
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
      likesCount: 0, // 🟢 NEW: Initialize likes count
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
// Get All Posts (No changes needed here)
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
          likesCount: post.likesCount || 0, // 🟢 NEW: Include likes count

          likes: post.likes.map((likeId) => likeId.toString()),
          comments,

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
    const { content } = req.body;
    const userId = req.user?._id;

    if (!userId) throw createError(401, 'User not authenticated');

    const post = await PostModel.findById(id);
    if (!post) throw createError(404, 'Post not found');

    if (post.createdBy.toString() !== userId) {
      throw createError(403, 'You are not authorized to edit this post');
    }

    if (content) post.content = content;

    // 🟢 HANDLE IMAGE UPDATE & DELETE OLD FILE
    if (req.file) {
      // 1. Check if there is an old image to delete
      if (post.image) {
        try {
          // The DB URL looks like: "http://localhost:5001/public/uploads/posts/file-123.jpg"
          // We need to extract just: "public/uploads/posts/file-123.jpg"

          const urlParts = post.image.split('public/'); // Split at the folder name

          if (urlParts.length > 1) {
            const relativePath = 'public/' + urlParts[1]; // Rebuild the relative path

            // Construct the absolute path on your computer
            // __dirname is inside 'src/controllers', so we go up two levels to root
            const absolutePath = path.join(__dirname, '../../', relativePath);

            // Check if file exists and delete it
            if (fs.existsSync(absolutePath)) {
              fs.unlinkSync(absolutePath); // 🗑️ DELETE THE FILE
              console.log(`Deleted old image: ${absolutePath}`);
            }
          }
        } catch (err) {
          console.error('Failed to delete old image:', err);
          // We allow the process to continue even if deletion fails
        }
      }

      // 2. Save the NEW image URL
      let base = process.env.BASE_URL;
      if (!base) {
        const port = process.env.PORT || 5001;
        base = `http://localhost:${port}/`;
      }
      post.image = base + 'public/uploads/posts/' + req.file.filename;
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
      likesCount: post.likesCount || 0, // 🟢 NEW: Include likes count
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
// Delete Post (No changes)
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

// ... (Rest of the file: getPostsByUserId, getPostById can stay exactly as they were)
export const getPostsByUserId = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      throw createError(400, 'User ID is required');
    }

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
          likesCount: post.likesCount || 0, // 🟢 NEW: Include likes count
          likes: post.likes.map((likeId) => likeId.toString()),
          comments,
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
      likesCount: post.likesCount || 0, // 🟢 NEW: Include likes count

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

    // 🟢 FIX 1: Check the array of ObjectIds directly
    const userAlreadyLiked = post.likes.some(
      (likeId) => likeId.toString() === userId.toString(),
    );

    if (userAlreadyLiked) {
      // 🟢 FIX 2: Filter out the specific ObjectId
      post.likes = post.likes.filter(
        (likeId) => likeId.toString() !== userId.toString(),
      );
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1); // 🟢 NEW: Decrement count
    } else {
      // 🟢 FIX 3: Push ONLY the ObjectId, not an object
      post.likes.push(new mongoose.Types.ObjectId(userId));
      post.likesCount = (post.likesCount || 0) + 1; // 🟢 NEW: Increment count
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
