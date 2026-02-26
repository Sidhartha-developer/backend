import express from "express";
import {
  createRequest,
  getAllRequests,
  getMyRequests,
  getVendorFeed,
  getRequestById,
  acceptRequest,
  rejectRequest,
  updateStatus,
  cancelRequest,
} from "../controllers/request.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole }  from "../middleware/role.middleware.js";
import upload           from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/",            authenticate, requireRole("user"),   upload.array("images", 5), createRequest);
router.get("/",             authenticate, requireRole("admin"),  getAllRequests);
router.get("/my",           authenticate, requireRole("user"),   getMyRequests);
router.get("/vendor-feed",  authenticate, requireRole("vendor"), getVendorFeed);
router.get("/:id",          authenticate,                        getRequestById);
router.patch("/:id/accept", authenticate, requireRole("vendor"), acceptRequest);
router.patch("/:id/reject", authenticate, requireRole("vendor"), rejectRequest);
router.patch("/:id/status", authenticate, requireRole("vendor"), updateStatus);
router.patch("/:id/cancel", authenticate, requireRole("user"),   cancelRequest);

export default router;
