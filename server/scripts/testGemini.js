import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { generateText, DEFAULT_GEMINI_MODEL } from "../config/gemini.js";

async function runGeminiTest() {
  console.log("==========================================");
  console.log("   INTERVIEWIQ — GEMINI CONNECTION TEST   ");
  console.log("==========================================\n");

  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  console.log("1. Environment Key Check:");
  console.log("   GEMINI_API_KEY present?:", hasApiKey ? "YES (Configured)" : "NO (Missing)");

  if (!hasApiKey) {
    console.error("\nTEST FAILED: GEMINI_API_KEY is not configured in server/.env");
    process.exit(1);
  }

  console.log("\n2. Model Target Configuration:");
  console.log("   Configured Model:", DEFAULT_GEMINI_MODEL);

  console.log("\n3. Sending minimal test prompt to Gemini...");
  try {
    const result = await generateText("Reply with the single word: OK");
    console.log("   ✓ Response received successfully!");
    console.log("   ✓ Model used:", result.model);
    console.log("   ✓ Sample output snippet:", JSON.stringify(result.text));
    console.log("\n==========================================");
    console.log("   GEMINI CONNECTION TEST: PASSED         ");
    console.log("==========================================");
    process.exit(0);
  } catch (error) {
    console.error("   ✗ Request failed.");
    console.error("   Category:", error.message);
    console.error("   HTTP Status Code:", error.statusCode || "N/A");
    console.log("\n==========================================");
    console.log("   GEMINI CONNECTION TEST: ENCOUNTERED ERROR");
    console.log("==========================================");
    process.exit(1);
  }
}

runGeminiTest();
