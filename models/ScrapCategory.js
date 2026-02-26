import mongoose from "mongoose";

const scrapCategorySchema = new mongoose.Schema(
  {
    name:
    {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description:
    {
      type: String,
    },
    iconUrl:
    {
      type: String,
    },
    isActive:
    {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ScrapCategory", scrapCategorySchema);
