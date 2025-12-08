// app/api/instagram/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { sendInstagramMessage } from "@/lib/meta";
import { BotConfig } from "@/types";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
import { SpeechClient } from "@google-cloud/speech";

export const dynamic = "force-dynamic";

// ==============================
//  Google STT Client
// ==============================
let speechClient: SpeechClient | null = null;

function getSpeechClient() {
  if (!speechClient) {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON env");

    const credentials = JSON.parse(raw);
    speechClient = new SpeechClient({
      credentials,
      projectId: credentials.project_id,
    });
  }
  return speechClient!;
}

async function transcribeAudio(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const audioBytes = Buffer.from(buf).toString("base64");

    const client = getSpeechClient();
    const [response] = await client.recognize({
      audio: { content: audioBytes },
      config: {
        encoding: "OGG_OPUS",
        languageCode: "ar-SA",
      },
    });

    return response.results?.[0]?.alternatives?.[0]?.transcript || null;
  } catch {
    return null;
  }
}

// ==============================
//  VERIFY TOKEN (GET)
// ==============================
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN)
    return new NextResponse(challenge, { status: 200 });

  return new NextResponse("Invalid verify token", { status: 403 });
}

// ==============================
//  WEBHOOK HANDLER (POST)
// ==============================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Instagram via Messenger API = object = "page"
    if (body.object !== "page")
      return new NextResponse("Ignored", { status: 200 });

    for (const entry of body.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        await processEvent(entry.id, event);
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("Webhook Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// ==============================
//  PROCESS EACH EVENT
// ==============================
async function processEvent(pageId: string, event: any) {
  if (!event.message || event.message.is_echo) return;

  const senderId = event.sender?.id;
  if (!senderId) return;

  // Find bot by instagramPageId
  const botsSnap = await getDocs(
    query(collection(db, "bots"), where("instagramPageId", "==", pageId))
  );

  if (botsSnap.empty) {
    console.log("No bot linked to this page:", pageId);
    return;
  }

  const bot = botsSnap.docs[0].data() as BotConfig;

  if (!bot.isActive) return;
  if (!bot.instagramAccessToken) return;

  let messageText: string | null = event.message.text || null;
  let imagePart: any = null;

  const attachment = event.message.attachments?.[0];

  // ===== IMAGE =====
  if (attachment?.type === "image") {
    const imgUrl = attachment.payload.url;

    const res = await fetch(imgUrl);
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");

    imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64,
      },
    } as any;

    if (!messageText)
      messageText = "📸 العميل أرسل صورة. حللها بشكل ودود.";
  }

  // ===== AUDIO =====
  if (!messageText && attachment?.type === "audio") {
    const audioUrl = attachment.payload.url;
    const transcript = await transcribeAudio(audioUrl);

    messageText = transcript
      ? `🎧 نص الرسالة الصوتية:\n"${transcript}"`
      : "🎧 استلمت تسجيل صوتي، لكن لم أتمكن من قراءته.";
  }

  if (!messageText && !imagePart) return;

  // ===== GENERATE AI RESPONSE =====
  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);

  const parts: any[] = [{ text: systemInstruction }];

  if (imagePart) parts.push(imagePart);
  parts.push({ text: messageText });

  let replyText = "";
  try {
    const model = getModel();
    const result = await model.generateContent(parts);
    replyText = result.response.text();
  } catch (err) {
    console.error("AI Error:", err);
    return;
  }

  if (!replyText) return;

  // ===== SEND MESSAGE BACK =====
  try {
    await sendInstagramMessage(
      pageId,
      senderId,
      replyText,
      bot.instagramAccessToken
    );

    console.log("Reply sent successfully.");
  } catch (err) {
    console.error("Send Reply Error:", err);
  }
}
