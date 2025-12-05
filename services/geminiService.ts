
import { GoogleGenAI, Chat, GenerateContentResponse, Part, Content } from "@google/genai";
import { MODEL_NAME } from "@/constants";
import { Message, Sender } from "@/types";

// Retrieve API key with support for Client-Side env vars in Next.js
const getApiKey = () => {
    return process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY;
};

export const createChatSession = (systemInstruction: string, history: Content[] = []): Chat => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found. Please set NEXT_PUBLIC_API_KEY.");
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
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
  previousMessages: Message[], 
  imageBase64?: string,
  mimeType: string = "image/jpeg"
): Promise<string> => {
  try {
    // Filter history to only include valid user/agent messages
    const history: Content[] = previousMessages
      .filter(msg => (msg.sender === Sender.USER || msg.sender === Sender.AGENT) && msg.text && msg.text.trim() !== "")
      .slice(-10) // Limit context window
      .map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    const chat = createChatSession(systemInstruction, history);
    
    let messageContent: string | Part[];
    
    if (imageBase64) {
      // Remove data URL prefix if present
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
    if (error.status === 429 || error.message?.includes('429')) {
      return "⚠️ عذراً، تجاوزنا حد الاستخدام المسموح. يرجى المحاولة لاحقاً.";
    }
    return "آسف، واجهت مشكلة بسيطة في الشبكة. ممكن تعيد؟";
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

export const learnFromInteraction = async (
    userQuestion: string,
    ownerReply: string
): Promise<string | null> => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) return null;
        
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        const prompt = `
        You are an AI Apprentice learning from a Master Salesman.
        Context: Customer Asked: "${userQuestion}", Owner Replied: "${ownerReply}"
        Task: Create a "Golden Rule" in Arabic.
        Output format: "عند السؤال عن [Topic]، الرد المعتمد هو: [Reply]"
        If generic, return "NOTHING".
        `;

        const result = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt
        });
        
        const text = result.text?.trim();
        if (!text || text.includes("NOTHING")) return null;
        return text;
    } catch (error) {
        return null;
    }
};
