import express from "express";
import {
  getMyNotifications,
  markAllRead,
  markOneRead,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/",          getMyNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markOneRead);

export default router;
