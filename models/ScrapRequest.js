import mongoose from "mongoose";

const scrapRequestSchema = new mongoose.Schema(
  {
    userId:
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorId:
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
categoryIds: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ScrapCategory",
    required: true,
  },
],
    pickupAddress:
    {
      type: String,
      required: true,
    },
    location:
    {
      lat:
      {
        type: Number,
      },
      lng:
      {
        type: Number,
      },
    },
    description:
    {
      type: String,
    },
    estimatedWeight:
    {
      type: Number,
    },
    estimatedPrice:
{
  type: Number,
  default: 0,
},
    scrapType: {
  type: String,
  enum: ["household", "shop", "small_industry", "large_industry"],
  required: true,
},
vehicleType: {
  type: String,
  enum: ["2_wheeler", "3_wheeler", "4_wheeler"],
},
    preferredDate:
    {
      type: Date,
    },
    status:
    {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "pickedUp", "completed", "cancelled"],
    },
    images: [
      {
        url:
        {
          type: String,
          required: true,
        },
        publicId:
        {
          type: String,
          required: true,
        },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("ScrapRequest", scrapRequestSchema);
