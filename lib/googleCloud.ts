import { GoogleAI, SpeechClient } from "@google-cloud/speech";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs";

let credentials: any;

try {
  // Parse JSON credentials from Vercel env
  credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!);
} catch (e) {
  console.error("Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON:", e);
}

export const speechToText = new SpeechClient({
  credentials,
  projectId: credentials.project_id,
});

export const textToSpeech = new TextToSpeechClient({
  credentials,
  projectId: credentials.project_id,
});

export const vertex = new VertexAI({
  project: credentials.project_id,
  location: "us-central1",
  credentials,
});
