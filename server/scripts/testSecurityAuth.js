import http from "node:http";
import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import { getJwtSecret, verifySessionToken, default as genToken } from "../config/token.js";
import { verifyFirebaseIdToken, getFirebaseAdminApp } from "../config/firebaseAdmin.js";
import authRouter from "../routes/auth.route.js";
import User from "../models/user.model.js";

import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const recordResult = (testId, description, passed, detail = "") => {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`[PASS] ${testId}: ${description}${detail ? ` - ${detail}` : ""}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${testId}: ${description}${detail ? ` - ${detail}` : ""}`);
  }
};

const sendRequest = (server, { method, path, headers = {}, body = null }) => {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: "127.0.0.1",
      port: address.port,
      path,
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

async function runSecuritySuite() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — FIREBASE AUTH & SECURITY GATE SUITE      ");
  console.log("=========================================================\n");

  // SECTION 1: JWT SECRET CONFIGURATION & STRENGTH
  console.log("--- PART 1: JWT SECRET CONFIGURATION & STRENGTH ---");
  const originalJwtSecret = process.env.JWT_SECRET;

  try {
    // 1. Missing secret
    delete process.env.JWT_SECRET;
    let missingSecretThrew = false;
    try {
      getJwtSecret();
    } catch (e) {
      missingSecretThrew = e.message.includes("missing");
    }
    const tokenResultWhenMissing = await genToken("user123");
    recordResult(
      "JWT-1",
      "Missing JWT_SECRET throws safe error and genToken returns null",
      missingSecretThrew && tokenResultWhenMissing === null,
      missingSecretThrew ? "Safe exception thrown, null token returned" : "Failed to catch missing secret"
    );

    // 2. Insufficiently strong secret (< 32 characters)
    process.env.JWT_SECRET = "short-secret-123";
    let weakSecretThrew = false;
    try {
      getJwtSecret();
    } catch (e) {
      weakSecretThrew = e.message.includes("insufficiently secure");
    }
    const tokenResultWhenWeak = await genToken("user123");
    recordResult(
      "JWT-2",
      "Short JWT_SECRET (< 32 chars) is rejected and genToken returns null",
      weakSecretThrew && tokenResultWhenWeak === null,
      weakSecretThrew ? "Rejected weak secret, null token returned" : "Failed to enforce length"
    );

    // 3. Strong secret (>= 32 characters)
    const strongTestSecret = "super-secure-32-char-min-test-secret-key-12345";
    process.env.JWT_SECRET = strongTestSecret;
    const strongSecret = getJwtSecret();
    const validToken = await genToken("user_abc_789");
    const verified = verifySessionToken(validToken);
    recordResult(
      "JWT-3",
      "Strong JWT_SECRET (>= 32 chars) correctly signs and verifies session token",
      strongSecret === strongTestSecret && validToken !== null && verified?.userId === "user_abc_789",
      `Token signed and verified successfully (user: ${verified?.userId})`
    );
  } finally {
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  }

  // SECTION 2: FIREBASE ID TOKEN VERIFICATION UNIT TESTS
  console.log("\n--- PART 2: FIREBASE ID TOKEN CRYPTOGRAPHIC VERIFICATION ---");
  const activeApp = getFirebaseAdminApp();
  const expectedProjectId = activeApp.options.projectId;
  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;

  // 1. Missing token
  let missingFirebaseTokenCaught = false;
  try {
    await verifyFirebaseIdToken("");
  } catch (e) {
    missingFirebaseTokenCaught = e.code === "auth/argument-error";
  }
  recordResult(
    "FIREBASE-1",
    "Empty or missing Firebase ID token is rejected",
    missingFirebaseTokenCaught,
    "Rejected empty token string"
  );

  // 2. Malformed token via live Firebase Admin SDK
  let malformedTokenCaught = false;
  try {
    await verifyFirebaseIdToken("malformed.jwt.token");
  } catch (e) {
    malformedTokenCaught = Boolean(e.code);
  }
  recordResult(
    "FIREBASE-2",
    "Malformed token string is rejected by Firebase Admin",
    malformedTokenCaught,
    "Firebase Admin rejected malformed format"
  );

  // 3. Expired token validation (mocked verifier for offline unit test)
  let expiredTokenCaught = false;
  try {
    await verifyFirebaseIdToken("expired-test-token", {
      customVerifier: async () => {
        const err = new Error("Firebase ID token has expired.");
        err.code = "auth/id-token-expired";
        throw err;
      },
    });
  } catch (e) {
    expiredTokenCaught = e.code === "auth/id-token-expired";
  }
  recordResult(
    "FIREBASE-3",
    "Expired Firebase ID token is rejected",
    expiredTokenCaught,
    "auth/id-token-expired caught"
  );

  // 4. Wrong project / audience token validation
  let wrongProjectCaught = false;
  try {
    await verifyFirebaseIdToken("wrong-project-token", {
      customVerifier: async () => ({
        uid: "user-1002",
        email: "candidate@example.com",
        email_verified: true,
        aud: "wrong-malicious-firebase-project",
        iss: expectedIssuer,
      }),
    });
  } catch (e) {
    wrongProjectCaught = e.code === "auth/wrong-project";
  }
  recordResult(
    "FIREBASE-4",
    "Token issued for wrong Firebase project / audience is rejected",
    wrongProjectCaught,
    "auth/wrong-project detected"
  );

  // 5. Wrong issuer token validation
  let wrongIssuerCaught = false;
  try {
    await verifyFirebaseIdToken("wrong-issuer-token", {
      customVerifier: async () => ({
        uid: "user-1003",
        email: "candidate@example.com",
        email_verified: true,
        aud: expectedProjectId,
        iss: "https://securetoken.google.com/malicious-project",
      }),
    });
  } catch (e) {
    wrongIssuerCaught = e.code === "auth/wrong-issuer";
  }
  recordResult(
    "FIREBASE-5",
    "Token with mismatched issuer is rejected",
    wrongIssuerCaught,
    "auth/wrong-issuer detected"
  );

  // 6. Unverified email validation
  let unverifiedEmailCaught = false;
  try {
    await verifyFirebaseIdToken("unverified-email-token", {
      customVerifier: async () => ({
        uid: "user-1004",
        email: "candidate@example.com",
        email_verified: false,
        aud: expectedProjectId,
        iss: expectedIssuer,
      }),
    });
  } catch (e) {
    unverifiedEmailCaught = e.code === "auth/unverified-email";
  }
  recordResult(
    "FIREBASE-6",
    "Token with unverified email is rejected",
    unverifiedEmailCaught,
    "auth/unverified-email detected"
  );

  // 7. Valid Firebase token validation
  let validPayload = null;
  try {
    validPayload = await verifyFirebaseIdToken("valid-token", {
      customVerifier: async () => ({
        uid: "firebase-uid-777",
        email: "VerifiedCandidate@Example.COM",
        name: "Verified Candidate",
        email_verified: true,
        aud: expectedProjectId,
        iss: expectedIssuer,
      }),
    });
  } catch (e) {
    console.error("Valid token error:", e.message);
  }
  recordResult(
    "FIREBASE-7",
    "Valid Firebase ID token successfully extracts normalized identity",
    validPayload !== null &&
      validPayload.email === "verifiedcandidate@example.com" &&
      validPayload.name === "Verified Candidate" &&
      validPayload.uid === "firebase-uid-777",
    `Normalized claims: ${validPayload?.email} (uid: ${validPayload?.uid})`
  );

  // SECTION 3: HTTP ENDPOINT SECURITY & IDENTITY SHIELDING
  console.log("\n--- PART 3: HTTP ENDPOINT SECURITY & IDENTITY SHIELDING ---");
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  let globalTestVerifyOptions = null;
  app.use((req, res, next) => {
    if (globalTestVerifyOptions) {
      req._firebaseVerifyOptions = globalTestVerifyOptions;
    }
    next();
  });
  app.use("/api/auth", authRouter);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  // In-memory model stub for database operations during controller test
  const memoryUsers = new Map();
  const originalFindOne = User.findOne;
  const originalCreate = User.create;

  User.findOne = async function (filter) {
    if (filter && filter.email) {
      for (const u of memoryUsers.values()) {
        if (u.email === filter.email) return u;
      }
    }
    return null;
  };

  User.create = async function (data) {
    const newUser = {
      _id: new mongoose.Types.ObjectId(),
      name: data.name,
      email: data.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryUsers.set(newUser._id.toString(), newUser);
    return newUser;
  };

  try {
    // 1. Client sends only name and email without idToken
    const resNoToken = await sendRequest(server, {
      method: "POST",
      path: "/api/auth/google",
      body: { name: "Attacker", email: "victim@example.com" },
    });
    recordResult(
      "AUTH-EP-1",
      "POST /api/auth/google rejects request with unverified name/email and no idToken",
      resNoToken.statusCode === 400 && resNoToken.body?.success === false,
      `HTTP ${resNoToken.statusCode} - ${resNoToken.body?.message}`
    );

    // 2. Client sends invalid token string
    const resBadToken = await sendRequest(server, {
      method: "POST",
      path: "/api/auth/google",
      body: { idToken: "invalid-token-string" },
    });
    recordResult(
      "AUTH-EP-2",
      "POST /api/auth/google rejects unverified / invalid token with HTTP 401",
      resBadToken.statusCode === 401 && resBadToken.body?.success === false,
      `HTTP ${resBadToken.statusCode} - ${resBadToken.body?.message}`
    );

    // 3. Valid token verification when JWT_SECRET is missing in env
    delete process.env.JWT_SECRET;
    globalTestVerifyOptions = {
      customVerifier: async () => ({
        uid: "firebase-uid-888",
        email: "verifiedcandidate@example.com",
        name: "Verified Candidate",
        email_verified: true,
        aud: expectedProjectId,
        iss: expectedIssuer,
      }),
    };

    const resMissingSecret = await sendRequest(server, {
      method: "POST",
      path: "/api/auth/google",
      body: { idToken: "mock-valid-firebase-token" },
    });
    recordResult(
      "AUTH-EP-3",
      "Valid Firebase token safely fails with HTTP 500 when JWT_SECRET is unset in env",
      resMissingSecret.statusCode === 500 && !resMissingSecret.headers["set-cookie"],
      `HTTP ${resMissingSecret.statusCode} - no cookie set`
    );

    // 4. Valid token verification with spoofed request body
    process.env.JWT_SECRET = "a-very-strong-32-character-test-jwt-secret!";
    const resValidAuth = await sendRequest(server, {
      method: "POST",
      path: "/api/auth/google",
      body: {
        idToken: "mock-valid-firebase-token",
        // Malicious client tries to spoof identity in request body
        name: "Spoofed Attacker",
        email: "spoofed@evil.com",
      },
    });

    const setCookieHeader = resValidAuth.headers["set-cookie"]?.[0] || "";
    const isHttpOnly = setCookieHeader.includes("HttpOnly");
    const isSameSite = setCookieHeader.toLowerCase().includes("samesite=strict");
    const userEmailInResponse = resValidAuth.body?.user?.email;

    recordResult(
      "AUTH-EP-4",
      "Valid Firebase token creates user from VERIFIED claims (ignoring spoofed body) and sets HttpOnly cookie",
      resValidAuth.statusCode === 200 &&
        userEmailInResponse === "verifiedcandidate@example.com" &&
        isHttpOnly &&
        isSameSite,
      `HTTP 200 - User: ${userEmailInResponse}, HttpOnly: ${isHttpOnly}, SameSite: Strict`
    );

    // 5. Route alias /api/auth/gppgle enforces identical strict security
    const resAlias = await sendRequest(server, {
      method: "POST",
      path: "/api/auth/gppgle",
      body: { name: "Attacker", email: "victim@example.com" },
    });
    recordResult(
      "AUTH-EP-5",
      "Route alias /api/auth/gppgle enforces identical strict token verification",
      resAlias.statusCode === 400 && resAlias.body?.success === false,
      `HTTP ${resAlias.statusCode} - ${resAlias.body?.message}`
    );

    // 6. Logout clears session cookie
    const resLogout = await sendRequest(server, {
      method: "GET",
      path: "/api/auth/logout",
    });
    const logoutCookie = resLogout.headers["set-cookie"]?.[0] || "";
    recordResult(
      "AUTH-EP-6",
      "GET /api/auth/logout clears session cookie",
      resLogout.statusCode === 200 && (logoutCookie.includes("token=;") || logoutCookie.includes("Max-Age=0")),
      `HTTP 200 - Cookie cleared`
    );
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    server.close();
  }

  // SECTION 4: REAL INTEGRATION ENVIRONMENT STATUS
  console.log("\n--- PART 4: REAL ENVIRONMENT & INTEGRATION STATUS ---");
  const localEnvConfigured = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);
  console.log(`ℹ Real JWT_SECRET configured in local server/.env: ${localEnvConfigured ? "YES (>= 32 chars)" : "NO (missing or unconfigured)"}`);
  if (!localEnvConfigured) {
    console.log("  → Notice: Live authentication integration tests requiring local JWT_SECRET are safely paused until configured by user.");
  }

  const hasFirebaseServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log(`ℹ Firebase Service Account configured in server/.env: ${hasFirebaseServiceAccount ? "YES" : "NO (unconfigured)"}`);
  console.log(`ℹ Firebase Project ID: ${process.env.FIREBASE_PROJECT_ID || expectedProjectId}`);

  console.log("\n=========================================================");
  console.log(`   TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("=========================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecuritySuite().catch((err) => {
  console.error("Security suite fatal error:", err);
  process.exit(1);
});
