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
// 0) Google Speech Client (STT)
// ===================================
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

async function transcribeAudioFromUrl(
  audioUrl: string,
  accessToken?: string
): Promise<string | null> {
  try {
    // لو الرابط ما فيه توكن نضيفه
    const urlWithToken =
      accessToken && !audioUrl.includes("access_token=")
        ? `${audioUrl}&access_token=${accessToken}`
        : audioUrl;

    const res = await fetch(urlWithToken);
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
        encoding: "OGG_OPUS", // أغلب رسائل إنستغرام الصوتية
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

async function fetchImageAsBase64(
  imageUrl: string,
  accessToken?: string
): Promise<string | null> {
  try {
    const urlWithToken =
      accessToken && !imageUrl.includes("access_token=")
        ? `${imageUrl}&access_token=${accessToken}`
        : imageUrl;

    const res = await fetch(urlWithToken);
    if (!res.ok) {
      console.error("❌ Failed fetching image:", res.status, res.statusText);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return base64;
  } catch (err) {
    console.error("❌ Image fetch error:", err);
    return null;
  }
}

// ===================================
// 1) VERIFY TOKEN (GET)
// ===================================
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

// ===================================
// 2) HANDLE INSTAGRAM WEBHOOK (POST)
// ===================================
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

// ===================================
// 3) PROCESS ONE EVENT
// ===================================
async function processEvent(event: any) {
  console.log("EVENT KEYS =>", Object.keys(event));

  // 3.0 تجاهل أي شيء مو رسالة
  if (!event.message) {
    console.log("ℹ️ Ignored non-message event");
    return;
  }

  // تجاهل رسائل البوت نفسه (echo)
  if (event.message?.is_echo) {
    console.log("ℹ️ Echo ignored");
    return;
  }

  const senderId = event.sender?.id;
  const igBusinessId = event.recipient?.id; // 1784... IG Business Account ID

  if (!senderId || !igBusinessId) {
    console.log("⚠️ Missing sender or recipient ID");
    return;
  }

  // ===================================
  // 3.1 ابحث عن البوت من خلال instagramBusinessId أو instagramPageId
  // ===================================
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

  // IG account id اللي نستخدمه للإرسال
  const instagramAccountId = bot.instagramBusinessId || igBusinessId;

  if (!instagramAccountId) {
    console.log("❌ instagramBusinessId missing — cannot send messages");
    return;
  }

  // ===================================
  // 3.2 استخرج محتوى الرسالة: نص + صورة + صوت
  // ===================================
  let messageText: string | null = event.message?.text || null;
  let imagePart: any | null = null;

  const firstAttachment = event.message?.attachments?.[0];

  // 🖼 صورة
  if (firstAttachment?.type === "image") {
    const imageUrl = firstAttachment.payload?.url;
    console.log("🖼 Image attachment URL:", imageUrl);

    if (imageUrl) {
      const base64 = await fetchImageAsBase64(
        imageUrl,
        bot.instagramAccessToken
      );

      if (base64) {
        imagePart = {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64,
          },
        };

        if (!messageText) {
          messageText =
            "الصورة مرفقة مع الرسالة، حلّلها وساعد العميل بأفضل طريقة حسب بيانات المتجر.";
        }
      }
    }
  }

  // 🎧 صوت
  if (!messageText && firstAttachment?.type === "audio") {
    const audioUrl = firstAttachment.payload?.url;
    console.log("🎧 Audio attachment URL:", audioUrl);

    if (audioUrl) {
      const transcript = await transcribeAudioFromUrl(
        audioUrl,
        bot.instagramAccessToken
      );
      if (transcript) {
        messageText = `العميل أرسل تسجيل صوتي، وهذا نصه التقريبي:\n"${transcript}"`;
      } else {
        messageText =
          "📢 استلمت تسجيل صوتي من العميل لكن ما قدرت أقرأه بدقة. اطلب منه بلطف يكتب سؤاله نص.";
      }
    }
  }

  if (!messageText && !imagePart) {
    console.log("⚠️ Empty message (no supported text/image/audio)");
    return;
  }

  console.log(
    `📨 Message from ${senderId} to ${igBusinessId}: ${messageText || "[image/voice only]"}`
  );

  // ===================================
  // 3.3 حضّر الـ System Instruction
  // ===================================
  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(
    bot,        // إعدادات البوت وبيانات المتجر
    "",         // dynamicContext – تقدر تربطها بلوحة التحكم لاحقاً
    undefined,  // userProfile – ما نستخدمه حالياً في إنستغرام
    -1          // اعتبرها بداية جلسة جديدة (عشان الترحيب)
  );

  // ===================================
  // 3.4 استدعاء Gemini مع نص + صورة (لو فيه)
  // ===================================
  let replyText = "";

  try {
    const model = getModel();

    const parts: any[] = [
      { text: systemInstruction },
    ];

    if (imagePart) {
      parts.push(imagePart);
    }

    if (messageText) {
      parts.push({ text: messageText });
    }

    const result = await model.generateContent(parts);
    replyText = result.response.text();
  } catch (err) {
    console.error("❌ AI Error:", err);
    return;
  }

  if (!replyText) {
    console.log("⚠️ AI returned empty reply");
    return;
  }

  // ===================================
  // 3.5 أرسل الرد للعميل في إنستغرام
  // ===================================
  try {
    console.log("📤 Sending reply via IG Account ID:", instagramAccountId);

    await sendInstagramMessage(
      instagramAccountId,          // معرّف حساب إنستغرام للأعمال (1784...)
      senderId,                    // العميل
      replyText,
      bot.instagramAccessToken
    );

    console.log("✅ Reply sent successfully");
  } catch (err) {
    console.error("❌ Failed sending reply:", err);
  }
}
