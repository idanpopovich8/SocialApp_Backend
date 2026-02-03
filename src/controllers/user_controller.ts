import { Request, Response, NextFunction } from 'express'; // <--- Added NextFunction
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user_model';
import createError from 'http-errors'; // <--- Using the library

// Helper function (same as before)
const generateToken = (userId: string) => {
  return jwt.sign(
    { _id: userId },
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '10h',
    } as jwt.SignOptions,
  );
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fullName, email, password, image } = req.body;

    // 1. Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      // 🟢 NEW: Throw error instead of sending response manually
      throw createError(409, 'User already exists');
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create the new user
    const newUser = await UserModel.create({
      fullName,
      email,
      password: hashedPassword,
      image,
    });

    // 4. Send response
    res.status(201).json({
      id: newUser._id,
      fullName: newUser.fullName,
      image: newUser.image,
      email: newUser.email,
      token: generateToken(newUser._id.toString()),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) {
      throw createError(400, 'Invalid email or password');
    }

    // 2. Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createError(400, 'Invalid email or password');
    }

    res.status(200).json({
      id: user._id,
      fullName: user.fullName,
      image: user.image,
      email: user.email,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    next(error);
  }
};
