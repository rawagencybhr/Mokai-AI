import { GoogleGenerativeAI } from "@google/generative-ai";

export const MODEL_NAME = 'gemini-2.5-flash';

export const getGenAI = () => {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("Missing GOOGLE_API_KEY environment variable for Gemini.");
  }
  return new GoogleGenerativeAI(apiKey || "DUMMY_KEY");
};

export const getModel = () => getGenAI().getGenerativeModel({ model: MODEL_NAME });
