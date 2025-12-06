import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getModel } from "@/lib/gemini";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
import { sendInstagramMessage } from "@/lib/meta";
import { BotConfig } from "@/types";

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
// 2) HANDLE INSTAGRAM EVENTS
// ===================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📩 Instagram Webhook Event Received:\n", JSON.stringify(body, null, 2));

    if (body.object !== "instagram") {
      return new NextResponse("Not an Instagram event", { status: 404 });
    }

    for (const entry of body.entry) {
      if (!entry.messaging) continue;

      for (const event of entry.messaging) {
        await processInstagramEvent(event);
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// ===================================================
// 3) PROCESS SINGLE INSTAGRAM EVENT
// ===================================================
async function processInstagramEvent(event: any) {
  // Skip echo messages from IG
  if (event.message?.is_echo) {
    console.log("ℹ️ Skipping echo message");
    return;
  }

  // Extract sender + page ID (VERY IMPORTANT)
  const senderId = event.sender?.id;        // IG user ID
  const pageId = event.recipient?.id;       // Page ID (used for reply)

  // Extract message text
  let messageText =
    event.message?.text ??
    event.message_edit?.text ??
    null;

  if (!senderId || !pageId || !messageText) {
    console.log("⚠️ Missing data", {
      senderId,
      pageId,
      messageText,
      keys: Object.keys(event)
    });
    return;
  }

  console.log("📨 Incoming IG Message:", { senderId, pageId, messageText });

  // ===================================================
  // 4) FIND BOT BY PAGE ID
  // ===================================================
  const botsRef = collection(db, "bots");

  let querySnapshot = await getDocs(
    query(botsRef, where("instagramPageId", "==", pageId))
  );

  if (querySnapshot.empty) {
    console.log("⚠️ No bot found for pageId:", pageId);
    return;
  }

  const botDoc = querySnapshot.docs[0];
  const bot = botDoc.data() as BotConfig;

  if (!bot.isActive) {
    console.log("⚠️ Bot inactive");
    return;
  }

  if (!bot.instagramAccessToken) {
    console.log("❌ Missing page access token!");
    return;
  }

  // ===================================================
  // 5) GENERATE AI REPLY
  // ===================================================
  let replyText = "";

  try {
    const model = getModel();
    const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText }
    ]);

    replyText = result.response.text();
  } catch (err) {
    console.error("❌ Gemini Error:", err);
    return;
  }

  if (!replyText) {
    console.log("⚠️ Empty AI reply");
    return;
  }

  console.log("🤖 Generated Reply:", replyText);

  // ===================================================
  // 6) SEND MESSAGE BACK TO USER (THE MOST IMPORTANT PART)
  // ===================================================
  try {
    const sendResult = await sendInstagramMessage(
      pageId,          // MUST be page ID
      senderId,                     // IG user
      replyText,
      bot.instagramAccessToken      // PAGE TOKEN
    );

    console.log("📤 IG Reply Sent:", sendResult);

  } catch (err) {
    console.error("❌ Failed to send reply:", err);
  }
}
