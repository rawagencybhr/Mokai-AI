import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getModel } from "@/lib/gemini";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
import { sendInstagramMessage } from "@/lib/meta";
import { BotConfig } from "@/types";


// ================================
// 1) VERIFY WEBHOOK
// ================================
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



// ================================
// 2) HANDLE INSTAGRAM WEBHOOK EVENTS
// ================================
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



// ================================
// 3) PROCESS EACH INSTAGRAM MESSAGE
// ================================
async function processInstagramEvent(event: any) {

  const senderId = event.sender?.id;
  const businessId = event.recipient?.id;

  const messageText =
    event.message?.text ??
    event.message_edit?.text ??
    null;

  if (!messageText || !senderId || !businessId) {
    console.log("⚠️ Missing sender/message/businessId");
    return;
  }

  console.log("📨 Incoming IG Message:", { senderId, businessId, messageText });


  // Lookup bot config in Firestore
  const botsRef = collection(db, "bots");
  const q = query(botsRef, where("instagramBusinessId", "==", businessId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("⚠️ No bot found for businessId:", businessId);
    return;
  }

  const botDoc = querySnapshot.docs[0];
  const bot = botDoc.data() as BotConfig;

  if (!bot.isActive) {
    console.log("⚠️ Bot is not active");
    return;
  }

  if (!bot.instagramPageId) {
    console.log("❌ Bot missing instagramPageId — cannot send messages!");
    return;
  }

  // AI Reply using Gemini
  const model = getModel();
  let replyText = "";

  try {
    const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);
    const response = await model.generateContent([
      { text: systemInstruction },
      { text: messageText }
    ]);
    replyText = response.response.text();

  } catch (err) {
    console.error("❌ Gemini Error:", err);
    return;
  }

  if (!replyText) {
    console.log("⚠️ Gemini generated empty reply");
    return;
  }

  console.log("🤖 Generated Reply:", replyText);


  // SEND MESSAGE BACK TO IG USER
  try {
    const result = await sendInstagramMessage(
      bot.instagramPageId,   // ⬅️ MUST BE PAGE ID, NOT businessId
      senderId,
      replyText,
      bot.instagramAccessToken!
    );

    console.log("📤 Instagram Send Result:", result);

  } catch (err) {
    console.error("❌ Sending IG Message Failed:", err);
  }
}
