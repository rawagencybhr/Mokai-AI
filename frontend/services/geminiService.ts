import {
  GoogleGenerativeAI,
  type Content,
  type Part,
} from "@google/generative-ai";

import { MODEL_NAME } from "../constants";
import { Message, Sender } from "../types";

/* -----------------------------------------------------------
   1) إنشاء جلسة محادثة مع جيميني + النظام + التاريخ
----------------------------------------------------------- */
export const createChatSession = (systemInstruction: string, history: Content[] = []) => {
  const ai = new GoogleGenerativeAI(process.env.API_KEY!);

  return ai.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
    history,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    },
  });
};

/* -----------------------------------------------------------
   2) إرسال رسالة إلى جيميني (يدعم نص + صورة)
----------------------------------------------------------- */
export const sendMessageToGemini = async (
  text: string,
  systemInstruction: string,
  previousMessages: Message[],
  imageBase64?: string,
  mimeType: string = "image/jpeg"
): Promise<string> => {
  try {
    // تجهيز التاريخ (آخر 10 رسائل فقط)
    const history: Content[] = previousMessages
      .filter(
        (msg) =>
          (msg.sender === Sender.USER || msg.sender === Sender.AGENT) &&
          msg.text &&
          msg.text.trim() !== ""
      )
      .slice(-10)
      .map((msg) => ({
        role: msg.sender === Sender.USER ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

    const chat = createChatSession(systemInstruction, history);

    // تجهيز الرسالة الحالية
    let parts: Part[] = [{ text }];

    if (imageBase64) {
      const clean = imageBase64.split(",")[1] || imageBase64;
      parts.push({
        inlineData: {
          mimeType,
          data: clean,
        },
      });
    }

    // إرسال الرسالة
    const result = await chat.generateContent({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    });

    const responseText = result.response.text();
    return responseText || "المعذرة، ما فهمت عليك.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);

    const isQuotaError =
      error?.status === 429 ||
      error?.status === "RESOURCE_EXHAUSTED" ||
      error?.message?.includes("429") ||
      error?.message?.includes("quota");

    if (isQuotaError) return "QUOTA_EXCEEDED";

    return "آسف، فيه ضغط بسيط على الشبكة، ثواني وأرد عليك.";
  }
};

/* -----------------------------------------------------------
   3) تحويل الملفات إلى Base64
----------------------------------------------------------- */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/* -----------------------------------------------------------
   4) AI Learning — تعلم أسلوب الرد من صاحب المحل
----------------------------------------------------------- */
export const learnFromInteraction = async (
  userQuestion: string,
  ownerReply: string
): Promise<string | null> => {
  try {
    const ai = new GoogleGenerativeAI(process.env.API_KEY!);

    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
    });

    const prompt = `
        You are an AI Apprentice learning from a Master Salesman (The Owner).

        Context:
        - Customer Asked: "${userQuestion}"
        - Owner Replied: "${ownerReply}"

        Task:
        Create a "Golden Rule" for future responses based on this interaction.
        Capture the owner's style, dialect, and tone — but improve small typos.

        Important:
        - If the reply contains a price, rule, policy, or specific action:
          Format output like:
          "عند السؤال عن [Topic]، الرد المعتمد هو: [Refined Reply]"
        - If ownerReply is too generic ("مرحبا"، "تمام"، "اوكي"):
          return ONLY "NOTHING".
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim();

    if (!text || text.includes("NOTHING")) return null;

    return text;
  } catch (error) {
    console.error("Learning Error:", error);
    return null;
  }
};
