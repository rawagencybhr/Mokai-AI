import { sendMessageToGeminiStructured } from '@/services/geminiService';
import { botRepository } from '@/services/botRepository';
import { GENERATE_SYSTEM_INSTRUCTION } from '@/constants';
import { BotConfig, Message, PendingAction, UserProfile } from '@/types';

const getRelevantKnowledge = (kb: string, q: string) => {
  const lines = kb.split('\n').filter(Boolean);
  const tokens = q.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const scored = lines.map(l => ({ l, s: tokens.reduce((a,t)=>a + (l.toLowerCase().includes(t)?1:0),0) }));
  return scored.sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.l);
};

export const generateInstagramSmartReply = async (
  botId: number,
  text: string,
  fallbackReply: string,
  options?: {
    imageBase64?: string;
    audioBase64?: string;
    userProfile?: UserProfile;
    history?: Message[];
  }
): Promise<{ reply: string; useFallback: boolean; action?: PendingAction | null }> => {
  const bot = await botRepository.getBot(botId);
  if (!bot) return { reply: fallbackReply, useFallback: true };

  const kb = bot.knowledgeBase || '';
  const related = getRelevantKnowledge(kb, text).join('\n');
  const merchantData = `اسم المتجر: ${bot.storeName}\nالموقع: ${bot.location}\nساعات العمل: ${bot.workHours}\n${related ? `مقتطفات ذات صلة:\n${related}` : ''}`;
  const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(
    bot,
    '',
    options?.userProfile,
    -1,
    (bot.toneValue || 50) / 100,
    bot.useEmoji ?? true,
    bot.additionalInfo || '',
    merchantData
  );

  const attachments: { base64: string; mimeType: string }[] = [];
  if (options?.imageBase64) attachments.push({ base64: options.imageBase64, mimeType: 'image/jpeg' });
  if (options?.audioBase64) attachments.push({ base64: options.audioBase64, mimeType: 'audio/mpeg' });

  const structured = await sendMessageToGeminiStructured(
    text,
    systemInstruction,
    options?.history || [],
    attachments
  );

  let reply = structured.reply || fallbackReply;
  const actions = Array.isArray(structured.actions) ? structured.actions : [];
  const conf = typeof structured.confidence === 'number' ? structured.confidence : 0.5;
  const sensitivity = typeof bot.handoffSensitivity === 'number' ? bot.handoffSensitivity : 0.7;
  const autoHandoff = bot.autoHandoff !== false;

  const taggedHandoff = reply.includes('[[REQ_HANDOFF]]');
  const taggedDiscount = reply.includes('[[REQ_DISCOUNT]]');
  const taggedUnknown = reply.includes('[[UNKNOWN_QUERY]]');

  const modelWantsHandoff = actions.includes('HANDOFF') || actions.includes('HOT_LEAD');
  const modelWantsDiscount = actions.includes('DISCOUNT_REQUEST');
  const modelUnknown = actions.includes('UNKNOWN_QUERY');

  const allowHandoff = autoHandoff && conf >= sensitivity;

  let action: PendingAction | null = null;
  if ((taggedHandoff || modelWantsHandoff) && allowHandoff) {
    action = { id: Date.now().toString(), type: 'HOT_LEAD', userMessage: text };
    reply = reply.replace('[[REQ_HANDOFF]]', '').trim();
  } else if ((taggedDiscount || modelWantsDiscount) && allowHandoff) {
    action = { id: Date.now().toString(), type: 'DISCOUNT_REQUEST', userMessage: text };
    reply = reply.replace('[[REQ_DISCOUNT]]', '').trim();
  } else if ((taggedUnknown || modelUnknown) && autoHandoff && conf >= Math.max(0.4, sensitivity - 0.2)) {
    action = { id: Date.now().toString(), type: 'UNKNOWN_QUERY', userMessage: text };
    reply = reply.replace('[[UNKNOWN_QUERY]]', '').trim();
  }

  if (action) await botRepository.updatePendingAction(botId, action);

  const useFallback = conf < sensitivity || !structured.reply;
  return { reply, useFallback, action };
};
