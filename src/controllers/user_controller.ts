import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user_model';
import createError from 'http-errors';

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

// ------------------------------------------------------------------
// Register
// ------------------------------------------------------------------
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fullName, email, password, image } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) throw createError(409, 'User already exists');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      fullName,
      email,
      password: hashedPassword,
      image,
    });

    // Generate Tokens
    const accessToken = generateAccessToken(newUser._id.toString());
    const refreshToken = generateRefreshToken(newUser._id.toString());

    if (!newUser.refreshTokens) newUser.refreshTokens = [];
    newUser.refreshTokens.push(refreshToken);
    await newUser.save();

    res.status(201).json({
      id: newUser._id,
      fullName: newUser.fullName,
      image: newUser.image,
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

    // Generate Tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Check if refreshTokens array exists, if not init it (for old users)
    if (!user.refreshTokens) user.refreshTokens = [];

    // Save Refresh Token to DB
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({
      id: user._id,
      fullName: user.fullName,
      image: user.image,
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
      // 🟢 FIX: Handle potential undefined array safely
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

    // 1. Verify the token signature
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string),
    ) as { _id: string };

    // 2. Check if token exists in DB
    const user = await UserModel.findById(decoded._id);
    if (!user) throw createError(401, 'User not found');

    // 🟢 FIX: Check if array exists AND contains the token
    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      user.refreshTokens = []; // Security: Nuke all tokens
      await user.save();
      throw createError(403, 'Invalid Refresh Token');
    }

    // 3. Issue new Access Token
    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    // Rotate tokens: Remove old one, add new one
    // 🟢 FIX: Handle potential undefined array safely
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
