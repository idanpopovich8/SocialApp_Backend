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
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
});

export default mongoose.model<IPostDocument>('Post', postSchema);
