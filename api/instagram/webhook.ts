import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GENERATE_SYSTEM_INSTRUCTION } from '../../../constants';

export const config = {
  runtime: "edge",
};

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

/* ----------------------------------------------
    Process Event from Instagram
---------------------------------------------- */
async function processInstagramEvent(event: any) {
  const senderId = event.sender.id;
  const recipientId = event.recipient.id; 
  const messageText = event.message?.text;

  if (!messageText) return;

  // 1. Find bot for this Instagram Business Account
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
  const ai = new GoogleGenerativeAI(process.env.API_KEY!);
  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, "", undefined, -1);

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: messageText }],
        },
      ],
      systemInstruction,
    });

    const responseText = result.response.text();
    if (!responseText) return;

    // 3. Send Response back to Instagram
    await sendInstagramMessage(
      recipientId,
      senderId,
      responseText,
      bot.instagramAccessToken
    );

  } catch (error) {
    console.error("Gemini/Graph API Error:", error);
  }
}

/* ----------------------------------------------
    Send message to Instagram API
---------------------------------------------- */
async function sendInstagramMessage(
  businessId: string,
  recipientId: string,
  text: string,
  accessToken: string
) {
  const url = `https://graph.facebook.com/v21.0/${businessId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: recipientId },
      message: { text },
      access_token: accessToken,
    }),
  });

  const data = await response.json();
  if (data.error) {
    console.error('Error sending message:', data.error);
  }
}
