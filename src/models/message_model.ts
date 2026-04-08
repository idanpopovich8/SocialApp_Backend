import mongoose, { Schema, Document } from 'mongoose';
import { IMessage } from '../types';

export interface IMessageDocument extends IMessage, Document {
  _id: mongoose.Types.ObjectId;
}

const messageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true, // 🟢 Index for fast queries by conversation
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

// 🟢 Compound index for efficient message history queries
messageSchema.index({ conversationId: 1, createdAt: -1 });

const MessageModel = mongoose.model<IMessageDocument>(
  'Message',
  messageSchema,
);

export default MessageModel;
