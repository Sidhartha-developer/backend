import express from "express";
import {
  registerUser,
  login,
  registerVendor,
  forgotPassword,
  resetPassword,
  showResetForm,
} from "../controllers/auth.controller.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/register",              registerUser);
router.post("/login",                 login);
router.post("/vendor/register",       upload.single("idProof"), registerVendor);
router.post("/forgot-password",       forgotPassword);
router.post("/reset-password/:token", resetPassword);

// GET — shows the reset form
router.get("/reset-password/:token", showResetForm);

// POST — already exists, handles form submit
router.post("/reset-password/:token", resetPassword);
export default router;
