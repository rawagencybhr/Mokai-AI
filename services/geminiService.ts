import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_NAME } from "@/constants";
import { Message, Sender } from "@/types";

const getApiKey = () => {
    return process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
};

const normalizeHistory = (history: any[] = []): any[] => {
  const cleaned = history.filter(h => h && h.role && h.parts && h.parts.length > 0);
  // Ensure first role is 'user'
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  if (!cleaned.length) return [];
  // Enforce alternation user->model->user...
  const out: any[] = [];
  let prev: string | null = null;
  for (const h of cleaned) {
    if (h.role === prev) continue;
    out.push(h);
    prev = h.role;
  }
  // Do not end with 'user'
  if (out.length && out[out.length - 1].role === 'user') out.pop();
  // Limit window
  return out.slice(-10);
};

export const createChatSession = (systemInstruction: string, history: any[] = []): any => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found. Please set GOOGLE_API_KEY.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const chat = model.startChat({
    history: normalizeHistory(history),
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    },
  });
  return chat;
};

export const sendMessageToGemini = async (
  text: string,
  systemInstruction: string,
  previousMessages: Message[], 
  imageBase64?: string,
  mimeType: string = "image/jpeg"
): Promise<string> => {
  try {
    // Filter history to only include valid user/agent messages
    const history = previousMessages
      .filter(msg => (msg.sender === Sender.USER || msg.sender === Sender.AGENT) && msg.text && msg.text.trim() !== "")
      .slice(-10) // Limit context window
      .map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    const chat = createChatSession(systemInstruction, history);
    
    let messageContent: any;
    
    if (imageBase64) {
      // Remove data URL prefix if present
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      messageContent = [
        { text: systemInstruction },
        { text: text },
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        }
      ];
    } else {
      messageContent = [
        { text: systemInstruction },
        { text: text }
      ];
    }

    const result = await chat.sendMessage(messageContent);
    return result.response.text() || "المعذرة، ما فهمت عليك.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.status === 429 || error.message?.includes('429')) {
      return "⚠️ عذراً، تجاوزنا حد الاستخدام المسموح. يرجى المحاولة لاحقاً.";
    }
    return "آسف، واجهت مشكلة بسيطة في الشبكة. ممكن تعيد؟";
  }
};

export const sendMessageToGeminiStructured = async (
  text: string,
  systemInstruction: string,
  previousMessages: Message[],
  attachments?: { base64: string; mimeType: string }[]
): Promise<{ reply: string; intent?: string; actions?: string[]; confidence?: number; raw?: string }> => {
  try {
    const history = previousMessages
      .filter(msg => (msg.sender === Sender.USER || msg.sender === Sender.AGENT) && msg.text && msg.text.trim() !== "")
      .slice(-10)
      .map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    const chat = createChatSession(systemInstruction, history);

    let parts: any[] = [{ text: systemInstruction }, { text }];
    if (attachments && attachments.length) {
      attachments.forEach(a => {
        const clean = a.base64.split(',')[1] || a.base64;
        parts.push({ inlineData: { mimeType: a.mimeType, data: clean } });
      });
    }

    const result = await chat.sendMessage(parts);
    const raw = result.response.text() || "";
    try {
      const parsed = JSON.parse(raw);
      return { ...parsed, raw };
    } catch {
      return { reply: raw, raw };
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { reply: "آسف، واجهت مشكلة بسيطة في الشبكة. ممكن تعيد؟" };
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
