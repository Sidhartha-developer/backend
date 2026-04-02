import Vendor from "../models/Vendor.js";
import { success, error }              from "../utils/response.utils.js";
import { createNotification }          from "../services/notification.service.js";
import { sendVendorApprovalEmail }     from "../services/email.service.js";
import { haversineKm }                 from "../utils/geo.utils.js";

export const getAllVendors = async (req, res) => {
  try {
    const { approvalStatus, status, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (status)         filter.status         = status;
    if (search)         filter.name           = { $regex: search, $options: "i" };

    const vendors = await Vendor.find(filter)
      .select("-password -resetPasswordToken -resetPasswordExpiry")
      .populate("currentPlan", "name code price durationInDays")
      .populate("currentSubscription", "status paymentStatus startDate endDate")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Vendor.countDocuments(filter);

    return success(res, { vendors, total, page: Number(page) });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .select("-password -resetPasswordToken -resetPasswordExpiry")
      .populate("currentPlan", "name code price durationInDays")
      .populate("currentSubscription", "status paymentStatus startDate endDate");

    if (!vendor) return error(res, "Vendor not found", 404);

    return success(res, { vendor });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id)
      .select("-password -resetPasswordToken -resetPasswordExpiry")
      .populate("currentPlan", "name code price durationInDays")
      .populate("currentSubscription", "status paymentStatus startDate endDate");

    if (!vendor) return error(res, "Vendor not found", 404);

    return success(res, { vendor });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getNearbyVendors = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const { scrapType, vehicleType } = req.query;

    if (lat === undefined || lng === undefined) {
      return error(res, "lat and lng query params are required", 400);
    }

    const userLat = Number(lat);
    const userLng = Number(lng);

    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return error(res, "lat and lng must be valid numbers", 400);
    }

    if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
      return error(res, "Invalid latitude or longitude range", 400);
    }


const filter = {
  approvalStatus: "approved",
  status: "active",
  "location.lat": { $exists: true, $ne: null },
  "location.lng": { $exists: true, $ne: null },
};

if (vehicleType) filter.vehicleTypes = vehicleType;
if (scrapType) filter.scrapTypes = scrapType;

const vendors = await Vendor.find(filter)
  .select("name phone location vehicleTypes scrapTypes");

    const nearby = vendors
      .map((vendor) => {
        const vendorLat = Number(vendor.location?.lat);
        const vendorLng = Number(vendor.location?.lng);

        if (!Number.isFinite(vendorLat) || !Number.isFinite(vendorLng)) return null;

        const distance = haversineKm(userLat, userLng, vendorLat, vendorLng);
        if (distance > 10) return null;

        return {
          _id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          location: vendor.location,
          distanceKm: Number(distance.toFixed(2)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.status(200).json({
      success: true,
      data: { vendors: nearby },
    });
  } catch (err) {
    return error(res, err.message);
  }
};

export const approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) return error(res, "Vendor not found", 404);

    if (vendor.approvalStatus === "approved") {
      return error(res, "Vendor is already approved", 400);
    }

    vendor.approvalStatus = "approved";
    await vendor.save();

    await sendVendorApprovalEmail(vendor.email, "approved");
    await createNotification({
      recipientId:    vendor._id,
      recipientModel: "Vendor",
      message:        "Your vendor account has been approved. You can now accept requests.",
      type:           "vendor_approved",
    });

    return success(res, {}, "Vendor approved");
  } catch (err) {
    return error(res, err.message);
  }
};

export const rejectVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) return error(res, "Vendor not found", 404);

    vendor.approvalStatus = "rejected";
    await vendor.save();

    await sendVendorApprovalEmail(vendor.email, "rejected");

    return success(res, {}, "Vendor rejected");
  } catch (err) {
    return error(res, err.message);
  }
};

export const blockVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) return error(res, "Vendor not found", 404);

    vendor.status = vendor.status === "active" ? "blocked" : "active";
    await vendor.save();

    return success(res, { status: vendor.status }, `Vendor ${vendor.status}`);
  } catch (err) {
    return error(res, err.message);
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { name, phone, address, lat, lng, vehicleTypes, scrapTypes  } = req.body;

    if (!name && !phone && !address && !lat && !lng) {
      return error(res, "Provide at least one field to update", 400);
    }

    if (vehicleTypes && !Array.isArray(vehicleTypes)) {
      return error(res, "vehicleTypes must be an array", 400);
    }

    if (scrapTypes && !Array.isArray(scrapTypes)) {
      return error(res, "scrapTypes must be an array", 400);
    }
    const update = {};
    if (name)    update.name    = name;
    if (phone)   update.phone   = phone;
    if (address) update.address = address;
    if (lat && lng) update.location = { lat: Number(lat), lng: Number(lng) };
    if (vehicleTypes) update.vehicleTypes = vehicleTypes;
    if (scrapTypes) update.scrapTypes = scrapTypes;

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, update, { new: true })
      .select("-password -resetPasswordToken -resetPasswordExpiry");

    if (!vendor) return error(res, "Vendor not found", 404);

    return success(res, { vendor }, "Profile updated");
  } catch (err) {
    return error(res, err.message);
  }
};
