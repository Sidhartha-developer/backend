import express from "express";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole }  from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/",       getAllCategories);
router.post("/",      authenticate, requireRole("admin"), createCategory);
router.patch("/:id",  authenticate, requireRole("admin"), updateCategory);
router.delete("/:id", authenticate, requireRole("admin"), deleteCategory);

export default router;
