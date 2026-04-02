import mongoose from "mongoose";

const scrapPriceSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScrapCategory",
      required: true,
      unique: true, // one price per category
    },

    pricePerKg: {
      type: Number,
      required: true,
    },

    unit: {
      type: String,
      default: "kg",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ScrapPrice ||
  mongoose.model("ScrapPrice", scrapPriceSchema);