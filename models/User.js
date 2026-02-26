import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
      trim: true,
    },
    address:
    {
      type: String,
    },
    role:
    {
      type: String,
      default: "user",
      enum: ["user"],
    },
    status:
    {
      type: String,
      default: "active",
      enum: ["active", "blocked"],
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

export default mongoose.model("User", userSchema);
