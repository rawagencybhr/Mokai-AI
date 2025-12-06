// app/api/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
import { sendInstagramMessage } from "@/lib/meta"; // تأكد من المسار الصحيح
import { BotConfig } from "@/types";

export const dynamic = "force-dynamic";

// ===================================================
// 1) VERIFY WEBHOOK (GET)
// ===================================================
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

// ===================================================
// 2) HANDLE INSTAGRAM EVENTS (POST)
// ===================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // طباعة خفيفة لتقليل الازدحام في اللوج، يمكنك تفعيل السطر التالي للفحص الكامل
    // console.log("📩 Instagram Event:", JSON.stringify(body, null, 2));

    if (body.object !== "instagram") {
      return new NextResponse("Not Instagram Event", { status: 404 });
    }

    for (const entry of body.entry ?? []) {
      if (!entry.messaging) continue;

      for (const msgEvent of entry.messaging) {
        // نمرر entry.id أيضاً لأنه غالباً يمثل الحساب التجاري
        await processEvent(entry.id, msgEvent);
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// ===================================================
// 3) PROCESS A SINGLE IG EVENT
// ===================================================
async function processEvent(entryId: string, event: any) {

  // ✅ تجاهل أحداث التعديل لتجنب أخطاء Missing Data
  if (event.message_edit) {
    console.log("ℹ️ IG message_edit ignored");
    return;
  }

  // ✅ تجاهل أحداث حذف الرسائل
  if (event.message_unsend) {
    console.log("ℹ️ IG message_unsend ignored");
    return;
  }

  // ✅ تجاهل التفاعلات (القلوب واللايكات)
  if (event.reaction) {
    console.log("ℹ️ IG reaction ignored");
    return;
  }

  // ✅ تجاهل رسائل الصدى (التي يرسلها البوت نفسه)
  if (event.message?.is_echo) {
    return;
  }

  // استخراج المعرفات
  const senderId = event.sender?.id;
  // في إنستغرام، المستلم (recipient) هو الحساب التجاري (Business Account)
  const igBusinessId = event.recipient?.id; 

  if (!senderId || !igBusinessId) {
    console.log("⚠️ Missing senderId or igBusinessId");
    return;
  }

  // ===================================================
  // EXTRACT MESSAGE CONTENT
  // ===================================================
  let messageText: string | null = null;
  
  // التعامل مع النصوص
  if (event.message?.text) {
    messageText = event.message.text;
  }
  // التعامل مع الصور (اختياري)
  else if (event.message?.attachments?.[0]?.type === 'image') {
    messageText = "User sent an image"; 
  }

  if (!messageText) {
    console.log("⚠️ Unsupported message type or empty text — skipped");
    return;
  }

  console.log(`📨 Message from ${senderId} to ${igBusinessId}: ${messageText}`);

// ===================================================
// 4) FIND BOT BY INSTAGRAM ID (BUSINESS OR PAGE)
// ===================================================
const botsRef = collection(db, "bots");

// البحث بمحاولة رقم 1 — instagramBusinessId
let botsSnapshot = await getDocs(
  query(botsRef, where("instagramBusinessId", "==", igBusinessId))
);

// لو لم نجد أي بوت
if (botsSnapshot.empty) {
  console.log(`ℹ️ No bot under instagramBusinessId ${igBusinessId}, trying instagramPageId...`);

  // محاولة رقم 2 — instagramPageId
  botsSnapshot = await getDocs(
    query(botsRef, where("instagramPageId", "==", igBusinessId))
  );
}

if (botsSnapshot.empty) {
  console.log(`❌ No bot found for ANY ID: ${igBusinessId}.`);
  return;
}

console.log("✅ Bot found!");

const botDoc = botsSnapshot.docs[0];
const bot = botDoc.data() as BotConfig;


  if (!bot.isActive) {
    console.log("⚠️ Bot is inactive");
    return;
  }

  if (!bot.instagramAccessToken) {
    console.log("❌ Missing instagramAccessToken in bot config");
    return;
  }

  // ===================================================
  // 5) AI RESOLUTION
  // ===================================================
  let replyText = "";

  try {
    const model = getModel();
    const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot);

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText }
    ]);

    replyText = result.response.text();

  } catch (error) {
    console.error("❌ Gemini Error:", error);
    return;
  }

  if (!replyText) {
    console.log("⚠️ AI reply empty");
    return;
  }

  // ===================================================
  // 6) SEND IG REPLY
  // ===================================================
  try {
    // ✅ تصحيح هام: نمرر igBusinessId (الذي يبدأ بـ 1784) وليس facebookPageId
    await sendInstagramMessage(
      igBusinessId,              // معرف الحساب الذي سيرسل الرد
      senderId,                  // معرف المستخدم المستلم
      replyText,                 // نص الرسالة
      bot.instagramAccessToken   // توكن الوصول
    );

  } catch (error) {
    console.error("❌ Failed sending IG reply:", error);
  }
}
