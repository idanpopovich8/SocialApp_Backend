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
  likes: Types.ObjectId[];
  likesCount?: number;
  comments: IComment[];

  commentsCount?: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}
// 5. Message Interface (for real-time messaging)
export interface IMessage {
  _id?: Types.ObjectId;
  conversationId: Types.ObjectId; // Reference to Conversation
  senderId: Types.ObjectId; // Reference to User
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

// 6. Conversation Interface (for group messaging)
export interface IConversation {
  _id?: Types.ObjectId;
  participants: Types.ObjectId[]; // Array of User IDs
  lastMessage?: Types.ObjectId; // Reference to last Message
  lastMessageAt?: Date; // Timestamp for sorting
  createdAt: Date;
  updatedAt?: Date;
}
