import fs from "node:fs";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const DEFAULT_PROJECT_ID = "interviewiq-b31e1";

let firebaseApp = null;
let firebaseAuth = null;

/**
 * Initializes and returns the Firebase Admin SDK singleton.
 * Uses service account credentials if provided via environment variables,
 * or falls back to project ID configuration.
 */
export const getFirebaseAdminApp = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    firebaseAuth = getAuth(firebaseApp);
    return firebaseApp;
  }

  let credential = null;
  let serviceAccountProjectId = null;

  // 1. Check for service account file path
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if (fs.existsSync(keyPath)) {
      try {
        const fileContent = fs.readFileSync(keyPath, "utf8");
        const serviceAccountObj = JSON.parse(fileContent);
        credential = cert(serviceAccountObj);
        serviceAccountProjectId = serviceAccountObj.project_id;
      } catch (err) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY file:", err.message);
      }
    } else {
      console.error(`FIREBASE_SERVICE_ACCOUNT_KEY file does not exist at path: ${keyPath}`);
    }
  }

  // 2. Check for inline JSON service account string
  if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccountObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(serviceAccountObj);
      serviceAccountProjectId = serviceAccountObj.project_id;
    } catch (err) {
      console.error("Failed to parse inline FIREBASE_SERVICE_ACCOUNT JSON:", err.message);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccountProjectId || DEFAULT_PROJECT_ID;

  const appOptions = { projectId };
  if (credential) {
    appOptions.credential = credential;
  }

  try {
    firebaseApp = initializeApp(appOptions);
    firebaseAuth = getAuth(firebaseApp);
  } catch (initErr) {
    console.error("Firebase Admin initialization error:", initErr.message);
    throw initErr;
  }

  return firebaseApp;
};

/**
 * Returns the Firebase Auth instance.
 */
export const getFirebaseAuth = () => {
  if (!firebaseAuth) {
    getFirebaseAdminApp();
  }
  return firebaseAuth;
};

/**
 * Verifies a Firebase Authentication ID token.
 * Validates cryptographic signature, expiration, issuer, audience, and project association.
 *
 * @param {string} idToken - The Firebase ID token to verify
 * @param {object} [options] - Verification options
 * @param {Function} [options.customVerifier] - Optional custom verifier for offline unit testing
 * @returns {Promise<{ uid: string, email: string, name: string, picture: string|null }>}
 */
export const verifyFirebaseIdToken = async (idToken, options = {}) => {
  if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
    const err = new Error("Missing Firebase ID token");
    err.code = "auth/argument-error";
    throw err;
  }

  const tokenString = idToken.trim();
  let decodedToken;

  if (options.customVerifier) {
    decodedToken = await options.customVerifier(tokenString);
  } else {
    const auth = getFirebaseAuth();
    decodedToken = await auth.verifyIdToken(tokenString);
  }

  if (!decodedToken) {
    const err = new Error("Invalid token payload");
    err.code = "auth/invalid-payload";
    throw err;
  }

  // Enforce project association check
  const app = getFirebaseAdminApp();
  const expectedProjectId = process.env.FIREBASE_PROJECT_ID || (app && app.options && app.options.projectId) || DEFAULT_PROJECT_ID;
  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;

  if (decodedToken.aud && decodedToken.aud !== expectedProjectId) {
    const err = new Error(`Firebase token audience mismatch: expected ${expectedProjectId}, received ${decodedToken.aud}`);
    err.code = "auth/wrong-project";
    throw err;
  }

  if (decodedToken.iss && decodedToken.iss !== expectedIssuer) {
    const err = new Error(`Firebase token issuer mismatch: expected ${expectedIssuer}, received ${decodedToken.iss}`);
    err.code = "auth/wrong-issuer";
    throw err;
  }

  // Require email verification
  if (decodedToken.email_verified !== true && decodedToken.email_verified !== "true") {
    const err = new Error("Firebase account email is not verified");
    err.code = "auth/unverified-email";
    throw err;
  }

  if (!decodedToken.email || typeof decodedToken.email !== "string") {
    const err = new Error("Firebase token does not contain an email address");
    err.code = "auth/missing-email";
    throw err;
  }

  return {
    uid: decodedToken.uid || decodedToken.sub,
    email: decodedToken.email.toLowerCase().trim(),
    name: (decodedToken.name || decodedToken.email.split("@")[0]).trim(),
    picture: decodedToken.picture || null,
  };
};
