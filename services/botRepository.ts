

import { BotConfig, PendingAction } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, arrayUnion, onSnapshot } from 'firebase/firestore';

const COLLECTION_NAME = 'bots';

const generateLicenseKey = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => Array(4).fill(0).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `RWB-${segment()}-${segment()}`;
};

export const botRepository = {
  getAllBots: async (): Promise<BotConfig[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      if (querySnapshot.empty) return [];
      return querySnapshot.docs.map(doc => doc.data() as BotConfig);
    } catch (error) {
      console.error("Error connecting to Firestore:", error);
      return [];
    }
  },

  listenToBot: (id: number, callback: (bot: BotConfig) => void) => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    return onSnapshot(botRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as BotConfig);
      }
    });
  },

  createBot: async (bot: BotConfig): Promise<BotConfig> => {
    const defaultStats = {
        totalConversations: 0,
        activeConversations: 0,
        newClients: 0,
        avgResponseTime: '0 ثانية',
        avgConversationDuration: '0 دقيقة',
        topProducts: [],
        peakHours: '--',
        botResolutionRate: 100,
        interventionRate: 0,
        customerSatisfaction: 5.0,
        topQuestions: [],
        analyzedImages: 0,
        generatedImages: 0,
        healthScore: 100,
        spamRate: '0%',
        riskLevel: 'Low' as const
    };

    bot.stats = { ...defaultStats, ...bot.stats };
    bot.isActive = true;
    bot.isListening = false;
    bot.learnedObservations = [];
    bot.tone = bot.tone || 'friendly';
    bot.plan = bot.plan || 'starter';
    // Use selected language or default to 'ar'
    bot.language = bot.language || 'ar';
    bot.licenseKey = generateLicenseKey();
    bot.isActivated = false;
    bot.toneValue = bot.toneValue || 50;
    bot.useEmoji = true; // Default to true
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    bot.subscriptionEndDate = nextYear.toISOString();
    bot.instagramConnected = false;
    bot.whatsappConnected = false;

    await setDoc(doc(db, COLLECTION_NAME, bot.id.toString()), bot);
    return bot;
  },

  updateBot: async (updatedBot: BotConfig): Promise<BotConfig> => {
    const botRef = doc(db, COLLECTION_NAME, updatedBot.id.toString());
    // @ts-ignore
    await updateDoc(botRef, { ...updatedBot });
    return updatedBot;
  },

  disconnectInstagram: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(botRef, { 
      instagramConnected: false,
      instagramAccessToken: null,
      instagramBusinessId: null,
      instagramUserId: null,
      instagramPageId: null,
      instagramUsername: null,
      longLivedToken: null,
      connectedAt: null
    } as any);
  },

  disconnectWhatsApp: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(botRef, {
      whatsappConnected: false,
      whatsappPhoneNumber: null,
      whatsappAccessToken: null,
      whatsappBusinessAccountId: null,
      whatsappPhoneNumberId: null
    } as any);
  },

  updatePendingAction: async (botId: number, action: PendingAction | null): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, botId.toString());
    await updateDoc(botRef, { pendingAction: action });
  },

  activateBot: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(botRef, { 
      isActivated: true,
      activationDate: new Date().toISOString()
    });
  },

  deleteBot: async (id: number): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id.toString()));
  },

  toggleBotStatus: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    const botSnap = await getDoc(botRef);
    if (botSnap.exists()) {
      const bot = botSnap.data() as BotConfig;
      await updateDoc(botRef, { isActive: !bot.isActive });
    }
  },

  toggleBotListening: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    const botSnap = await getDoc(botRef);
    if (botSnap.exists()) {
      const bot = botSnap.data() as BotConfig;
      await updateDoc(botRef, { isListening: !bot.isListening });
    }
  },

  addLearnedObservation: async (id: number, observation: string): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(botRef, {
        learnedObservations: arrayUnion(observation)
    });
  }
};