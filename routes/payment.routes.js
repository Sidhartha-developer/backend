import express from "express";
import {
  getPlans,
  createOrder,
  verifyPayment,
  handleWebhook,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.get("/plans", getPlans);
router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.post("/webhook", handleWebhook);

export default router;
