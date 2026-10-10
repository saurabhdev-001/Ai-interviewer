import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || !apiKey.trim()) {
  console.warn("⚠ GEMINI_API_KEY is not defined in server/.env.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: { timeout: 30000 },
});

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

/**
 * Reusable helper to generate text using the configured Gemini model.
 * Sanitizes errors to prevent exposing API keys or secret parameters.
 *
 * @param {string} prompt - The text prompt for Gemini.
 * @param {object} options - Optional parameters: { model, config }.
 * @returns {Promise<{ text: string, model: string }>}
 */
export const generateText = async (prompt, options = {}) => {
  if (!apiKey || !apiKey.trim()) {
    const err = new Error("Gemini API key is not configured");
    err.statusCode = 500;
    throw err;
  }

  const model = options.model || DEFAULT_GEMINI_MODEL;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: options.config || {},
    });

    return {
      text: response.text ? response.text.trim() : "",
      model,
    };
  } catch (error) {
    const status = error.status || error.code || 500;
    let message = "Gemini service encountered an error";

    if (status === 400) {
      message = "Bad request to Gemini API";
    } else if (status === 401 || status === 403) {
      message = "Authentication or permission failure on Gemini API";
    } else if (status === 404) {
      message = `Requested model "${model}" was not found or is no longer available`;
    } else if (status === 429) {
      message = "Gemini API rate limit or quota exceeded";
    } else if (status === 503 || status === 504) {
      message = `Gemini model "${model}" is temporarily experiencing high demand or gateway timeout (HTTP ${status})`;
    }

    const sanitizedError = new Error(message);
    sanitizedError.statusCode = status;
    throw sanitizedError;
  }
};

export default ai;
