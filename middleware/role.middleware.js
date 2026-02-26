import { error } from "../utils/response.utils.js";

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return error(res, "Access denied", 403);
  }
  next();
};
