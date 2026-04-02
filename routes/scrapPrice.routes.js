import express from "express";
import {
  upsertPrice,
  getAllPrices,
  estimatePrice,
} from "../controllers/scrapPrice.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = express.Router();

// 🔐 Admin: Add / update price
router.post("/", authenticate, requireRole("admin"), upsertPrice);

// 🔓 Public/User: Get all prices
router.get("/", getAllPrices);

// 🔐 User: Estimate price
router.post("/estimate", authenticate, estimatePrice);

export default router;