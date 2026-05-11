import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId:
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    recipientModel:
    {
      type: String,
      required: true,
      enum: ["User", "Vendor"],
    },
    message:
    {
      type: String,
      required: true,
    },
    type:
    {
      type: String,
        enum: [ "request_created", "request_accepted", "status_update", "vendor_application_submitted", "vendor_approved", "vendor_rejected", "payment_success", "broadcast", ],
    },
    requestId:
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScrapRequest",
      default: null,
    },
    isRead:
    {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
