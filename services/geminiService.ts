
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_NAME } from "@/constants";
import { Message, Sender } from "@/types";

const getApiKey = () => {
    return process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
};

export const createChatSession = (systemInstruction: string, history: any[] = []): any => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found. Please set GOOGLE_API_KEY.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemInstruction }] },
      ...history
    ],
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
        
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const prompt = `
        You are an AI Apprentice learning from a Master Salesman.
        Context: Customer Asked: "${userQuestion}", Owner Replied: "${ownerReply}"
        Task: Create a "Golden Rule" in Arabic.
        Output format: "عند السؤال عن [Topic]، الرد المعتمد هو: [Reply]"
        If generic, return "NOTHING".
        `;

        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(prompt);
        
        const text = result.response.text()?.trim();
        if (!text || text.includes("NOTHING")) return null;
        return text;
    } catch (error) {
        return null;
    }
};
