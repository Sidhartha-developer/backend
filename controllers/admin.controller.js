import User          from "../models/User.js";
import Vendor        from "../models/Vendor.js";
import ScrapRequest  from "../models/ScrapRequest.js";
import ScrapCategory from "../models/ScrapCategory.js";
import { success, error } from "../utils/response.utils.js";

export const getDashboardStats = async (_req, res) => {
  try {
    const [
      totalUsers,
      totalVendors,
      pendingVendors,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalCategories,
    ] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments({ approvalStatus: "approved" }),
      Vendor.countDocuments({ approvalStatus: "pending" }),
      ScrapRequest.countDocuments(),
      ScrapRequest.countDocuments({ status: "pending" }),
      ScrapRequest.countDocuments({ status: "completed" }),
      ScrapCategory.countDocuments({ isActive: true }),
    ]);

    return success(res, {
      totalUsers,
      totalVendors,
      pendingVendors,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalCategories,
    });
  } catch (err) {
    return error(res, err.message);
  }
};
