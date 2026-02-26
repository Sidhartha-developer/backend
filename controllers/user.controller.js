import User from "../models/User.js";
import { success, error } from "../utils/response.utils.js";

export const getAllUsers = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: "i" };

    const users = await User.find(filter)
      .select("-password -resetPasswordToken -resetPasswordExpiry")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return success(res, { users, total, page: Number(page) });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -resetPasswordToken -resetPasswordExpiry");

    if (!user) return error(res, "User not found", 404);

    return success(res, { user });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getMyUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -resetPasswordToken -resetPasswordExpiry");

    if (!user) return error(res, "User not found", 404);

    return success(res, { user });
  } catch (err) {
    return error(res, err.message);
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name && !phone && !address) {
      return error(res, "Provide at least one field to update", 400);
    }

    const update = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (address) update.address = address;

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true })
      .select("-password -resetPasswordToken -resetPasswordExpiry");

    if (!user) return error(res, "User not found", 404);

    return success(res, { user }, "Profile updated");
  } catch (err) {
    return error(res, err.message);
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name && !phone && !address) {
      return error(res, "Provide at least one field to update", 400);
    }

    const update = {};
    if (name)    update.name    = name;
    if (phone)   update.phone   = phone;
    if (address) update.address = address;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select("-password -resetPasswordToken -resetPasswordExpiry");

    if (!user) return error(res, "User not found", 404);

    return success(res, { user }, "User updated");
  } catch (err) {
    return error(res, err.message);
  }
};

export const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return error(res, "User not found", 404);

    user.status = user.status === "active" ? "blocked" : "active";
    await user.save();

    return success(res, { status: user.status }, `User ${user.status}`);
  } catch (err) {
    return error(res, err.message);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) return error(res, "User not found", 404);

    return success(res, {}, "User deleted");
  } catch (err) {
    return error(res, err.message);
  }
};
