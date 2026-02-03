import mongoose, { Document, Schema } from 'mongoose';

// 1. Define the Interface
// This extends your frontend "User" idea but adds Auth fields
export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  image?: string;
  _id: mongoose.Types.ObjectId;
}

// 2. Define the Schema
const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // No two users can have the same email
    },
    password: {
      type: String,
      required: true,
      select: false, // Security: Don't return password by default in queries
    },
    image: {
      type: String, // URL to the image
    },
  },
  { timestamps: true }, // Adds createdAt and updatedAt automatically
);

// 3. Export the Model
const UserModel = mongoose.model<IUser>('User', userSchema);
export default UserModel;
