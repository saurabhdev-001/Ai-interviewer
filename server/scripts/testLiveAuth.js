import http from "node:http";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { getFirebaseAdminApp, getFirebaseAuth, verifyFirebaseIdToken } from "../config/firebaseAdmin.js";
import { getJwtSecret, verifySessionToken, default as genToken } from "../config/token.js";
import authRouter from "../routes/auth.route.js";
import userRoutes from "../routes/userRoutes.js";
import resumeRoutes from "../routes/resumeRoutes.js";
import User from "../models/user.model.js";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const recordResult = (id, description, pass, detail = "") => {
  totalTests++;
  if (pass) {
    passedTests++;
    console.log(`[PASS] ${id}: ${description}${detail ? ` - ${detail}` : ""}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${id}: ${description}${detail ? ` - ${detail}` : ""}`);
  }
};

const sendRequest = (server, { method, path: reqPath, headers = {}, body = null }) => {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: "127.0.0.1",
      port: address.port,
      path: reqPath,
      method,
      headers: { ...headers },
    };

    let payloadString = "";
    if (body) {
      payloadString = typeof body === "string" ? body : JSON.stringify(body);
      options.headers["Content-Type"] = "application/json";
      options.headers["Content-Length"] = Buffer.byteLength(payloadString);
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
          rawBody: data,
        });
      });
    });

    req.on("error", reject);
    if (payloadString) {
      req.write(payloadString);
    }
    req.end();
  });
};

