import express from "express";
import {
  getAllVendors,
  getVendorById,
  getMyVendorProfile,
  getNearbyVendors,
  approveVendor,
  rejectVendor,
  blockVendor,
  updateVendor,
} from "../controllers/vendor.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole }  from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/nearby",         getNearbyVendors);
router.get("/",               authenticate, requireRole("admin"),  getAllVendors);
router.get("/me",             authenticate, requireRole("vendor"), getMyVendorProfile);
router.get("/:id",            authenticate, requireRole("admin"),  getVendorById);
router.patch("/:id/approve",  authenticate, requireRole("admin"),  approveVendor);
router.patch("/:id/reject",   authenticate, requireRole("admin"),  rejectVendor);
router.patch("/:id/block",    authenticate, requireRole("admin"),  blockVendor);
router.patch("/:id",          authenticate, requireRole("vendor"), updateVendor);

export default router;
