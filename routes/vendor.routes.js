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
  applyVendor,
} from "../controllers/vendor.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

import upload from "../middleware/upload.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

router.get(
  "/nearby",
  getNearbyVendors
);

router.post(
  "/apply",
  upload.single("idProof"),
  applyVendor
);

/*
|--------------------------------------------------------------------------
| VENDOR ROUTES
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  authenticate,
  requireRole("vendor"),
  getMyVendorProfile
);

router.patch(
  "/:id",
  authenticate,
  requireRole("vendor"),
  updateVendor
);

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  requireRole("admin"),
  getAllVendors
);

router.get(
  "/:id",
  authenticate,
  requireRole("admin"),
  getVendorById
);

router.patch(
  "/:id/approve",
  authenticate,
  requireRole("admin"),
  approveVendor
);

router.patch(
  "/:id/reject",
  authenticate,
  requireRole("admin"),
  rejectVendor
);

router.patch(
  "/:id/block",
  authenticate,
  requireRole("admin"),
  blockVendor
);

export default router;