import mongoose, { Document, Schema } from 'mongoose';

export interface ProductDocument extends Document {
  _id: Schema.Types.ObjectId;
  title: string;
  likes: number;
  image?: string;
  adminId?: string;
  // createdAt: Date | string;
  // updatedAt: Date | string;
}
const ProductSchema = new Schema<ProductDocument>(
  {
    title: { type: Schema.Types.String, required: true },
    image: { type: Schema.Types.String, required: false },
    likes: { type: Schema.Types.Number, default: 0 },
    adminId: { type: Schema.Types.String, required: false },
  },
  { _id: true, versionKey: false, timestamps: true }
);

export const Product = mongoose.model<ProductDocument>('Product', ProductSchema);
