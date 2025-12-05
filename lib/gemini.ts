import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.warn("Missing API_KEY environment variable for Gemini.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || "DUMMY_KEY" });

export const MODEL_NAME = 'gemini-2.5-flash';