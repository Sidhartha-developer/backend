import jwt from "jsonwebtoken";

export const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || "30d") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

export const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);
