import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    name:
    {
      type: String,
      required: true,
      trim: true,
    },
    email:
    {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password:
    {
      type: String,
      required: true,
    },
    phone:
    {
      type: String,
      required: true,
      trim: true,
    },
    address:
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
    role:
    {
      type: String,
      default: "vendor",
      enum: ["vendor"],
    },
    approvalStatus:
    {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
    },
    status:
    {
      type: String,
      default: "active",
      enum: ["active", "blocked"],
    },
    idProofUrl:
    {
      type: String,
    },
    idProofPublicId:
    {
      type: String,
    },
    resetPasswordToken:
    {
      type: String,
    },
    resetPasswordExpiry:
    {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Vendor", vendorSchema);
