import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import Plan from "../models/Plan.js";
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

    /* ===== Plans Check ===== */
    const planCount = await Plan.countDocuments();

    if (planCount > 0) {
      console.log("ℹ️ Plans already exist");
    } else {
      await Plan.insertMany([
        {
          name: "Yearly",
          code: "YEARLY99",
          description: "Yearly vendor subscription plan.",
          price: 99,
          durationInDays: 365,
          features: ["365 days access", "Vendor listing", "Request access"],
          isActive: true,
        },
        
      ]);

      console.log("✅ Default plans added");
    }

  } catch (err) {
    console.error("❌ Init error:", err.message);
  }
};
