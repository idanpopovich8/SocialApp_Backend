import mongoose, { Schema, Document } from 'mongoose';
import { IPost } from '../types';

export interface IPostDocument extends IPost, Document {
  _id: mongoose.Types.ObjectId;
}

const postSchema = new Schema<IPostDocument>(
  {
    content: { type: String, required: true },
    image: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Likes stay embedded
    isDeleted: { type: Boolean, default: false }, // Soft Delete flag
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// 🟢 VIRTUAL FIELD definition
// This tells Mongoose: "When I ask for 'comments', go look in the Comment collection"
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
});

export default mongoose.model<IPostDocument>('Post', postSchema);
