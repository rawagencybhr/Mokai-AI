


import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GENERATE_SYSTEM_INSTRUCTION } from '@/constants';

export default async function handler(request: Request) {
  const url = new URL(request.url);

  // --- GET Request: Webhook Verification ---
  if (request.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // --- POST Request: Event Notification ---
  if (request.method === 'POST') {
    try {
      const body = await request.json();

      if (body.object === 'instagram') {
        for (const entry of body.entry) {
          // Iterate over messaging events
          if (entry.messaging) {
            for (const event of entry.messaging) {
               await processInstagramEvent(event);
            }
          }
        }
        return new Response('EVENT_RECEIVED', { status: 200 });
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Webhook Error:', error);
      return new Response('Internal Error', { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}

async function processInstagramEvent(event: any) {
  const senderId = event.sender.id;
  const recipientId = event.recipient.id; // This is the Instagram Business ID (Our Bot)
  const messageText = event.message?.text;

  if (!messageText) return; // Ignore non-text messages for now

  // 1. Find the Bot responsible for this Instagram Business Account
  const botsRef = collection(db, 'bots');
  const q = query(botsRef, where('instagramBusinessId', '==', recipientId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log(`No bot found for Instagram ID: ${recipientId}`);
    return;
  }

  const botDoc = querySnapshot.docs[0];
  const bot = botDoc.data() as any;

  if (!bot.isActive) {
    console.log(`Bot ${bot.botName} is inactive.`);
    return;
  }

  // 2. Generate Gemini Response
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.API_KEY || "DUMMY_KEY");
  
  // Construct system instruction
  // Passing -1 to simulate fresh turn or continuous depending on design
  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      { text: systemInstruction },
      { text: messageText }
    ]);
    const responseText = result.response.text();
    if (!responseText) return;

    // 3. Send Response back to Instagram via Graph API
    await sendInstagramMessage(recipientId, senderId, responseText, bot.instagramAccessToken);

  } catch (error) {
    console.error("Gemini/Graph API Error:", error);
  }
}

async function sendInstagramMessage(businessId: string, recipientId: string, text: string, accessToken: string) {
  const url = `https://graph.facebook.com/v21.0/${businessId}/messages`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: text }
    })
  });

  const data = await response.json();
  if (data.error) {
    console.error('Error sending message:', data.error);
  }
}
