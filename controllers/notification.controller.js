import Notification from "../models/Notification.js";
import { success, error } from "../utils/response.utils.js";

export const getMyNotifications = async (req, res) => {
  try {
    const { id, role } = req.user;
    const recipientModel = role === "vendor" ? "Vendor" : "User";

    const notifications = await Notification.find({
      recipientId:    id,
      recipientModel,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return success(res, { notifications, unreadCount });
  } catch (err) {
    return error(res, err.message);
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { isRead: true }
    );

    return success(res, {}, "All notifications marked as read");
  } catch (err) {
    return error(res, err.message);
  }
};

export const markOneRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) return error(res, "Notification not found", 404);

    return success(res, { notification }, "Notification marked as read");
  } catch (err) {
    return error(res, err.message);
  }
};
