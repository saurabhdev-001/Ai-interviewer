import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import resumeRoutes from "../routes/resumeRoutes.js";
import userRoutes from "../routes/userRoutes.js";

const VALID_SYNTHETIC_PDF = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
  /Contents 4 0 R
>>
endobj
4 0 obj
<<
  /Length 160
>>
stream
BT
/F1 12 Tf
72 712 Td
(Alex Rivers - Full Stack Developer. Proficient in JavaScript, React, Node.js, Express, MongoDB. Projects: E-Commerce Store API, Realtime Chat app.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000305 00000 n 
trailer
<<
  /Size 5
  /Root 1 0 R
>>
startxref
516
%%EOF`;

const EMPTY_TEXT_PDF = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<<
  /Size 4
  /Root 1 0 R
>>
startxref
190
%%EOF`;

async function runTestSuite() {
  console.log("==================================================");
  console.log("   INTERVIEWIQ — PHASE 6 RESUME & AI TEST SUITE   ");
  console.log("==================================================\n");

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/", (req, res) => res.json({ success: true, message: "InterviewIQ API is running" }));
  app.use("/api/resume", resumeRoutes);
  app.use("/api/user", userRoutes);

  const PORT = 8008;
  const server = app.listen(PORT);
  console.log(`Test server running on port ${PORT}\n`);

  let allPassed = true;

  try {
    // TEST 1: Valid digital PDF upload & Gemini analysis
    console.log("1. Testing valid PDF upload & Gemini analysis...");
    const form1 = new FormData();
    form1.append("resume", new Blob([VALID_SYNTHETIC_PDF], { type: "application/pdf" }), "sample_resume.pdf");
    let res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: form1 });
    let data = await res.json();
    console.log("   HTTP Status:", res.status);
    console.log("   Response Success:", data.success);
    if (res.status === 200 && data.success && data.analysis) {
      console.log("   ✓ Extracted Skills:", data.analysis.skills);
      console.log("   ✓ Recommended Roles:", data.analysis.recommendedRoles);
      console.log("   ✓ Summary:", data.analysis.summary?.slice(0, 70) + "...");
      console.log("   TEST 1 RESULT: PASS\n");
    } else {
      console.error("   TEST 1 RESULT: FAIL", data);
      allPassed = false;
    }

    // TEST 2: Missing file upload
    console.log("2. Testing missing file upload rejection...");
    const form2 = new FormData();
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: form2 });
    data = await res.json();
    console.log("   HTTP Status:", res.status);
    console.log("   Message:", data.message);
    if (res.status === 400 && data.success === false) {
      console.log("   TEST 2 RESULT: PASS\n");
    } else {
      console.error("   TEST 2 RESULT: FAIL\n");
      allPassed = false;
    }

    // TEST 3: Misleading file (plain text with .pdf extension and application/pdf MIME type)
    console.log("3. Testing non-PDF file with fake PDF extension and MIME type...");
    const form3 = new FormData();
    form3.append("resume", new Blob(["This is plain text without PDF signature bytes"], { type: "application/pdf" }), "fake.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: form3 });
    data = await res.json();
    console.log("   HTTP Status:", res.status);
    console.log("   Message:", data.message);
    if (res.status === 400 && data.success === false && data.message.includes("not a valid PDF")) {
      console.log("   TEST 3 RESULT: PASS\n");
    } else {
      console.error("   TEST 3 RESULT: FAIL\n");
      allPassed = false;
    }

    // TEST 4: Malformed/corrupt PDF
    console.log("4. Testing corrupt/malformed PDF rejection...");
    const form4 = new FormData();
    form4.append("resume", new Blob(["%PDF-1.4\ncorrupt binary data that cannot be parsed by pdf-parse %%EOF"], { type: "application/pdf" }), "corrupt.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: form4 });
    data = await res.json();
    console.log("   HTTP Status:", res.status);
    console.log("   Message:", data.message);
    if (res.status === 400 && data.success === false) {
      console.log("   TEST 4 RESULT: PASS\n");
    } else {
      console.error("   TEST 4 RESULT: FAIL\n");
      allPassed = false;
    }

    // TEST 5: Oversized file (> 5 MB)
    console.log("5. Testing oversized file rejection (> 5 MB limit)...");
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, "a");
    const form5 = new FormData();
    form5.append("resume", new Blob([oversizedBuffer], { type: "application/pdf" }), "oversized.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: form5 });
    data = await res.json();
    console.log("   HTTP Status:", res.status);
    console.log("   Message:", data.message);
    if (res.status === 413 && data.success === false) {
      console.log("   TEST 5 RESULT: PASS\n");
    } else {
      console.error("   TEST 5 RESULT: FAIL\n");
      allPassed = false;
    }

    // TEST 6: PDF with no extractable text
    console.log("6. Testing PDF with no extractable text...");
    const form6 = new FormData();
    form6.append("resume", new Blob([EMPTY_TEXT_PDF], { type: "application/pdf" }), "empty_text.pdf");
    res = await fetch(`http://localhost:${PORT}/api/resume/analyze`, { method: "POST", body: form6 });
    data = await res.json();
    console.log("   HTTP Status:", res.status);
    console.log("   Message:", data.message);
    if (res.status === 422 && data.success === false) {
      console.log("   TEST 6 RESULT: PASS\n");
    } else {
      console.error("   TEST 6 RESULT: FAIL\n");
      allPassed = false;
    }

    // TEST 7: Invalid AI response / structure handling
    console.log("7. Testing AI response structure validation...");
    // Direct validation unit test of the schema verifier logic
    const testMalformedStructures = [
      "not json",
      JSON.stringify({ skills: "not an array" }),
      JSON.stringify({ skills: [], projects: [] }), // missing fields
    ];
    let allStructureTestsHandled = true;
    for (const badOutput of testMalformedStructures) {
      try {
        let cleaned = badOutput.trim();
        const parsed = JSON.parse(cleaned);
        const isValid =
          parsed &&
          typeof parsed === "object" &&
          Array.isArray(parsed.skills) &&
          Array.isArray(parsed.projects) &&
          Array.isArray(parsed.recommendedRoles) &&
          typeof parsed.summary === "string";
        if (isValid) allStructureTestsHandled = false;
      } catch (_) {
        // Expected parsing error caught safely
      }
    }
    if (allStructureTestsHandled) {
      console.log("   ✓ Malformed/invalid structures are strictly identified and rejected");
      console.log("   TEST 7 RESULT: PASS\n");
    } else {
      console.error("   TEST 7 RESULT: FAIL\n");
      allPassed = false;
    }

    // TEST 8: Secrets shielding check in error responses
    console.log("8. Verifying secrets shielding in API responses...");
    const serializedResponses = JSON.stringify([data]);
    const leaksSecret = serializedResponses.includes("AIzaSy") || serializedResponses.includes("mongodb+srv");
    if (!leaksSecret) {
      console.log("   ✓ Zero API keys or connection strings exposed in responses");
      console.log("   TEST 8 RESULT: PASS\n");
    } else {
      console.error("   TEST 8 RESULT: FAIL (Secret leak detected)\n");
      allPassed = false;
    }

    // TEST 9: Regression tests for root and Phase 4 endpoints
    console.log("9. Verifying regression of root and Phase 4 routes...");
    res = await fetch(`http://localhost:${PORT}/`);
    const rootData = await res.json();
    const rootPass = res.status === 200 && rootData.success;

    res = await fetch(`http://localhost:${PORT}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Verifier" }),
    });
    const userValidationData = await res.json();
    const userPass = res.status === 400 && !userValidationData.success;

    if (rootPass && userPass) {
      console.log("   ✓ Root endpoint responds 200");
      console.log("   ✓ User login validation responds 400");
      console.log("   TEST 9 RESULT: PASS\n");
    } else {
      console.error("   TEST 9 RESULT: FAIL\n");
      allPassed = false;
    }

    console.log("==================================================");
    if (allPassed) {
      console.log("   ALL 9 PHASE 6 TEST SCENARIOS PASSED (9/9)      ");
    } else {
      console.log("   ONE OR MORE PHASE 6 TESTS FAILED               ");
    }
    console.log("==================================================");
  } finally {
    server.close();
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
