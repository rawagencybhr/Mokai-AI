
import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getModel, MODEL_NAME } from '@/lib/gemini';
import { sendWhatsAppMessage } from '@/lib/meta';
import { GENERATE_SYSTEM_INSTRUCTION } from '@/constants';
import { BotConfig } from '@/types';

// Verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // We reuse the same verify token for simplicity, or you can add a separate env var
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// Events (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
            if (change.value.messages) {
                for (const message of change.value.messages) {
                    await processWhatsAppMessage(message, change.value.metadata.phone_number_id);
                }
            }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }
    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

async function processWhatsAppMessage(message: any, phoneNumberId: string) {
  // Extract details
  const from = message.from; // User's phone number
  const messageText = message.text?.body;

  if (!messageText) return; // Only process text for now

  // 1. Find Bot by WhatsApp Phone Number ID
  const botsRef = collection(db, 'bots');
  const q = query(botsRef, where('whatsappPhoneNumberId', '==', phoneNumberId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
      console.log(`No bot found for WhatsApp Phone ID: ${phoneNumberId}`);
      return;
  }

  const botDoc = querySnapshot.docs[0];
  const bot = botDoc.data() as BotConfig;

  if (!bot.isActive) return;

  // CHECK: Listening Mode
  if (bot.isListening) {
      console.log(`Bot ${bot.botName} (WhatsApp) is in Listening Mode.`);
      return;
  }

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

    // 3. Send Reply via WhatsApp API
    if (bot.whatsappAccessToken) {
        await sendWhatsAppMessage(bot.whatsappPhoneNumberId!, from, replyText, bot.whatsappAccessToken);
    }
  } catch (error) {
    console.error('Gemini/WhatsApp Error:', error);
  }
}
