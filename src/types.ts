import { Types } from 'mongoose';

// 1. User Interface
export interface IUser {
  _id?: Types.ObjectId;
  fullName: string;
  email: string;
  password: string;
  image?: string;
  refreshTokens?: string[];
}

// 2. Like Interface
export interface ILike {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  postId: Types.ObjectId;
}

// 3. Comment Interface
export interface IComment {
  _id?: Types.ObjectId;
  postId: Types.ObjectId;
  content: string;
  createdAt: Date;
  createdBy: Types.ObjectId; // Points to a User
}

// 4. Post Interface
export interface IPost {
  _id?: Types.ObjectId;
  content: string;
  image?: string;
  likes: ILike[];
  likesCount?: number; // 🟢 NEW: Track number of likes

  // 🟢 NOTE: In the DB, this doesn't exist.
  // But after "Virtual Populate", Mongoose fills this array for us.
  comments: IComment[];

  commentsCount?: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  isDeleted?: boolean; // 🟢 NEW: For Soft Delete
}
export interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: IUser[];
  messages: Message[];
  updatedAt: string;
  createdAt: string;
}
