import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user_model';
import createError from 'http-errors';
import { AuthRequest } from '../middleware/auth_middleware';

// ------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------
const generateAccessToken = (userId: string) => {
  return jwt.sign({ _id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: '15m',
  });
};

const generateRefreshToken = (userId: string) => {
  return jwt.sign(
    { _id: userId },
    process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string),
    {
      expiresIn: '7d',
    },
  );
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizeImagePath = (image?: string): string => {
  if (!image) return '';
  const publicSegment = '/public/';
  const index = image.indexOf(publicSegment);
  if (index >= 0) {
    return image.slice(index);
  }
  return image;
};

// ------------------------------------------------------------------
// Register
// ------------------------------------------------------------------
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) throw createError(409, 'User already exists');

    let fullImageUrl = '';
    if (req.file) {
      fullImageUrl = `/public/uploads/users/${req.file.filename}`;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      fullName,
      email,
      password: hashedPassword,
      image: fullImageUrl,
    });

    const accessToken = generateAccessToken(newUser._id.toString());
    const refreshToken = generateRefreshToken(newUser._id.toString());

    if (!newUser.refreshTokens) newUser.refreshTokens = [];
    newUser.refreshTokens.push(refreshToken);
    await newUser.save();

    res.status(201).json({
      id: newUser._id,
      fullName: newUser.fullName,
      image: normalizeImagePath(newUser.image),
      email: newUser.email,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Login
// ------------------------------------------------------------------
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) throw createError(400, 'Invalid email or password');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw createError(400, 'Invalid email or password');

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    if (!user.refreshTokens) user.refreshTokens = [];

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({
      id: user._id,
      fullName: user.fullName,
      image: normalizeImagePath(user.image),
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Logout
// ------------------------------------------------------------------
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) throw createError(400, 'Refresh Token is required');

    const user = await UserModel.findOne({ refreshTokens: refreshToken });

    if (user) {
      user.refreshTokens = (user.refreshTokens || []).filter(
        (token) => token !== refreshToken,
      );
      await user.save();
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Refresh (Get new Access Token)
// ------------------------------------------------------------------
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) throw createError(401, 'Refresh Token is required');

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string),
    ) as { _id: string };

    const user = await UserModel.findById(decoded._id);
    if (!user) throw createError(401, 'User not found');

    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      user.refreshTokens = [];
      await user.save();
      throw createError(403, 'Invalid Refresh Token');
    }

    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    user.refreshTokens = (user.refreshTokens || []).filter(
      (t) => t !== refreshToken,
    );
    user.refreshTokens.push(newRefreshToken);

    await user.save();

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const googleSignin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      throw createError(400, 'Missing Google Credential');
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw createError(400, 'Invalid Google Token Payload');
    }

    const email = payload.email;

    let user = await UserModel.findOne({ email });

    if (!user) {
      user = await UserModel.create({
        email: email,
        fullName: payload.name || 'Google User',
        image: payload.picture || '',
        password: 'google-login-no-pass',
      });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      image: normalizeImagePath(user.image),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;
    if (!userId) throw createError(401, 'Unauthorized');

    const user = await UserModel.findById(userId);
    if (!user) throw createError(404, 'User not found');

    res.status(200).json({
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      image: normalizeImagePath(user.image),
      onlineStatus: user.onlineStatus,
      lastSeen: user.lastSeen,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;
    if (!userId) throw createError(401, 'Unauthorized');

    const { fullName } = req.body as { fullName?: string };
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2) {
        throw createError(400, 'fullName must contain at least 2 characters');
      }
    }

    const user = await UserModel.findById(userId);
    if (!user) throw createError(404, 'User not found');

    if (typeof fullName === 'string') {
      user.fullName = fullName.trim();
    }

    if (req.file) {
      user.image = `/public/uploads/users/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      image: normalizeImagePath(user.image),
      onlineStatus: user.onlineStatus,
      lastSeen: user.lastSeen,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
