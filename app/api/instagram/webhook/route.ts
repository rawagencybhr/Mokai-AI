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

// ==============================
// 0) Google Speech Client (STT)
// ==============================
let speechClient: SpeechClient | null = null;

function getSpeechClient() {
  if (!speechClient) {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) {
      throw new Error("❌ Missing GOOGLE_APPLICATION_CREDENTIALS_JSON env");
    }
    const credentials = JSON.parse(raw);
    speechClient = new SpeechClient({
      credentials,
      projectId: credentials.project_id,
    });
  }
  return speechClient!;
}

async function transcribeAudioFromUrl(audioUrl: string): Promise<string | null> {
  try {
    const res = await fetch(audioUrl);
    if (!res.ok) {
      console.error("❌ Failed fetching audio:", res.status, res.statusText);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const audioBytes = Buffer.from(arrayBuffer).toString("base64");

    const client = getSpeechClient();

    const [response] = await client.recognize({
      audio: { content: audioBytes },
      config: {
        // أغلب تسجيلات إنستغرام تكون OGG/OPUS – لو اختلفت عندك ممكن تعدّلها لاحقاً
        encoding: "OGG_OPUS",
        languageCode: "ar-SA",
      },
    });

    const transcript =
      response.results?.[0]?.alternatives?.[0]?.transcript || null;

    console.log("🎧 STT Transcript:", transcript);
    return transcript;
  } catch (err) {
    console.error("❌ STT Error:", err);
    return null;
  }
}

// ==============================
// 1) VERIFY TOKEN (GET)
// ==============================
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Invalid verify token", { status: 403 });
}

// ==============================
// 2) HANDLE INSTAGRAM WEBHOOK (POST)
// ==============================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "instagram") {
      return new NextResponse("Not Instagram Event", { status: 404 });
    }

    for (const entry of body.entry ?? []) {
      if (!entry.messaging) continue;

      for (const msgEvent of entry.messaging) {
        await processEvent(msgEvent);
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// ==============================
// 3) PROCESS INDIVIDUAL EVENT
// ==============================
async function processEvent(event: any) {
  console.log("EVENT KEYS =>", Object.keys(event));

  // Ignore anything not a message
  if (!event.message) {
    console.log("ℹ️ Ignored non-message event");
    return;
  }

  // Ignore echo (messages sent by bot)
  if (event.message?.is_echo) {
    console.log("ℹ️ Echo ignored");
    return;
  }

  const senderId = event.sender?.id;
  const igBusinessId = event.recipient?.id;

  if (!senderId || !igBusinessId) {
    console.log("⚠️ Missing sender or recipient ID");
    return;
  }

  // ==============================
  // 3.1 Extract message content
  // ==============================
  let messageText: string | null = event.message?.text || null;

  const firstAttachment = event.message?.attachments?.[0];

  // صورة
  if (!messageText && firstAttachment?.type === "image") {
    messageText =
      "📷 تم استلام صورة من العميل. حلل الصورة وساعده باللي يخدمه حسب بيانات المتجر.";
  }

  // صوت
  if (!messageText && firstAttachment?.type === "audio") {
    const audioUrl = firstAttachment.payload?.url;
    console.log("🎧 Audio attachment URL:", audioUrl);

    if (audioUrl) {
      const transcript = await transcribeAudioFromUrl(audioUrl);
      if (transcript) {
        messageText = `العميل أرسل تسجيل صوتي، وهذا نصه التقريبي:\n"${transcript}"`;
      } else {
        messageText =
          "📢 استلمت تسجيل صوتي من العميل لكن ما قدرت أقرأه بدقة. اطلب منه بلطف يكتب سؤاله نص.";
      }
    }
  }

  if (!messageText) {
    console.log("⚠️ Empty message (no text/image/audio supported)");
    return;
  }

  console.log(`📨 Message from ${senderId} to ${igBusinessId}: ${messageText}`);

  // ==============================
  // 3.2 Search bot in Firestore
  // ==============================
  const botsRef = collection(db, "bots");

  let botsSnap = await getDocs(
    query(botsRef, where("instagramBusinessId", "==", igBusinessId))
  );

  if (botsSnap.empty) {
    botsSnap = await getDocs(
      query(botsRef, where("instagramPageId", "==", igBusinessId))
    );
  }

  if (botsSnap.empty) {
    console.log("❌ No bot matches this IG account");
    return;
  }

  const bot = botsSnap.docs[0].data() as BotConfig;

  if (!bot.isActive) {
    console.log("⚠️ Bot inactive");
    return;
  }

  if (!bot.instagramAccessToken) {
    console.log("❌ Missing instagramAccessToken");
    return;
  }

  const pageId = bot.instagramPageId;
  if (!pageId) {
    console.log("❌ instagramPageId missing — cannot send messages");
    return;
  }

  // ==============================
  // 3.3 Generate smart system instruction
  // ==============================
  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(
    bot,        // إعدادات البوت (تحتوي بيانات المتجر + اللهجة + النبرة...)
    "",         // dynamicContext (تقدر تربطه لاحقاً من لوحة التحكم)
    undefined,  // userProfile (غير مستخدم حالياً في إنستغرام)
    -1          // اعتبره دائماً بداية جلسة جديدة من ناحية الترحيب
  );

  // ==============================
  // 3.4 AI reply using Gemini
  // ==============================
  let replyText = "";

  try {
    const model = getModel();

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText }
    ]);

    replyText = result.response.text();
  } catch (err) {
    console.error("❌ AI Error:", err);
    return;
  }

  if (!replyText) {
    console.log("⚠️ AI returned empty reply");
    return;
  }

  // ==============================
  // 3.5 Send reply back to IG user
  // ==============================
  try {
    console.log("📤 Sending reply using PAGE ID:", pageId);

    await sendInstagramMessage(
      pageId,              // Facebook Page ID
      senderId,            // Customer ID
      replyText,
      bot.instagramAccessToken
    );

    console.log("✅ Reply sent successfully");
  } catch (err) {
    console.error("❌ Failed sending reply:", err);
  }
}
