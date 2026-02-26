import express from "express";
import {
  getAllUsers,
  getUserById,
  getMyUserProfile,
  updateMyProfile,
  updateUser,
  blockUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole }  from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/me", authenticate, requireRole("user"), getMyUserProfile);
router.patch("/me", authenticate, requireRole("user"), updateMyProfile);

router.use(authenticate, requireRole("admin"));

router.get("/",          getAllUsers);
router.get("/:id",       getUserById);
router.patch("/:id",     updateUser);
router.patch("/:id/block", blockUser);
router.delete("/:id",    deleteUser);

export default router;
