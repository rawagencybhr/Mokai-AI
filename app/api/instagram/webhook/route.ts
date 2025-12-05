import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getModel, MODEL_NAME } from '@/lib/gemini';
import { sendInstagramMessage } from '@/lib/meta';
import { GENERATE_SYSTEM_INSTRUCTION } from '@/constants';
import { BotConfig } from '@/types';

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

// Events (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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
  const senderId = event.sender.id;
  const recipientId = event.recipient.id; // Instagram Business ID
  const messageText = event.message?.text;

  if (!messageText) return;

  // 1. Find Bot by Instagram Business ID
  const botsRef = collection(db, 'bots');
  const q = query(botsRef, where('instagramBusinessId', '==', recipientId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) return;

  const botDoc = querySnapshot.docs[0];
  const bot = botDoc.data() as BotConfig;

  if (!bot.isActive) return;

  // 2. Generate Reply
  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);
  
  try {
    const model = getModel();
    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText }
    ]);
    const replyText = result.response.text();
    if (!replyText) return;

    // 3. Send Reply
    if (bot.instagramAccessToken) {
        await sendInstagramMessage(bot.instagramBusinessId!, senderId, replyText, bot.instagramAccessToken);
    }
  } catch (error) {
    console.error('Gemini Error:', error);
  }
}
