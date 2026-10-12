import User from "../models/user.model.js";
import genToken from "../config/token.js";
import { verifyFirebaseIdToken } from "../config/firebaseAdmin.js";

export const googleAuth = async (req, res) => {
  try {
    const { idToken, credential } = req.body;
    const tokenToVerify = idToken || credential;

    if (!tokenToVerify || typeof tokenToVerify !== "string" || !tokenToVerify.trim()) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required for authentication",
      });
    }

    let verifiedPayload;
    try {
      const verifyOptions = req._firebaseVerifyOptions || {};
      verifiedPayload = await verifyFirebaseIdToken(tokenToVerify, verifyOptions);
    } catch (verifyError) {
      console.error("Firebase token verification failed:", verifyError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid, expired, or unverified Firebase authentication token",
      });
    }

    const { email, name } = verifiedPayload;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
      });
    }

    const token = await genToken(user._id);
    if (!token) {
      return res.status(500).json({
        success: false,
        message: "Authentication failed due to token configuration error",
      });
    }

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during authentication",
    });
  }
};

export const logOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during logout",
    });
  }
};
