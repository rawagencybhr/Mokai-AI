// app/api/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
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

  // IGNORE EDITS
  if (event.message_edit) {
    console.log("ℹ️ IG message_edit ignored");
    return;
  }

  // IGNORE DELETES
  if (event.message_unsend) {
    console.log("ℹ️ IG message_unsend ignored");
    return;
  }

  // IGNORE REACTIONS
  if (event.reaction) {
    console.log("ℹ️ IG reaction ignored");
    return;
  }

  // IGNORE ECHOES
  if (event.message?.is_echo) {
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
  } 
  else if (event.message?.attachments?.[0]?.type === "image") {
    messageText = "User sent an image";
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

  // ===================================================
  // AI RESPONSE
  // ===================================================
  let replyText = "";

  try {
    const model = getModel();
    const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot);

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText },
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
  // SEND IG REPLY (TEST MODE: SEND USING igBusinessId)
  // ===================================================
  try {
    await sendInstagramMessage(
      igBusinessId,          // ← كما طلبت: Test Mode
      senderId,
      replyText,
      bot.instagramAccessToken
    );

  } catch (error) {
    console.error("❌ Failed sending IG reply:", error);
  }
}
