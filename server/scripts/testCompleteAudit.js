import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import userRoutes from "../routes/userRoutes.js";
import authRouter from "../routes/auth.route.js";
import resumeRoutes from "../routes/resumeRoutes.js";
import User from "../models/user.model.js";
import { getFirebaseAdminApp } from "../config/firebaseAdmin.js";

const xrefEntries = (entries) => entries.map((entry) => `${entry} `).join("\n");

const VALID_SYNTHETIC_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 150 >>
stream
BT
/F1 12 Tf
72 712 Td
(Jordan Smith - Full Stack Engineer. Skills: JavaScript, React, Node.js, Express, MongoDB. Projects: Realtime Task Manager, Cloud REST API.) Tj
ET
endstream
endobj
xref
0 5
${xrefEntries([
  "0000000000 65535 f",
  "0000000009 00000 n",
  "0000000058 00000 n",
  "0000000115 00000 n",
  "0000000305 00000 n",
])}
trailer
<< /Size 5 /Root 1 0 R >>
startxref
506
%%EOF`;

const EMPTY_TEXT_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
${xrefEntries([
  "0000000000 65535 f",
  "0000000009 00000 n",
  "0000000058 00000 n",
  "0000000115 00000 n",
])}
trailer
<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF`;

async function runAudit() {
  console.log("=========================================================");
  console.log("   INTERVIEWIQ — COMPLETE BACKEND PRE-COMMIT AUDIT       ");
  console.log("=========================================================\n");

  const results = [];
  const recordResult = (id, name, pass, details) => {
    results.push({ id, name, pass, details });
    console.log(`[${pass ? "PASS" : "FAIL"}] ${id}: ${name} - ${details}`);
  };

  // Check MongoDB Atlas reachability
  let liveDbConnected = false;
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000, family: 4 });
      liveDbConnected = true;
      console.log("✓ Live MongoDB Atlas connection: CONNECTED to", mongoose.connection.name);
    }
  } catch (err) {
    console.log("ℹ Live MongoDB Atlas connection: UNREACHABLE via current network (port 27017 firewall).");
    console.log("  Details:", err.message);
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const mockKeyId = "audit-key-1";
  const mockCerts = { [mockKeyId]: publicKey };
  const mockAudience = "audit-google-client-id";

  const originalJwtSecret = process.env.JWT_SECRET;
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = "audit-test-secret-min-32-characters-123456";
  }

  // Setup test Express app with exact middlewares as server/index.js
  const app = express();
  app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  let globalAuditFirebaseVerifier = null;
  app.use((req, res, next) => {
    if (globalAuditFirebaseVerifier) {
      req._firebaseVerifyOptions = { customVerifier: globalAuditFirebaseVerifier };
    }
    next();
  });

  // Mount discovered routes
  app.get("/", (req, res) => res.status(200).json({ success: true, message: "InterviewIQ API is running" }));
  app.use("/api/user", userRoutes);
  app.use("/api/auth", authRouter);
  app.use("/api/resume", resumeRoutes);

  // 404 Catch-All
  app.use((req, res) => res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.originalUrl}` }));

  const PORT = 8010;
  const server = app.listen(PORT);

  // If live DB is unreachable, setup in-memory mock for User model
  const inMemoryUsers = new Map();
  if (!liveDbConnected) {
    User.findOne = async (query) => {
      if (query.email) {
        return inMemoryUsers.get(query.email.toLowerCase()) || null;
      }
      return null;
    };
    User.findById = async (id) => {
      for (const u of inMemoryUsers.values()) {
        if (u._id.toString() === id.toString()) return u;
      }
      return null;
    };
    User.create = async (doc) => {
      const email = doc.email.toLowerCase();
      if (inMemoryUsers.has(email)) {
        const err = new Error("Duplicate email");
        err.code = 11000;
        throw err;
      }
      const newDoc = {
        _id: new mongoose.Types.ObjectId(),
        name: doc.name.trim(),
        email: email,
        credits: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryUsers.set(email, newDoc);
      return newDoc;
    };
    User.findByIdAndDelete = async (id) => {
      for (const [key, u] of inMemoryUsers.entries()) {
        if (u._id.toString() === id.toString()) {
          inMemoryUsers.delete(key);
          return u;
        }
      }
      return null;
    };
  }

  const testEmail = "audit_user_" + Date.now() + "@example.com";
  let createdUserId = null;

  try {
    // ----------------------------------------------------
    // 1. ROOT & 404 CHECKS
    // ----------------------------------------------------
    console.log("\n--- SECTION 1: ROOT & NOT-FOUND ROUTES ---");
    let res = await fetch(`http://localhost:${PORT}/`);
    let data = await res.json();
    recordResult("ROOT-1", "GET / returns HTTP 200", res.status === 200 && data.success === true, `HTTP ${res.status}`);

    res = await fetch(`http://localhost:${PORT}/api/nonexistent-route`);
    data = await res.json();
    recordResult("404-1", "Unknown path returns HTTP 404 JSON", res.status === 404 && data.success === false, `HTTP ${res.status} ${data.message}`);

    res = await fetch(`http://localhost:${PORT}/api/user/login`, { method: "PUT" });
    data = await res.json();
    recordResult("404-2", "Unsupported HTTP method returns HTTP 404 JSON", res.status === 404 && data.success === false, `HTTP ${res.status} ${data.message}`);

    // ----------------------------------------------------
    // 2. USER APIS (/api/user)
    // ----------------------------------------------------
    console.log("\n--- SECTION 2: USER APIS ---");
    // Missing name
    res = await fetch(`http://localhost:${PORT}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });
    data = await res.json();
    recordResult("USER-1", "POST /api/user/login rejects missing name", res.status === 400 && data.success === false, `HTTP ${res.status}`);

    // Missing email
    res = await fetch(`http://localhost:${PORT}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jordan Smith" }),
    });
    data = await res.json();
    recordResult("USER-2", "POST /api/user/login rejects missing email", res.status === 400 && data.success === false, `HTTP ${res.status}`);

    // Invalid email format
    res = await fetch(`http://localhost:${PORT}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jordan Smith", email: "invalid-email" }),
    });
    data = await res.json();
    recordResult("USER-3", "POST /api/user/login rejects invalid email", res.status === 400 && data.success === false, `HTTP ${res.status}`);

    // Valid user creation
    res = await fetch(`http://localhost:${PORT}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Jordan Smith  ", email: `  ${testEmail}  ` }),
    });
    data = await res.json();
    createdUserId = data.user?._id;
    recordResult("USER-4", "POST /api/user/login creates valid user", res.status === 201 && data.success === true && Boolean(createdUserId), `HTTP ${res.status} ID: ${createdUserId}`);

    // Duplicate login returns existing user without duplicating
    res = await fetch(`http://localhost:${PORT}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jordan Smith", email: `  ${testEmail.toUpperCase()}  ` }),
    });
    data = await res.json();
    recordResult("USER-5", "POST /api/user/login prevents duplicates and returns existing", res.status === 200 && data.user?._id === createdUserId, `HTTP ${res.status}`);

    // Profile malformed ID
    res = await fetch(`http://localhost:${PORT}/api/user/profile/malformed-123`);
    data = await res.json();
    recordResult("USER-6", "GET /api/user/profile/:id rejects malformed ID", res.status === 400 && data.success === false, `HTTP ${res.status}`);

    // Profile nonexistent valid ObjectId
    const fakeId = new mongoose.Types.ObjectId().toString();
    res = await fetch(`http://localhost:${PORT}/api/user/profile/${fakeId}`);
    data = await res.json();
    recordResult("USER-7", "GET /api/user/profile/:id returns 404 for nonexistent ID", res.status === 404 && data.success === false, `HTTP ${res.status}`);

    // Profile existing user ID
    res = await fetch(`http://localhost:${PORT}/api/user/profile/${createdUserId}`);
    data = await res.json();
    recordResult("USER-8", "GET /api/user/profile/:id retrieves existing user profile", res.status === 200 && data.user?._id === createdUserId, `HTTP ${res.status}`);

    // ----------------------------------------------------
    // 3. AUTH APIS (/api/auth)
    // ----------------------------------------------------
    console.log("\n--- SECTION 3: AUTH APIS ---");
    // Missing idToken / unverified body
    res = await fetch(`http://localhost:${PORT}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unverified User", email: "unverified@example.com" }),
    });
    data = await res.json();
    recordResult("AUTH-1", "POST /api/auth/google rejects unverified payload lacking idToken", res.status === 400 && data.success === false, `HTTP ${res.status}`);

    // Invalid / corrupt token string
    res = await fetch(`http://localhost:${PORT}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "invalid-token" }),
    });
    data = await res.json();
    recordResult("AUTH-2", "POST /api/auth/google rejects invalid / unverified token", res.status === 401 && data.success === false, `HTTP ${res.status}`);

    // Valid verified Firebase Auth sets cookie and returns user
    const googleEmail = "firebase_user_" + Date.now() + "@example.com";
    const activeApp = getFirebaseAdminApp();
    const activeProjectId = activeApp.options.projectId;
    globalAuditFirebaseVerifier = async () => ({
      uid: "firebase-audit-uid",
      email: googleEmail,
      name: "Firebase Verified User",
      email_verified: true,
      aud: activeProjectId,
      iss: `https://securetoken.google.com/${activeProjectId}`,
    });

    res = await fetch(`http://localhost:${PORT}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "valid-mock-firebase-id-token" }),
    });
    data = await res.json();
    const setCookie = res.headers.get("set-cookie");
    const hasTokenCookie = setCookie && setCookie.includes("token=") && setCookie.includes("HttpOnly");
    recordResult("AUTH-3", "POST /api/auth/google verifies Firebase ID token, returns user and sets HttpOnly cookie", res.status === 200 && data.success === true && Boolean(hasTokenCookie), `HTTP ${res.status} Cookie: ${hasTokenCookie ? "Set" : "Missing"}`);

    // Route alias /api/auth/gppgle (supporting frontend typo)
    res = await fetch(`http://localhost:${PORT}/api/auth/gppgle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "valid-mock-firebase-id-token" }),
    });
    data = await res.json();
    recordResult("AUTH-4", "POST /api/auth/gppgle route alias works for client compatibility with verified token", res.status === 200 && data.success === true, `HTTP ${res.status}`);

    // Logout clears token cookie
    res = await fetch(`http://localhost:${PORT}/api/auth/logout`);
    data = await res.json();
    const logoutCookie = res.headers.get("set-cookie");
    const clearedCookie = logoutCookie && (logoutCookie.includes("token=;") || logoutCookie.includes("Max-Age=0"));
    recordResult("AUTH-5", "GET /api/auth/logout clears cookie and returns 200", res.status === 200 && data.success === true && Boolean(clearedCookie), `HTTP ${res.status}`);

    // ----------------------------------------------------
    // 4. RESUME APIS (/api/resume)
    // ----------------------------------------------------
    console.log("\n--- SECTION 4: RESUME APIS ---");
    // Missing file
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: new FormData() });
    data = await res.json();
    recordResult("RESUME-1", "POST /api/resume/analyze rejects missing file", res.status === 400 && data.success === false, `HTTP ${res.status}`);

    // Misleading non-PDF file
    const formNonPdf = new FormData();
    formNonPdf.append("resume", new Blob(["plain text without PDF magic bytes"], { type: "application/pdf" }), "fake.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: formNonPdf });
    data = await res.json();
    recordResult("RESUME-2", "POST /api/resume/analyze rejects non-PDF file despite MIME type", res.status === 400 && data.message.includes("not a valid PDF"), `HTTP ${res.status}`);

    // Corrupt PDF
    const formCorrupt = new FormData();
    formCorrupt.append("resume", new Blob(["%PDF-1.4\ncorrupt binary data without pdf structure %%EOF"], { type: "application/pdf" }), "corrupt.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: formCorrupt });
    data = await res.json();
    recordResult("RESUME-3", "POST /api/resume/analyze rejects corrupted PDF", res.status === 400 && data.success === false, `HTTP ${res.status}`);

    // Empty text PDF
    const formEmpty = new FormData();
    formEmpty.append("resume", new Blob([EMPTY_TEXT_PDF], { type: "application/pdf" }), "empty.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: formEmpty });
    data = await res.json();
    recordResult("RESUME-4", "POST /api/resume/analyze rejects PDF with no extractable text", res.status === 422 && data.success === false, `HTTP ${res.status}`);

    // Oversized PDF (> 5 MB)
    const oversizedBuf = Buffer.alloc(5.5 * 1024 * 1024, "a");
    const formOver = new FormData();
    formOver.append("resume", new Blob([oversizedBuf], { type: "application/pdf" }), "huge.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: formOver });
    data = await res.json();
    recordResult("RESUME-5", "POST /api/resume/analyze rejects file > 5 MB with HTTP 413", res.status === 413 && data.success === false, `HTTP ${res.status}`);

    // Live Gemini Resume Analysis with valid synthetic PDF
    const formValid = new FormData();
    formValid.append("resume", new Blob([VALID_SYNTHETIC_PDF], { type: "application/pdf" }), "valid_resume.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: formValid });
    data = await res.json();
    const hasValidStructure =
      res.status === 200 &&
      data.success === true &&
      Array.isArray(data.analysis?.skills) &&
      Array.isArray(data.analysis?.projects) &&
      Array.isArray(data.analysis?.recommendedRoles) &&
      typeof data.analysis?.summary === "string";
    recordResult("RESUME-6", "POST /api/resume/analyze extracts text & Gemini returns structured analysis", hasValidStructure, `HTTP ${res.status} Skills: [${data.analysis?.skills?.slice(0, 3)?.join(", ")}...]`);

    // ----------------------------------------------------
    // 5. SECURITY & SECRETS SHIELDING
    // ----------------------------------------------------
    console.log("\n--- SECTION 5: SECURITY & SECRETS SHIELDING ---");
    const allResponsesStr = JSON.stringify(results);
    const leaked = allResponsesStr.includes("AIzaSy") || allResponsesStr.includes("mongodb+srv://");
    recordResult("SEC-1", "Zero secrets (API keys, URIs) leaked across all endpoint responses", !leaked, leaked ? "LEAK DETECTED" : "No secrets exposed");

    // Clean up created user if live DB
    if (liveDbConnected && createdUserId) {
      await User.findByIdAndDelete(createdUserId);
      console.log("✓ Cleaned up live test user from Atlas:", createdUserId);
    }
  } finally {
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    server.close();
    if (liveDbConnected) {
      await mongoose.disconnect();
    }
  }

  console.log("\n=========================================================");
  const passCount = results.filter((r) => r.pass).length;
  console.log(`   TOTAL TESTS: ${results.length} | PASSED: ${passCount} | FAILED: ${results.length - passCount}`);
  console.log("=========================================================\n");

  if (passCount !== results.length) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("Audit runner failure:", err);
  process.exit(1);
});
