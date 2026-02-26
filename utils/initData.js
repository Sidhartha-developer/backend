import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import ScrapCategory from "../models/ScrapCategory.js";

export const initData = async () => {
  try {
    /* ===== Admin Check ===== */
    const adminEmail = "admin@scrap.com";
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("ℹ️ Admin already exists");
    } else {
      const hashed = await bcrypt.hash("Admin@1234", 12);

      await Admin.create({
        name: "Super Admin",
        email: adminEmail,
        password: hashed,
        role: "admin",
      });

      console.log("✅ Super Admin created");
    }

    /* ===== Categories Check ===== */
    const count = await ScrapCategory.countDocuments();

    if (count > 0) {
      console.log("ℹ️ Categories already exist");
    } else {
      await ScrapCategory.insertMany([
        { name: "Metal", description: "Iron, steel, copper scrap" },
        { name: "Paper", description: "Newspapers, cardboard" },
        { name: "Plastic", description: "Bottles, containers" },
        { name: "E-Waste", description: "Electronics, cables" },
        { name: "Glass", description: "Glass bottles and items" },
      ]);

      console.log("✅ Default categories added");
    }

  } catch (err) {
    console.error("❌ Init error:", err.message);
  }
};