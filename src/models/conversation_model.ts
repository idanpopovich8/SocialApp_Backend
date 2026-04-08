import mongoose, { Schema, Document } from 'mongoose';
import { IConversation } from '../types';

export interface IConversationDocument extends IConversation, Document {
  _id: mongoose.Types.ObjectId;
}

const conversationSchema = new Schema<IConversationDocument>(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// 🟢 Index for finding user's conversations efficiently
conversationSchema.index({ participants: 1, updatedAt: -1 });

const ConversationModel = mongoose.model<IConversationDocument>(
  'Conversation',
  conversationSchema,
);

export default ConversationModel;
