import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Admin from "../models/Admin.js";

dotenv.config();

const seed = async () => {
  await connectDB();

  const exists = await Admin.findOne({ email: "admin@scrap.com" });
  if (exists) {
    console.log("Admin already exists");
    process.exit(0);
  }

  const hashed = await bcrypt.hash("Admin@1234", 12);

  await Admin.create({
    name: "Super Admin",
    email: "admin@scrap.com",
    password: hashed,
    role: "admin",
  });

  console.log("Admin seeded successfully");
  process.exit(0);
};

seed();