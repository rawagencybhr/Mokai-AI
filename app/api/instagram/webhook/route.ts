import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
import { sendInstagramMessage } from "@/lib/meta";
import { BotConfig } from "@/types";

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
// 2) HANDLE INSTAGRAM EVENTS
// ===================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📩 Instagram Webhook Event Received:\n", JSON.stringify(body, null, 2));

    if (body.object !== "instagram") {
      return new NextResponse("Not Instagram Event", { status: 404 });
    }

    for (const entry of body.entry) {
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

  // Skip echo messages
  if (event.message?.is_echo) {
    console.log("ℹ️ Skipping echo event.");
    return;
  }

  const senderId = event.sender?.id;
  const igBusinessId = event.recipient?.id; // VERY IMPORTANT — IG business ID

  if (!senderId || !igBusinessId) {
    console.log("⚠️ Missing senderId or recipient IG ID", event);
    return;
  }

  let messageType = "unknown";
  let messageText = null;
  let imageUrl = null;

  // TEXT
  if (event.message?.text) {
    messageText = event.message.text;
    messageType = "text";
  }

  // IMAGE
  if (event.message?.attachments?.[0]?.payload?.url) {
    imageUrl = event.message.attachments[0].payload.url;
    messageType = "image";
  }

  // EDITED MESSAGE
  if (event.message_edit) {
    console.log("ℹ️ Edit event — skipped.");
    return;
  }

  // UNSEND MESSAGE
  if (event.message_unsend) {
    console.log("ℹ️ Unsend event — skipped.");
    return;
  }

  // NO MESSAGE CONTENT
  if (!messageText && !imageUrl) {
    console.log("⚠️ Unsupported message type — skip.");
    return;
  }

  console.log("📨 Incoming IG Message:", { senderId, igBusinessId, messageText, imageUrl });

  // ===================================================
  // 4) FIND BOT BY INSTAGRAM BUSINESS ID
  // ===================================================
  const botsRef = collection(db, "bots");
  const botsSnapshot = await getDocs(query(botsRef, where("instagramPageId", "==", igBusinessId)));

  if (botsSnapshot.empty) {
    console.log("⚠️ No bot found for IG Business ID:", igBusinessId);
    return;
  }

  const botDoc = botsSnapshot.docs[0];
  const bot = botDoc.data() as BotConfig;

  if (!bot.isActive) {
    console.log("⚠️ Bot inactive");
    return;
  }

  if (!bot.instagramAccessToken) {
    console.log("❌ Missing Instagram page token!");
    return;
  }

  // ===================================================
  // 5) AI RESPONSE
  // ===================================================
  const inputText = messageText || "[User sent an image]";

  let replyText = "";
  try {
    const model = getModel();
    const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot);

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: inputText }
    ]);

    replyText = result.response.text();

  } catch (error) {
    console.error("❌ Gemini Error:", error);
    return;
  }

  if (!replyText) {
    console.log("⚠️ Empty AI reply");
    return;
  }

  console.log("🤖 Generated Reply:", replyText);

  // ===================================================
  // 6) SEND IG REPLY
  // ===================================================
  try {
    const sent = await sendInstagramMessage(
  bot.facebookPageId,   // ✔ يجب إرسال الرسالة باستخدام Facebook Page ID
  senderId,
  replyText,
  bot.instagramAccessToken
);


    console.log("📤 IG Reply Sent:", sent);

  } catch (error) {
    console.error("❌ Failed sending IG reply:", error);
  }
}
