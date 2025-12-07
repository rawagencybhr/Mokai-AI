// app/api/whatsapp/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { BotConfig } from "@/types";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants"; // تأكد من المسار إذا كان مختلف

export const dynamic = "force-dynamic";

// ===================================================
// 1) VERIFY WEBHOOK (GET) — نفس إنستقرام
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
// 2) HANDLE WHATSAPP EVENTS (POST)
// ===================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("Not WhatsApp Event", { status: 404 });
    }

    for (const entry of body.entry ?? []) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        const value = change.value;
        const messages = value.messages;

        // تجاهل الـ statuses وغيره
        if (!messages || messages.length === 0) continue;

        for (const msg of messages) {
          await processWhatsAppMessage(value, msg);
        }
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ WhatsApp Webhook Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// ===================================================
// 3) SEND WHATSAPP MESSAGE HELPER
// ===================================================
async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string,
  token: string
) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("❌ WhatsApp send error:", err);
  }
}

// ===================================================
// 4) PROCESS A SINGLE WHATSAPP MESSAGE
// ===================================================
async function processWhatsAppMessage(value: any, message: any) {
  console.log("🔥 WA EVENT KEYS =>", Object.keys(message));

  const from = message.from; // رقم العميل (بصيغة E.164 مثل 9665...)
  const phoneNumberId = value.metadata?.phone_number_id;

  if (!from || !phoneNumberId) {
    console.log("⚠️ Missing from or phone_number_id", { from, phoneNumberId });
    return;
  }

  // ===================================================
  // EXTRACT TEXT
  // ===================================================
  let messageText: string | null = null;

  if (message.type === "text") {
    messageText = message.text?.body;
  } else if (message.type === "image") {
    messageText = "📷 تم استلام صورة عبر واتساب.";
  }

  if (!messageText) {
    console.log("⚠️ No usable text found in WA message");
    return;
  }

  console.log(`📨 WhatsApp message from ${from}: ${messageText}`);

  // ===================================================
  // FIND BOT BY WHATSAPP PHONE NUMBER ID
  // ===================================================
  const botsRef = collection(db, "bots");

  const botsSnapshot = await getDocs(
    query(botsRef, where("whatsappPhoneNumberId", "==", phoneNumberId))
  );

  if (botsSnapshot.empty) {
    console.log("❌ No bot found for whatsappPhoneNumberId:", phoneNumberId);
    return;
  }

  console.log("✅ Bot Found for WhatsApp!");

  const botDoc = botsSnapshot.docs[0];
  const bot = botDoc.data() as BotConfig;

  // وضع الاستماع فقط (يسجل المحادثة بدون رد)
  if (bot.isListening) {
    console.log("🔇 Bot in LISTEN mode — no reply will be sent");
    return;
  }

  if (!bot.isActive) {
    console.log("⚠️ Bot inactive");
    return;
  }

  if (!bot.whatsappAccessToken) {
    console.log("❌ Missing whatsappAccessToken");
    return;
  }

  // ===================================================
  // GENERATE AI REPLY USING SAME SETTINGS LOGIC
  // ===================================================
  let replyText = "";

  try {
    const model = getModel();

    // نستخدم نفس العقل (GENERATE_SYSTEM_INSTRUCTION) اللي تستخدمه في الشات
    const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(
      bot,
      "",          // dynamicContext حالياً فاضي
      undefined,   // userProfile غير متوفر هنا
      -1           // نعتبرها أول رسالة (تقدر تطورها لاحقاً)
    );

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText },
    ]);

    replyText = result.response.text();
  } catch (error) {
    console.error("❌ Gemini Error (WA):", error);
    return;
  }

  if (!replyText) {
    console.log("⚠️ AI returned empty reply");
    return;
  }

  // ===================================================
  // SEND WHATSAPP REPLY
  // ===================================================
  try {
    console.log("📤 Sending WhatsApp reply...");

    await sendWhatsAppMessage(
      phoneNumberId,
      from,
      replyText,
      bot.whatsappAccessToken
    );

    console.log("✅ WhatsApp reply sent!");

  } catch (error) {
    console.error("❌ Failed sending WA reply:", error);
  }
}
