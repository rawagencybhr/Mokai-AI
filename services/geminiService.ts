import { GoogleGenAI, Chat, GenerateContentResponse, Part, Content } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { Message, Sender } from "../types";

// دالة لتهيئة الجلسة مع التاريخ السابق
export const createChatSession = (systemInstruction: string, history: Content[] = []): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    },
    history: history
  });
};

export const sendMessageToGemini = async (
  text: string,
  systemInstruction: string,
  previousMessages: Message[], // استقبال الرسائل السابقة
  imageBase64?: string,
  mimeType: string = "image/jpeg"
): Promise<string> => {
  try {
    // 1. تحويل رسائل التطبيق إلى صيغة يفهمها جيمناي (History)
    // نستثني رسائل النظام ورسائل الخطأ، ونأخذ آخر 10 رسائل للحفاظ على الأداء
    // IMPORTANT: Filter out messages where text is empty or whitespace, as Gemini history parts cannot be empty.
    const history: Content[] = previousMessages
      .filter(msg => (msg.sender === Sender.USER || msg.sender === Sender.AGENT) && msg.text && msg.text.trim() !== "")
      .slice(-10) // نأخذ آخر 10 رسائل فقط كسياق
      .map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }] // حالياً نركز على النص في التاريخ لتوفير التوكنز
      }));

    // 2. إنشاء الجلسة مع التاريخ
    const chat = createChatSession(systemInstruction, history);
    
    let messageContent: string | Part[];
    
    // 3. تجهيز الرسالة الحالية
    if (imageBase64) {
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      messageContent = [
        { text: text },
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        }
      ];
    } else {
      messageContent = text;
    }

    const result: GenerateContentResponse = await chat.sendMessage({ message: messageContent });
    return result.text || "المعذرة، ما فهمت عليك.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const isQuotaError = 
      error.status === 429 || 
      error.status === "RESOURCE_EXHAUSTED" ||
      error.message?.includes('429') || 
      error.message?.includes('quota') ||
      error.error?.code === 429 ||
      error.error?.status === "RESOURCE_EXHAUSTED";

    if (isQuotaError) {
      return "QUOTA_EXCEEDED";
    }

    return "آسف، فيه ضغط بسيط على الشبكة، ثواني وأرد عليك.";
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Learning Function (Enhanced)
 * Analyzes the Owner's reply to capture FACT + STYLE.
 */
export const learnFromInteraction = async (
    userQuestion: string,
    ownerReply: string
): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
        You are an AI Apprentice learning from a Master Salesman (The Owner).
        
        Context:
        - Customer Asked: "${userQuestion}"
        - Owner Replied: "${ownerReply}"

        Task: 
        Create a "Golden Rule" for future responses based on this interaction.
        Don't just extract facts. Capture the *Way* the owner answered, but fix any small typos or roughness without losing the dialect/vibe.

        If the reply contains a price, location, policy, or specific way of handling a request:
        Output format in Arabic: "عند السؤال عن [Topic/Keywords]، الرد المعتمد هو: [Refined Owner Reply]"

        If the reply is just a generic "Hello" or "Ok", return "NOTHING".
        
        Example Output: 
        "عند السؤال عن السعر، الرد المعتمد هو: السعر 50 ريال شامل الضريبة يا غالي."
        `;

        const result = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt
        });
        
        const text = result.text?.trim();

        if (!text || text.includes("NOTHING")) return null;
        return text;
    } catch (error) {
        console.error("Learning Error:", error);
        return null;
    }
};