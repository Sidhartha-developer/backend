import Notification from "../models/Notification.js";

export const createNotification = async ({
  recipientId,
  recipientModel,
  message,
  type,
  requestId = null,
}) => {
  return Notification.create({ recipientId, recipientModel, message, type, requestId });
};
