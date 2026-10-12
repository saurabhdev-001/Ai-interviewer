import jwt from "jsonwebtoken";

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Validates and retrieves the JWT secret from environment variables.
 * Throws a safe error if missing or if the secret does not meet minimum strength requirements.
 *
 * @returns {string} The validated secret
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== "string" || !secret.trim()) {
    throw new Error("JWT_SECRET environment variable is missing.");
  }
  if (secret.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET is insufficiently secure (minimum ${MIN_JWT_SECRET_LENGTH} characters required).`);
  }
  return secret.trim();
};

/**
 * Signs a JWT for a user session.
 *
 * @param {string} userId - The user ID to encode in the token
 * @returns {Promise<string|null>} The signed JWT or null on failure
 */
const genToken = async (userId) => {
  try {
    const secret = getJwtSecret();
    const token = jwt.sign({ userId }, secret, { expiresIn: "7d" });
    return token;
  } catch (error) {
    console.error("Token generation error:", error.message);
    return null;
  }
};

/**
 * Verifies a user session JWT.
 *
 * @param {string} token - The JWT to verify
 * @returns {object|null} The decoded token payload or null on failure
 */
export const verifySessionToken = (token) => {
  try {
    const secret = getJwtSecret();
    return jwt.verify(token, secret);
  } catch (error) {
    console.error("Token verification error:", error.message);
    return null;
  }
};

export default genToken;