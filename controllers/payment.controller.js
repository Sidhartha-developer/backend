import crypto from "crypto";
import Plan from "../models/Plan.js";
import VendorSubscription from "../models/VendorSubscription.js";
import razorpay from "../config/razorpay.js";
import { success, error } from "../utils/response.utils.js";

export const getPlans = async (_req, res) => {
  try {
    const plans = await Plan.find({ isActive: { $ne: false } }).sort({ price: 1, createdAt: 1 });
    return success(res, { plans });
  } catch (err) {
    return error(res, err.message);
  }
};

export const createOrder = async (req, res) => {
  try {
    const { planId, name, email } = req.body;

    if (!planId) return error(res, "Plan is required", 400);

    const plan = await Plan.findOne({ _id: planId, isActive: { $ne: false } });
    if (!plan) return error(res, "Selected plan not found", 404);

    if (email) {
      await VendorSubscription.updateMany(
        {
          vendor: null,
          plan: plan._id,
          applicantEmail: email.toLowerCase(),
          paymentStatus: "pending",
          status: "pending",
        },
        {
          $set: {
            status: "cancelled",
          },
        }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(plan.price * 100),
      currency: plan.currency,
      receipt: `vendor_${Date.now()}`,
      notes: {
        planId: String(plan._id),
        planCode: plan.code,
        applicantEmail: email || "",
      },
    });

    const subscription = await VendorSubscription.create({
      plan: plan._id,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
      applicantName: name || "",
      applicantEmail: email ? email.toLowerCase() : "",
      razorpayOrderId: order.id,
    });

    return success(res, {
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
      subscriptionId: subscription._id,
      order,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      subscriptionId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!subscriptionId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return error(res, "Payment verification fields are required", 400);
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return error(res, "Invalid payment signature", 400);
    }

    const subscription = await VendorSubscription.findById(subscriptionId).populate("plan");
    if (!subscription) return error(res, "Subscription record not found", 404);

    if (subscription.razorpayOrderId !== razorpay_order_id) {
      return error(res, "Order does not match subscription", 400);
    }

    if (subscription.status === "cancelled") {
      return error(res, "This payment session was replaced by a newer order", 400);
    }

    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpaySignature = razorpay_signature;
    subscription.paymentStatus = "paid";
    subscription.paidAt = new Date();
    await subscription.save();

    return success(res, {
      subscription: {
        id: subscription._id,
        planId: subscription.plan?._id || subscription.plan,
        orderId: subscription.razorpayOrderId,
        paymentId: subscription.razorpayPaymentId,
        signature: subscription.razorpaySignature,
      },
    }, "Payment verified successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || JSON.stringify(req.body || {});

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    if (!orderId) {
      return res.status(200).json({ success: true, message: "Webhook received" });
    }

    const subscription = await VendorSubscription.findOne({ razorpayOrderId: orderId });
    if (!subscription) {
      return res.status(200).json({ success: true, message: "Webhook received" });
    }

    if (event === "payment.captured") {
      subscription.paymentStatus = "paid";
      subscription.razorpayPaymentId = paymentEntity.id;
      subscription.paidAt = new Date();
    }

    if (event === "payment.failed") {
      subscription.paymentStatus = "failed";
    }

    await subscription.save();

    return res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
