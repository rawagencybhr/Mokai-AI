import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getModel } from '@/lib/gemini';
import { sendInstagramMessage } from '@/lib/meta';
import { GENERATE_SYSTEM_INSTRUCTION } from '@/constants';
import { BotConfig } from '@/types';

// ==============================
// VERIFY WEBHOOK (GET)
// ==============================
export async function GET(req: NextRequest) {
  try {
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
    const url = new URL(req.url);

    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse("Verification failed", { status: 403 });
  } catch (err) {
    console.error("Webhook GET Error:", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}

// ==============================
// RECEIVE EVENTS (POST)
// ==============================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📩 IG Webhook:", JSON.stringify(body, null, 2));

    if (body.object === "instagram") {
      for (const entry of body.entry) {
        if (!entry.messaging) continue;

        for (const event of entry.messaging) {
          await processInstagramEvent(event);
        }
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (error) {
    console.error("Webhook POST Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// ==============================
// PROCESS EVENT
// ==============================
async function processInstagramEvent(event: any) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id; // Instagram Business ID
  const messageText = event.message?.text;

  if (!senderId || !recipientId || !messageText) return;

  // 1) Locate Bot
  const botsRef = collection(db, 'bots');
  const q = query(botsRef, where('instagramBusinessId', '==', recipientId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.warn("⚠️ No bot found for:", recipientId);
    return;
  }

  const botData = snapshot.docs[0].data() as BotConfig;
  if (!botData.isActive) return;

  // 2) Generate reply
  const instruction = GENERATE_SYSTEM_INSTRUCTION(botData, "", undefined, -1);

  let reply = "شكراً لتواصلك 🌟";

  try {
    const model = getModel();
    const result = await model.generateContent([
      { text: instruction },
      { text: messageText }
    ]);
    reply = result.response.text() || reply;
  } catch (err) {
    console.error("Gemini Error:", err);
  }

  // 3) Send reply
  if (botData.instagramAccessToken) {
    await sendInstagramMessage(
      botData.instagramBusinessId!,
      senderId,
      reply,
      botData.instagramAccessToken
    );
  }
}
