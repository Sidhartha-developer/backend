import { verifyToken } from "../utils/jwt.utils.js";
import { error } from "../utils/response.utils.js";

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return error(res, "No token provided", 401);
  }

  try {
    req.user = verifyToken(header.split(" ")[1]);
    next();
  } catch {
    return error(res, "Invalid or expired token", 401);
  }
};
