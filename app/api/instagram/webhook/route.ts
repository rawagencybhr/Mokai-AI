import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getModel } from "@/lib/gemini";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
import { sendInstagramMessage } from "@/lib/meta";
import { BotConfig } from "@/types";

// ------------------------
// 1) VERIFY WEBHOOK
// ------------------------
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Invalid token", { status: 403 });
}

// ------------------------
// 2) HANDLE INSTAGRAM EVENTS
// ------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📩 Instagram Webhook Event Received:", JSON.stringify(body, null, 2));

    if (body.object !== "instagram") {
      return new NextResponse("Not Instagram", { status: 404 });
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
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// ------------------------
// 3) PROCESS INSTAGRAM MESSAGE
// ------------------------
async function processInstagramEvent(event: any) {
  const senderId = event.sender?.id;
  const businessId = event.recipient?.id;
  const messageText = event.message?.text;

  if (!messageText || !businessId) {
    console.log("⚠️ No message text or businessId");
    return;
  }

  console.log("📨 Incoming IG Message:", { senderId, businessId, messageText });

  // 1) Find bot in Firestore
  const botsRef = collection(db, "bots");
  const q = query(botsRef, where("instagramBusinessId", "==", businessId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("⚠️ NO BOT FOUND FOR BUSINESS ID:", businessId);
    return;
  }

  const botDoc = querySnapshot.docs[0];
  const bot = botDoc.data() as BotConfig;

  if (!bot.isActive) {
    console.log("⚠️ Bot is inactive");
    return;
  }

  // 2) Generate reply using Gemini
  const model = getModel();
  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);

  let replyText = "";
  try {
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
    console.log("⚠️ No reply generated");
    return;
  }

  console.log("🤖 Generated Reply:", replyText);

  // 3) Send reply via Meta API
  try {
    const sendResult = await sendInstagramMessage(
      businessId,
      senderId,
      replyText,
      bot.instagramAccessToken!
    );

    console.log("📤 Instagram Send Result:", sendResult);
  } catch (err) {
    console.error("❌ Error sending IG message:", err);
  }
}
