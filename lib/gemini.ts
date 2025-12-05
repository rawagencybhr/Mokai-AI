import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.API_KEY;

if (!apiKey) {
  console.warn("Missing GOOGLE_API_KEY environment variable for Gemini.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "DUMMY_KEY");

export const MODEL_NAME = 'gemini-2.5-flash';

export const getModel = (systemInstruction?: string) =>
  genAI.getGenerativeModel({ model: MODEL_NAME, ...(systemInstruction ? { systemInstruction } : {}) });
