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
    paymentId: {
      type: String,
    },
    paymentOrderId: {
      type: String,
    },
    paymentStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "paid", "failed", "refunded"],
    },
    currentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },
    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorSubscription",
      default: null,
    },
    subscriptionStatus: {
      type: String,
      default: "inactive",
      enum: ["inactive", "active", "expired", "cancelled"],
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Vendor || mongoose.model("Vendor", vendorSchema);
