import express from "express";
import { getDashboardStats } from "../controllers/admin.controller.js";
import { authenticate }      from "../middleware/auth.middleware.js";
import { requireRole }       from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate, requireRole("admin"));

router.get("/dashboard", getDashboardStats);

export default router;
