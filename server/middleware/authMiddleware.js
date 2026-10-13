import mongoose from "mongoose";
import { verifySessionToken } from "../config/token.js";
import User from "../models/user.model.js";

/**
 * Middleware to authenticate requests via JWT session token.
 * Extracts token from HttpOnly cookie `token` or `Authorization: Bearer <token>` header.
 * Derives user identity from the verified token and attaches user and userId to `req`.
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers?.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in.",
      });
    }

    const decoded = verifySessionToken(token.trim());
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session. Please sign in again.",
      });
    }

    // When connected to MongoDB, verify the user exists in database
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User account not found or session is no longer valid.",
        });
      }
      req.user = user;
      req.userId = user._id;
    } else {
      req.userId = decoded.userId;
      req.user = { _id: decoded.userId };
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please sign in again.",
    });
  }
};
