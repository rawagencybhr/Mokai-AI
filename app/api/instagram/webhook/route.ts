// app/api/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { sendInstagramMessage } from "@/lib/meta";
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

    if (body.object !== "instagram") {
      return new NextResponse("Not Instagram Event", { status: 404 });
    }

    for (const entry of body.entry ?? []) {
      if (!entry.messaging) continue;

      for (const msgEvent of entry.messaging) {
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
// 3) PROCESS EVENT
// ===================================================
async function processEvent(entryId: string, event: any) {
  console.log("EVENT KEYS =>", Object.keys(event));

  // ===================================================
  // IGNORE NON-MESSAGE EVENTS (IMPORTANT!)
  // ===================================================
  if (!event.message) {
    console.log("ℹ️ Ignored non-message event:", Object.keys(event));
    return;
  }

  // IGNORE ECHOES (رسائل البوت نفسه)
  if (event.message?.is_echo) {
    console.log("ℹ️ Echo message ignored");
    return;
  }

  // ===================================================
  // EXTRACT IDs
  // ===================================================
  const senderId = event.sender?.id;
  const igBusinessId = event.recipient?.id;

  if (!senderId || !igBusinessId) {
    console.log("⚠️ Missing senderId or igBusinessId", { senderId, igBusinessId });
    return;
  }

  // ===================================================
  // EXTRACT MESSAGE CONTENT
  // ===================================================
  let messageText: string | null = null;

  if (event.message?.text) {
    messageText = event.message.text;
  } else if (event.message?.attachments?.[0]?.type === "image") {
    messageText = "📷 تم استلام صورة من العميل.";
  }

  if (!messageText) {
    console.log("⚠️ Could not extract message text");
    return;
  }

  console.log(`📨 Message from ${senderId} to ${igBusinessId}: ${messageText}`);

  // ===================================================
  // FIND BOT (BUSINESS ID OR PAGE ID)
  // ===================================================
  const botsRef = collection(db, "bots");

  let botsSnapshot = await getDocs(
    query(botsRef, where("instagramBusinessId", "==", igBusinessId))
  );

  if (botsSnapshot.empty) {
    console.log(`ℹ️ No bot under instagramBusinessId ${igBusinessId}, trying instagramPageId...`);
    botsSnapshot = await getDocs(
      query(botsRef, where("instagramPageId", "==", igBusinessId))
    );
  }

  if (botsSnapshot.empty) {
    console.log(`❌ No bot found for ANY ID: ${igBusinessId}`);
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
    console.log("❌ Missing instagramAccessToken");
    return;
  }

  if (!bot.facebookPageId) {
    console.log("❌ Missing facebookPageId — required in LIVE mode");
    return;
  }

  // ===================================================
  // 4) AI RESPONSE (بدون GENERATE_SYSTEM_INSTRUCTION)
  // ===================================================
  let replyText = "";

  try {
    const model = getModel();

    const systemInstruction =
      "أنت مساعد ذكي للرد على عملاء متجر عبر رسائل إنستغرام. " +
      "رد بالعربية بشكل مهذب، مختصر، وواضح، وحاول أن تكون خدمياً وتطلب التوضيح عند الحاجة.";

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
  // 5) SEND IG REPLY — PRODUCTION (PAGE_ID IS REQUIRED)
  // ===================================================
  try {
    console.log(`📤 Sending reply via PAGE ID: ${bot.facebookPageId}`);

    await sendInstagramMessage(
      bot.facebookPageId,      // ✅ هذا الصحيح في LIVE MODE
      senderId,
      replyText,
      bot.instagramAccessToken
    );

    console.log("✅ Reply sent!");

  } catch (error) {
    console.error("❌ Failed sending IG reply:", error);
  }
}
