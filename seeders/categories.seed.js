import dotenv from "dotenv";
import connectDB from "../config/db.js";
import ScrapCategory from "../models/ScrapCategory.js";

dotenv.config();

const categories = [
  { name: "Metal",   description: "Iron, steel, copper, aluminium scrap" },
  { name: "Paper",   description: "Newspapers, cardboard, books, office paper" },
  { name: "Plastic", description: "Bottles, containers, bags, PVC" },
  { name: "E-Waste", description: "Old electronics, cables, batteries, PCBs" },
  { name: "Glass",   description: "Bottles, window glass, glassware" },
  { name: "Rubber",  description: "Tyres, tubes, rubber goods" },
];

const seed = async () => {
  await connectDB();

  await ScrapCategory.deleteMany({});
  await ScrapCategory.insertMany(categories);

  console.log("Categories seeded:", categories.map((c) => c.name).join(", "));
  process.exit(0);
};

seed();
