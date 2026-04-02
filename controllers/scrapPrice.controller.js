import ScrapPrice from "../models/ScrapPrice.js";
import { success, error } from "../utils/response.utils.js";


// ✅ Add / Update price (Admin)
export const upsertPrice = async (req, res) => {
  try {
    const { categoryId, pricePerKg } = req.body;

    if (!categoryId || pricePerKg == null) {
      return error(res, "categoryId and pricePerKg are required", 400);
    }

    const price = await ScrapPrice.findOneAndUpdate(
      { categoryId },
      { pricePerKg },
      { new: true, upsert: true }
    ).populate("categoryId", "name iconUrl");

    return success(res, { price }, "Price saved successfully");
  } catch (err) {
    return error(res, err.message);
  }
};


// ✅ Get all prices (for admin + user display)
export const getAllPrices = async (req, res) => {
  try {
    const prices = await ScrapPrice.find()
      .populate("categoryId", "name iconUrl")
      .sort({ createdAt: -1 });

    return success(res, { prices });
  } catch (err) {
    return error(res, err.message);
  }
};


// ✅ Estimate total price (User)
export const estimatePrice = async (req, res) => {
  try {
    const { categoryIds, estimatedWeight } = req.body;

    if (!categoryIds?.length || !estimatedWeight) {
      return error(res, "categoryIds and estimatedWeight are required", 400);
    }

    const prices = await ScrapPrice.find({
      categoryId: { $in: categoryIds },
      isActive: true,
    });

    if (!prices.length) {
      return error(res, "No pricing available for selected categories", 404);
    }

    // divide weight across categories
    const weightPerCategory = estimatedWeight / categoryIds.length;

    let total = 0;

    prices.forEach((p) => {
      total += p.pricePerKg * weightPerCategory;
    });

    return success(res, { total });
  } catch (err) {
    return error(res, err.message);
  }
};