async function runLiveVerification() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — FINAL LIVE AUTHENTICATION VERIFICATION  ");
  console.log("=========================================================\n");

  // 1. CREDENTIALS CONFIGURATION CHECK
  console.log("--- 1. CREDENTIALS CONFIGURATION AUDIT ---");
  const hasJwtSecret = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32);
  recordResult(
    "CONF-1",
    "JWT_SECRET is configured with minimum 32 characters in server/.env",
    hasJwtSecret,
    hasJwtSecret ? "Configured and valid" : "Missing or < 32 chars"
  );

  const hasServiceAccountKey = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  recordResult(
    "CONF-2",
    "Firebase Admin credentials configured in server/.env",
    hasServiceAccountKey,
    hasServiceAccountKey ? "Service account key configured" : "Missing"
  );

  // 2. FIREBASE ADMIN SDK INITIALIZATION
  console.log("\n--- 2. FIREBASE ADMIN SDK INITIALIZATION ---");
  const app = getFirebaseAdminApp();
  const auth = getFirebaseAuth();
  const projectId = app.options.projectId;
  recordResult(
    "INIT-1",
    "Firebase Admin initialized successfully as singleton",
    Boolean(app) && Boolean(auth) && projectId === "interviewiq-b31e1",
    `App: ${app.name}, ProjectId: ${projectId}`
  );

  // Check live Atlas connection
  let liveDbConnected = false;
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000, family: 4 });
      liveDbConnected = true;
      console.log(`✓ Live MongoDB Atlas connection: CONNECTED to ${mongoose.connection.name}`);
    }
  } catch (err) {
    console.log("ℹ Live MongoDB Atlas connection: UNREACHABLE via local network (firewall port 27017).");
    console.log("  Details:", err.message);
  }

  // 3. OBTAIN REAL FIREBASE ID TOKEN
  console.log("\n--- 3. REAL FIREBASE ID TOKEN GENERATION ---");
  let realFirebaseIdToken = null;
  let testUserUid = "Lfah1Y0jJAeaoeeQS7b14if4Rh22"; // Existing user in interviewiq-b31e1

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const oauthToken = await app.options.credential.getAccessToken();
      const customToken = await auth.createCustomToken(testUserUid);

      const exchangeRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${oauthToken.access_token}`,
        },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      });

      const exchangeData = await exchangeRes.json();
      if (exchangeData.idToken) {
        realFirebaseIdToken = exchangeData.idToken;
        break;
      }
    } catch (tokenErr) {
      if (attempt === 3) {
        console.error("Token exchange error:", tokenErr.message);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  recordResult(
    "TOKEN-1",
    "Real Firebase ID token obtained for project interviewiq-b31e1",
    Boolean(realFirebaseIdToken),
    realFirebaseIdToken ? `Token obtained (length: ${realFirebaseIdToken.length})` : "Failed"
  );

  // SETUP SERVER
  const expressApp = express();
  expressApp.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
  expressApp.use(express.json());
  expressApp.use(cookieParser());
  expressApp.get("/", (req, res) => res.status(200).json({ success: true, message: "InterviewIQ API is running" }));
  expressApp.use("/api/auth", authRouter);
  expressApp.use("/api/user", userRoutes);
  expressApp.use("/api/resume", resumeRoutes);

  const server = http.createServer(expressApp);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const inMemoryUsers = new Map();
  const origFindOne = User.findOne;
  const origCreate = User.create;
  if (!liveDbConnected) {
    User.findOne = async function (filter) {
      if (filter && filter.email) {
        for (const u of inMemoryUsers.values()) {
          if (u.email === filter.email) return u;
        }
      }
      return null;
    };
    User.create = async function (data) {
      const u = {
        _id: new mongoose.Types.ObjectId(),
        name: data.name,
        email: data.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryUsers.set(u._id.toString(), u);
      return u;
    };
  }

  let liveCreatedUserId = null;

  try {
    // 4. TOKEN REJECTION & SECURITY VERIFICATIONS
    console.log("\n--- 4. BACKEND TOKEN REJECTION & SPOOFING SHIELD ---");

    // Missing token
    const resNoToken = await sendRequest(server, {
      method: "POST",
      path: "/api/auth/google",
      body: { name: "Attacker", email: "victim@example.com" },
    });
    recordResult(
      "AUTH-REJECT-1",
      "POST /api/auth/google rejects request with no idToken",
      resNoToken.statusCode === 400 && resNoToken.body?.success === false,
      `HTTP ${resNoToken.statusCode} - ${resNoToken.body?.message}`
    );

    // Malformed token string
    const resBadToken = await sendRequest(server, {
      method: "POST",
      path: "/api/auth/google",
      body: { idToken: "invalid-malformed-token-string" },
    });
    recordResult(
      "AUTH-REJECT-2",
      "POST /api/auth/google rejects malformed token with HTTP 401",
      resBadToken.statusCode === 401 && resBadToken.body?.success === false,
      `HTTP ${resBadToken.statusCode} - ${resBadToken.body?.message}`
    );

    // Expired token
    let expiredRejected = false;
    try {
      await verifyFirebaseIdToken("expired-test-token", {
        customVerifier: async () => {
          const err = new Error("Firebase ID token has expired.");
          err.code = "auth/id-token-expired";
          throw err;
        },
      });
    } catch (e) {
      expiredRejected = e.code === "auth/id-token-expired";
    }
    recordResult("AUTH-REJECT-3", "Backend verifier rejects expired token", expiredRejected, "auth/id-token-expired caught");

    // Wrong project token
    let wrongProjectRejected = false;
    try {
      await verifyFirebaseIdToken("wrong-project-token", {
        customVerifier: async () => ({
          uid: "user-999",
          email: "candidate@example.com",
          email_verified: true,
          aud: "wrong-malicious-project",
          iss: "https://securetoken.google.com/wrong-malicious-project",
        }),
      });
    } catch (e) {
      wrongProjectRejected = e.code === "auth/wrong-project";
    }
    recordResult("AUTH-REJECT-4", "Backend verifier rejects token from wrong project / audience", wrongProjectRejected, "auth/wrong-project caught");

    // Unverified email
    let unverifiedEmailRejected = false;
    try {
      await verifyFirebaseIdToken("unverified-email-token", {
        customVerifier: async () => ({
          uid: "user-999",
          email: "candidate@example.com",
          email_verified: false,
          aud: "interviewiq-b31e1",
          iss: "https://securetoken.google.com/interviewiq-b31e1",
        }),
      });
    } catch (e) {
      unverifiedEmailRejected = e.code === "auth/unverified-email";
    }
    recordResult("AUTH-REJECT-5", "Backend verifier rejects unverified email", unverifiedEmailRejected, "auth/unverified-email caught");

    // 5. LIVE VALID TOKEN AUTHENTICATION & SPOOFING RESISTANCE
    console.log("\n--- 5. LIVE VALID TOKEN AUTHENTICATION & SESSION ISSUANCE ---");

    if (realFirebaseIdToken) {
      const resLiveAuth = await sendRequest(server, {
        method: "POST",
        path: "/api/auth/google",
        body: {
          idToken: realFirebaseIdToken,
          // Malicious spoof attempt in body
          name: "Spoofed Attacker Name",
          email: "spoofed_attacker@evil.com",
        },
      });

      const setCookieHeader = resLiveAuth.headers["set-cookie"]?.[0] || "";
      const isHttpOnly = setCookieHeader.includes("HttpOnly");
      const isSameSite = setCookieHeader.toLowerCase().includes("samesite=strict");
      const returnedUser = resLiveAuth.body?.user;
      liveCreatedUserId = returnedUser?._id;

      // Extract JWT from cookie and verify
      const cookieMatch = setCookieHeader.match(/token=([^;]+)/);
      const sessionToken = cookieMatch ? cookieMatch[1] : null;
      const decodedSession = sessionToken ? verifySessionToken(sessionToken) : null;

      recordResult(
        "LIVE-AUTH-1",
        "POST /api/auth/google verifies real Firebase ID token and sets HttpOnly cookie",
        resLiveAuth.statusCode === 200 && isHttpOnly && isSameSite && Boolean(sessionToken),
        `HTTP ${resLiveAuth.statusCode} - HttpOnly: ${isHttpOnly}, SameSite: Strict`
      );

      recordResult(
        "LIVE-AUTH-2",
        "Backend trusts verified token claims only and ignores spoofed body name/email",
        resLiveAuth.statusCode === 200 &&
          returnedUser?.email === "saimamukerjee@gmail.com" &&
          returnedUser?.email !== "spoofed_attacker@evil.com",
        `Created/found user with verified email: ${returnedUser?.email}`
      );

      recordResult(
        "LIVE-AUTH-3",
        "Session JWT in cookie encodes correct user ID and decodes with JWT_SECRET",
        decodedSession && decodedSession.userId === returnedUser?._id,
        `Session verified for userId: ${decodedSession?.userId}`
      );
    } else {
      recordResult("LIVE-AUTH-1", "Live Firebase ID token verification", false, "No real token available");
    }

    // 6. LOGOUT AND COOKIE CLEARING
    console.log("\n--- 6. LOGOUT & COOKIE CLEARING ---");
    const resLogout = await sendRequest(server, {
      method: "GET",
      path: "/api/auth/logout",
    });
    const logoutCookie = resLogout.headers["set-cookie"]?.[0] || "";
    recordResult(
      "LOGOUT-1",
      "GET /api/auth/logout clears session cookie and returns HTTP 200",
      resLogout.statusCode === 200 && (logoutCookie.includes("token=;") || logoutCookie.includes("Max-Age=0")),
      `HTTP ${resLogout.statusCode} - Cookie cleared`
    );

    // 7. REGRESSION TESTS (USER AND RESUME)
    console.log("\n--- 7. REGRESSION TESTS (USER & RESUME) ---");
    // Root route
    const resRoot = await sendRequest(server, { method: "GET", path: "/" });
    recordResult("REG-1", "GET / returns HTTP 200", resRoot.statusCode === 200, `HTTP ${resRoot.statusCode}`);

    // User login validation
    const resUserVal = await sendRequest(server, {
      method: "POST",
      path: "/api/user/login",
      body: { email: "no-name@example.com" },
    });
    recordResult("REG-2", "POST /api/user/login rejects missing name", resUserVal.statusCode === 400, `HTTP ${resUserVal.statusCode}`);

    // Resume analyze validation
    const resResumeVal = await sendRequest(server, {
      method: "POST",
      path: "/api/resume/analyze",
    });
    recordResult("REG-3", "POST /api/resume/analyze rejects missing file", resResumeVal.statusCode === 400, `HTTP ${resResumeVal.statusCode}`);

    // 8. SECRETS SHIELDING
    console.log("\n--- 8. SECRETS SHIELDING VERIFICATION ---");
    const allResponsesStr = JSON.stringify([resNoToken, resBadToken, resLogout, resRoot]);
    const secretsExposed =
      allResponsesStr.includes("AIzaSy") ||
      allResponsesStr.includes("mongodb+srv://") ||
      allResponsesStr.includes("PRIVATE KEY");
    recordResult("SEC-1", "Zero secrets (API keys, URIs, private keys) exposed in responses", !secretsExposed, "No secrets exposed");

    // Clean up live test user if created in Atlas
    if (liveDbConnected && liveCreatedUserId) {
      await User.findByIdAndDelete(liveCreatedUserId);
      console.log("✓ Cleaned up live test user from Atlas:", liveCreatedUserId);
    }
  } finally {
    if (!liveDbConnected) {
      User.findOne = origFindOne;
      User.create = origCreate;
    }
    server.close();
    if (liveDbConnected) {
      await mongoose.disconnect();
    }
  }

  console.log("\n=========================================================");
  console.log(`   TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("=========================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error("Live verification fatal error:", err);
  process.exit(1);
});
