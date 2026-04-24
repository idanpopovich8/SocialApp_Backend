import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types'; // <--- Import the central type

// 1. Extend the IUser interface with Mongoose's Document
// This gives you the data fields (fullName, email...) PLUS database methods (.save, .remove...)
export interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the Schema
const userSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Security: Don't return password by default
    },
    image: {
      type: String,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
    onlineStatus: {
      type: String,
      enum: ['online', 'away', 'offline'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
    },
  },
  { timestamps: true },
);

// 3. Export the Model
const UserModel = mongoose.model<IUserDocument>('User', userSchema);
export default UserModel;
