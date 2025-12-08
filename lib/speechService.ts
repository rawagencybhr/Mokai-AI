import { SpeechClient } from "@google-cloud/speech";

const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const credentials = raw ? JSON.parse(raw) : undefined as any;

export const speechClient = new SpeechClient({
  credentials,
  projectId: credentials?.project_id,
});

