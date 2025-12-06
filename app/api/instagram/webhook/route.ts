import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, or } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getModel } from '@/lib/gemini';
import { sendInstagramMessage } from '@/lib/meta';
import { GENERATE_SYSTEM_INSTRUCTION } from '@/constants';
import { BotConfig } from '@/types';

// GET - Verify Webhook
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge || '', { status: 200 });
  }
  return new NextResponse('Error validating token', { status: 403 });
}

// POST - Handle Events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📩 Webhook Received:", JSON.stringify(body, null, 2));

    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const event of entry.messaging) {
            await processInstagramEvent(event);
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

async function processInstagramEvent(event: any) {
  const senderId = event.sender?.id;
  const businessId = event.recipient?.id;
  const messageText = event.message?.text;

  if (!messageText) return;

  console.log("📥 Instagram Message Received:", messageText);

  // ---------- 1) FIND THE BOT ----------
  const botsRef = collection(db, 'bots');

  const q = query(
    botsRef,
    or(
      where('instagramBusinessId', '==', businessId),
      where('instagramUserId', '==', businessId)
    )
  );

  const botSnap = await getDocs(q);

  if (botSnap.empty) {
    console.log("⚠️ No bot found for business ID:", businessId);
    return;
  }

  const bot = botSnap.docs[0].data() as BotConfig;

  if (!bot.isActive) {
    console.log("⏸ Bot is inactive:", businessId);
    return;
  }

  // ---------- 2) GENERATE AI REPLY ----------
  try {
    const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);

    const model = getModel();
    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText }
    ]);

    const replyText = result.response.text();
    if (!replyText) return;

    console.log("🤖 AI Reply:", replyText);

    // ---------- 3) SEND INSTAGRAM MESSAGE ----------
    await sendInstagramMessage(
      businessId,
      senderId,
      replyText,
      bot.instagramAccessToken!
    );

    console.log("✅ Reply Sent Successfully");

  } catch (error) {
    console.error("Gemini Error:", error);
  }
}
