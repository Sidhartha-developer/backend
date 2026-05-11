import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import { initData } from "./utils/initData.js";

import authRoutes         from "./routes/auth.routes.js";
import userRoutes         from "./routes/user.routes.js";
import vendorRoutes       from "./routes/vendor.routes.js";
import categoryRoutes     from "./routes/category.routes.js";
import requestRoutes      from "./routes/request.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminRoutes        from "./routes/admin.routes.js";
import paymentRoutes      from "./routes/payment.routes.js";
import scrapPriceRoutes   from "./routes/scrapPrice.routes.js";
import paymentRoutes      from "./routes/payment.routes.js";

import errorHandler       from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

/* ===== Fix __dirname for ES modules ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ===== View Engine (only if using EJS) ===== */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===== Middlewares ===== */
app.use(cors());
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ===== Routes ===== */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/prices", scrapPriceRoutes);
app.use("/api/payments", paymentRoutes);

/* ===== Error Handler ===== */
app.use(errorHandler);

const PORT = process.env.PORT || 3002;

/* ===== Server Bootstrap ===== */
const startServer = async () => {
  try {
    await connectDB();   // connect DB first
    await initData();    // auto create admin + categories

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err.message);
    process.exit(1);
  }
};

startServer();
