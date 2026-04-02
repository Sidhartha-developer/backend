import ScrapRequest           from "../models/ScrapRequest.js";
import ScrapCategory          from "../models/ScrapCategory.js";
import { success, error }     from "../utils/response.utils.js";
import { uploadImage }        from "../services/cloudinary.service.js";
import { findNearestVendors } from "../services/vendor.service.js";
import { createNotification } from "../services/notification.service.js";
import User from "../models/User.js";
import { sendSMS } from "../services/sms.service.js";

export const createRequest = async (req, res) => {
  try {
    const { categoryIds, scrapType, pickupAddress, lat, lng, description, preferredDate, estimatedWeight } = req.body;

    let vehicleType;

if (estimatedWeight < 100) vehicleType = "2_wheeler";
else if (estimatedWeight <= 700) vehicleType = "3_wheeler";
else vehicleType = "4_wheeler";

    if (!categoryIds || !categoryIds.length || !pickupAddress || !scrapType)
      return error(res, "Category and pickup address are required", 400);

const categories = await ScrapCategory.find({
  _id: { $in: categoryIds },
  isActive: true,
});

if (!categories.length) {
  return error(res, "Invalid or inactive categories", 400);
}

    // upload each file buffer to cloudinary
    const images = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const uploaded = await uploadImage(file.buffer);
        images.push(uploaded);
      }
    }

const request = await ScrapRequest.create({
  userId: req.user.id,
  categoryIds,
  scrapType,
      pickupAddress,
      location: {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      },
      description,
      preferredDate:   preferredDate   || undefined,
      estimatedWeight: estimatedWeight ? Number(estimatedWeight) : undefined,
      vehicleType,
      images,
    });

    if (lat && lng) {
      const nearbyVendors = await findNearestVendors(Number(lat), Number(lng));
      for (const vendor of nearbyVendors) {
        await createNotification({
          recipientId:    vendor._id,
          recipientModel: "Vendor",
          message:        "A new scrap pickup request is available near you.",
          type:           "request_created",
          requestId:      request._id,
        });
      }
    }

    return success(res, { request }, "Request created", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const { status, categoryId, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status)     filter.status     = status;
    if (categoryId) filter.categoryIds = categoryId;

    const requests = await ScrapRequest.find(filter)
      .populate("userId",     "name email phone")
      .populate("vendorId",   "name email phone")
      .populate("categoryIds", "name iconUrl")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await ScrapRequest.countDocuments(filter);

    return success(res, { requests, total, page: Number(page) });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { userId: req.user.id };
    if (status) filter.status = status;

    const requests = await ScrapRequest.find(filter)
      .populate("categoryIds", "name iconUrl")
      .populate("vendorId",   "name phone")
      .sort({ createdAt: -1 });

    return success(res, { requests });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getVendorFeed = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      const statuses = String(status)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }

    const requests = await ScrapRequest.find(filter)
      .populate("userId",     "name phone")
      .populate("vendorId",   "name")
      .populate("categoryIds", "name iconUrl")
      .sort({ createdAt: -1 });

    return success(res, { requests });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getRequestById = async (req, res) => {
  try {
const request = await ScrapRequest.findById(req.params.id)
  .populate("userId", "name email phone")
  .populate("vendorId", "name email phone")
  .populate({
    path: "categoryIds",
    model: "ScrapCategory",
  });
  console.log("REQUEST:", request);

    if (!request) return error(res, "Request not found", 404);

    return success(res, { request });
  } catch (err) {
    return error(res, err.message);
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const request = await ScrapRequest.findOne({
      _id: req.params.id,
      status: "pending",
    });

    if (!request)
      return error(res, "Request not found or already accepted", 404);

    request.status = "accepted";
    request.vendorId = req.user.id;
    await request.save();

    // 🔹 Fetch user details
    const user = await User.findById(request.userId);

    // 🔹 In-app notification
    await createNotification({
      recipientId: request.userId,
      recipientModel: "User",
      message: "A vendor has accepted your scrap pickup request.",
      type: "request_accepted",
      requestId: request._id,
    });

    // 🔹 SMS Notification (only if phone exists)
    if (user?.phone) {
      await sendSMS(
        `+91${user.phone}`,
        "Your scrap pickup request has been accepted. Vendor will contact you shortly."
      );
    }

    return success(res, { request }, "Request accepted");
  } catch (err) {
    return error(res, err.message);
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const request = await ScrapRequest.findOne({
      _id:      req.params.id,
      vendorId: req.user.id,
      status:   "accepted",
    });

    if (!request) return error(res, "Request not found or cannot be rejected", 404);

    request.status   = "pending";
    request.vendorId = null;
    await request.save();

    return success(res, { request }, "Request returned to pending");
  } catch (err) {
    return error(res, err.message);
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed    = ["pickedUp", "completed"];

    if (!status) return error(res, "Status is required", 400);

    if (!allowed.includes(status))
      return error(res, `Status must be one of: ${allowed.join(", ")}`, 400);

    const request = await ScrapRequest.findOne({ _id: req.params.id, vendorId: req.user.id });

    if (!request) return error(res, "Request not found", 404);

    if (request.status === "completed")
      return error(res, "Request is already completed", 400);

    request.status = status;
    await request.save();

    await createNotification({
      recipientId:    request.userId,
      recipientModel: "User",
      message:        `Your scrap pickup status has been updated to: ${status}.`,
      type:           "status_update",
      requestId:      request._id,
    });

    return success(res, { request }, "Status updated");
  } catch (err) {
    return error(res, err.message);
  }
};

export const cancelRequest = async (req, res) => {
  try {
    const request = await ScrapRequest.findOne({
      _id:    req.params.id,
      userId: req.user.id,
      status: "pending",
    });

    if (!request) return error(res, "Only pending requests can be cancelled", 400);

    request.status = "cancelled";
    await request.save();

    return success(res, { request }, "Request cancelled");
  } catch (err) {
    return error(res, err.message);
  }
};
