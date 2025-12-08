// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { sendInstagramMessage } from "@/lib/meta";
import { BotConfig } from "@/types";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
import { SpeechClient } from "@google-cloud/speech";

export const dynamic = "force-dynamic";

// ===================================
// Google Speech Client
// ===================================
let speechClient: SpeechClient | null = null;

function getSpeechClient() {
  if (!speechClient) {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) throw new Error("❌ Missing GOOGLE_APPLICATION_CREDENTIALS_JSON env");

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
    const buffer = await res.arrayBuffer();
    const audioBytes = Buffer.from(buffer).toString("base64");

    const client = getSpeechClient();
    const [response] = await client.recognize({
      audio: { content: audioBytes },
      config: { encoding: "OGG_OPUS", languageCode: "ar-SA" },
    });

    return response.results?.[0]?.alternatives?.[0]?.transcript || null;
  } catch (e) {
    console.error("STT ERROR:", e);
    return null;
  }
}

// ===================================
// VERIFY TOKEN
// ===================================
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

// ===================================
// MAIN WEBHOOK HANDLER
// ===================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 Incoming Webhook:", JSON.stringify(body, null, 2));

    // ❌ لا يوجد object=instagram في LIVE
    if (body.object !== "page") {
      console.log("Ignored event. object must be 'page'");
      return new NextResponse("IGNORED", { status: 200 });
    }

    for (const entry of body.entry ?? []) {
      const messaging = entry.messaging ?? [];
      for (const msg of messaging) {
        await processEvent(entry.id, msg); // entry.id = PAGE_ID
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// ===================================
// PROCESS EVENT
// ===================================
async function processEvent(pageId: string, event: any) {
  console.log("⚡ EVENT KEYS:", Object.keys(event));

  if (!event.message || event.message.is_echo) return;

  const senderId = event.sender?.id;
  if (!senderId) return;

  // ======================
  // find bot using pageId
  // ======================
  const botsRef = collection(db, "bots");
  const snap = await getDocs(query(botsRef, where("instagramPageId", "==", pageId)));

  if (snap.empty) {
    console.log("❌ No bot matches pageId:", pageId);
    return;
  }

  const bot = snap.docs[0].data() as BotConfig;
  if (!bot.isActive) return;
  if (!bot.instagramAccessToken) {
    console.log("❌ Missing token in bot");
    return;
  }

  let messageText = event.message.text || null;

  // IMAGE
  let imagePart = null;
  const attachment = event.message.attachments?.[0];

  if (attachment?.type === "image") {
    const imgUrl = attachment.payload.url;

    const imgRes = await fetch(imgUrl);
    const buf = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");

    imagePart = { inlineData: { mimeType: "image/jpeg", data: base64 } };
    if (!messageText)
      messageText = "📸 العميل أرسل صورة. حلّلها بأفضل طريقة.";
  }

  // AUDIO
  if (!messageText && attachment?.type === "audio") {
    const audioUrl = attachment.payload.url;
    const transcript = await transcribeAudio(audioUrl);

    messageText = transcript
      ? `🎧 نص الرسالة الصوتية:\n"${transcript}"`
      : "🎧 استلمت تسجيل صوتي لكن لم أستطع قراءته.";
  }

  if (!messageText && !imagePart) return;

  // Prepare prompt
  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);

  const model = getModel();
  const parts = [{ text: systemInstruction }];
  if (imagePart) parts.push(imagePart);
  parts.push({ text: messageText });

  const result = await model.generateContent(parts);
  const replyText = result.response.text();
  if (!replyText) return;

  // SEND REPLY
  await sendInstagramMessage(pageId, senderId, replyText, bot.instagramAccessToken);

  console.log("✅ Reply sent.");
}
