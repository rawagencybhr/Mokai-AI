// app/api/whatsapp/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { BotConfig } from "@/types";

// دالة إرسال واتساب
async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string, token: string) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    })
  });
}

export const dynamic = "force-dynamic";

// ===================================================
// 1) VERIFY WEBHOOK
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

        // ignore statuses
        if (value.statuses) continue;

        const messages = value.messages;
        if (!messages || messages.length === 0) continue;

        const msg = messages[0];

        await processWhatsAppMessage(value, msg);
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ WhatsApp Webhook Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// ===================================================
// 3) PROCESS INCOMING WA MESSAGE
// ===================================================
async function processWhatsAppMessage(value: any, message: any) {

  console.log("🔥 WhatsApp EVENT KEYS =>", Object.keys(message));

  const from = message.from; // رقم العميل
  const phoneNumberId = value.metadata?.phone_number_id;

  if (!from || !phoneNumberId) {
    console.log("⚠️ Missing phone_number_id or from");
    return;
  }

  let messageText: string | null = null;

  if (message.type === "text") {
    messageText = message.text?.body;
  } else if (message.type === "image") {
    messageText = "📷 تم استلام صورة عبر واتساب";
  }

  if (!messageText) {
    console.log("⚠️ No usable text in WA message");
    return;
  }

  console.log(`📨 WhatsApp Message from ${from}: ${messageText}`);

  // ===================================================
  // LOOKUP BOT BY phoneNumberId
  // ===================================================
  const botsRef = collection(db, "bots");

  const botsSnapshot = await getDocs(
    query(botsRef, where("whatsappPhoneId", "==", phoneNumberId))
  );

  if (botsSnapshot.empty) {
    console.log("❌ No bot found matching whatsappPhoneId:", phoneNumberId);
    return;
  }

  const bot = botsSnapshot.docs[0].data() as BotConfig;

  // ===================================================
  // LISTEN MODE — WITHOUT REPLY
  // ===================================================
  if (bot.isListeningOnly) {
    console.log("🔇 Bot is in LISTEN MODE — no replies will be sent");
    return;
  }

  if (!bot.isActive) {
    console.log("⚠️ Bot inactive");
    return;
  }

  if (!bot.whatsappAccessToken) {
    console.log("❌ Missing whatsappAccessToken in DB");
    return;
  }

  // ===================================================
  // GENERATE AI REPLY
  // ===================================================
  let replyText = "";

  try {
    const model = getModel();

    const systemInstruction =
      "أنت مساعد ذكي للرد على العملاء عبر رسائل واتساب. " +
      "اكتب باحترافية، باختصار، وبأسلوب لطيف.";

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText }
    ]);

    replyText = result.response.text();

  } catch (err) {
    console.log("❌ Gemini Error:", err);
    return;
  }

  if (!replyText) {
    console.log("⚠️ AI returned empty reply");
    return;
  }

  // ===================================================
  // SEND WHATSAPP MESSAGE
  // ===================================================
  try {
    console.log("📤 Sending WhatsApp reply...");
    await sendWhatsAppMessage(
      phoneNumberId,
      from,
      replyText,
      bot.whatsappAccessToken
    );

    console.log("✅ WhatsApp Reply Sent!");

  } catch (err) {
    console.error("❌ Failed sending WA reply:", err);
  }
}
