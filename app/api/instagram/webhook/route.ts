// app/api/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { getModel } from "@/lib/gemini";
import { sendInstagramMessage } from "@/lib/meta";
import { BotConfig } from "@/types";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";


export const dynamic = "force-dynamic";

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

async function processEvent(entryId: string, event: any) {
  console.log("EVENT KEYS =>", Object.keys(event));

  // Ignore anything not a message
  if (!event.message) {
    console.log("ℹ️ Ignored non-message event");
    return;
  }

  // Ignore echo (messages sent by bot)
  if (event.message?.is_echo) {
    console.log("ℹ️ Echo ignored");
    return;
  }

  const senderId = event.sender?.id;
  const igBusinessId = event.recipient?.id;

  if (!senderId || !igBusinessId) {
    console.log("⚠️ Missing sender or recipient ID");
    return;
  }

  // Extract message content
  let messageText = event.message?.text || null;

  if (!messageText && event.message?.attachments?.[0]?.type === "image") {
    messageText = "📷 تم استلام صورة من العميل.";
  }

  if (!messageText) {
    console.log("⚠️ Empty message");
    return;
  }

  console.log(`📨 Message from ${senderId} to ${igBusinessId}: ${messageText}`);

  // Search bot
  const botsRef = collection(db, "bots");

  let botsSnap = await getDocs(
    query(botsRef, where("instagramBusinessId", "==", igBusinessId))
  );

  if (botsSnap.empty) {
    botsSnap = await getDocs(
      query(botsRef, where("instagramPageId", "==", igBusinessId))
    );
  }

  if (botsSnap.empty) {
    console.log("❌ No bot matches this IG account");
    return;
  }

  const bot = botsSnap.docs[0].data() as BotConfig;

  if (!bot.isActive) {
    console.log("⚠️ Bot inactive");
    return;
  }

  if (!bot.instagramAccessToken) {
    console.log("❌ Missing instagramAccessToken");
    return;
  }

  // ⚠️ IMPORTANT!!!
  // instagramPageId = facebookPageId (in your Firestore structure)
  const pageId = bot.instagramPageId;

  if (!pageId) {
    console.log("❌ instagramPageId missing — cannot send messages");
    return;
  }

  // Generate reply
  let replyText = "";

try {
  const model = getModel();

  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(
    bot as any,                        // إعدادات البوت من Firestore
    (bot as any).dynamicContext ?? "", // لو عندك هذا الحقل
    undefined,                         // userProfile (حالياً مو مستخدم)
    -1,                                // اعتبرها جلسة جديدة دائماً في إنستغرام
    (bot as any).personalityLevel ?? 0.5,
    (bot as any).emojiMode ?? true,
    (bot as any).customInstructions ?? "",
    (bot as any).merchantData ?? "",
    (bot as any).dialect ?? "kh"
  );

  const result = await model.generateContent([
    { text: systemInstruction },
    { text: messageText }
  ]);

  replyText = result.response.text();

} catch (err) {
  console.error("❌ AI Error:", err);
  return;
}

  if (!replyText) {
    console.log("⚠️ AI returned empty reply");
    return;
  }

  // Send reply using PAGE ID
  try {
    console.log("📤 Sending reply using PAGE ID:", pageId);

    await sendInstagramMessage(
      pageId,              // ← This is the Facebook Page ID
      senderId,
      replyText,
      bot.instagramAccessToken
    );

    console.log("✅ Reply sent successfully");

  } catch (err) {
    console.error("❌ Failed sending reply:", err);
  }
}
