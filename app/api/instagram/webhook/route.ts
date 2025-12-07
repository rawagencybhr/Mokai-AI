import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GENERATE_SYSTEM_INSTRUCTION } from "@/constants";
import { sendInstagramMessage } from "@/lib/meta";
import { BotConfig } from "@/types";
import { generateInstagramSmartReply } from "@/services/instagramSmartReply";

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

  // Extract message text (handle edit-only events with no text)
  let messageText = event.message?.text ?? null;
  const isEditEvent = !!event.message_edit && !event.message?.text;

  if (!senderId || !pageId) {
    console.log("⚠️ Missing data", {
      senderId,
      pageId,
      messageText: messageText ?? null,
      keys: Object.keys(event)
    });
    return;
  }

  console.log("📨 Incoming IG Message:", { senderId, pageId, messageText });

  // ===================================================
  // 4) FIND BOT BY KNOWN IG IDENTIFIERS
  // ===================================================
  const botsRef = collection(db, "bots");

  const tryFetch = async (field: keyof BotConfig, value: string) => {
    try {
      const snap = await getDocs(query(botsRef, where(field as string, "==", value)) as any);
      return snap;
    } catch {
      return { empty: true, docs: [] } as any;
    }
  };

  let botSnap = await tryFetch("instagramPageId", pageId);
  if (botSnap.empty) botSnap = await tryFetch("instagramBusinessId", pageId);
  if (botSnap.empty) botSnap = await tryFetch("facebookPageId", pageId);
  if (botSnap.empty) botSnap = await tryFetch("instagramUserId", pageId);

  if (botSnap.empty) {
    console.log("⚠️ No bot found for IG identifier:", pageId);
    return;
  }

  const botDoc = botSnap.docs[0];
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
  // 5) GENERATE SMART REPLY WITH SAFE FALLBACK
  // ===================================================
  const fallbackReply = `شكراً لتواصلك مع ${bot.storeName}. كيف نقدر نخدمك؟`;
  let replyText = fallbackReply;
  let useFallback = true;

  if (messageText && !isEditEvent) {
    const smart = await generateInstagramSmartReply(
      bot.id,
      messageText,
      fallbackReply,
      {
        userProfile: undefined,
        history: [],
      }
    );
    replyText = smart.reply || fallbackReply;
    useFallback = smart.useFallback;
  } else {
    replyText = fallbackReply;
    useFallback = true;
  }

  console.log("🤖 IG Reply:", { replyText, useFallback, isEditEvent });

  // ===================================================
  // 6) SEND MESSAGE BACK TO USER (THE MOST IMPORTANT PART)
  // ===================================================
  try {
    const accountId = bot.instagramBusinessId || bot.instagramPageId || bot.facebookPageId || pageId;
    const sendResult = await sendInstagramMessage(
      accountId,
      senderId,
      replyText,
      bot.instagramAccessToken
    );

    console.log("📤 IG Reply Sent:", sendResult);

  } catch (err) {
    console.error("❌ Failed to send reply:", err);
  }
}
