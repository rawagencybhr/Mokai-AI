




import { BotConfig, PendingAction } from '../types';
import { db } from './firebaseConfig';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { INITIAL_BOTS } from './mockData';

const COLLECTION_NAME = 'bots';

// Helper to generate RWB-XXXX-XXXX format
const generateLicenseKey = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  const segment = () => Array(4).fill(0).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `RWB-${segment()}-${segment()}`;
};

export const botRepository = {
  
  // GET ALL
  getAllBots: async (): Promise<BotConfig[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      
      // FIX: Return empty array if no documents found, instead of re-seeding mock data.
      if (querySnapshot.empty) {
        return []; 
      }
      
      return querySnapshot.docs.map(doc => doc.data() as BotConfig);
    } catch (error) {
      console.error("Error connecting to Firestore:", error);
      return [];
    }
  },

  // REAL-TIME LISTENER (For Owner App)
  listenToBot: (id: number, callback: (bot: BotConfig) => void) => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    return onSnapshot(botRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as BotConfig);
      }
    });
  },

  // CREATE
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
        healthScore: 100,
        spamRate: '0%',
        riskLevel: 'Low' as const
    };

    bot.stats = { ...defaultStats, ...bot.stats };
    
    // Defensive Coding & Defaults
    bot.isActive = true;
    bot.isListening = false;
    bot.learnedObservations = [];
    bot.tone = bot.tone || 'friendly';
    bot.plan = bot.plan || 'starter';
    bot.language = bot.language || 'العربية';
    
    // License & Subscription Defaults
    bot.licenseKey = generateLicenseKey();
    bot.isActivated = false;
    bot.toneValue = 50; // Default Middle (Salesman)
    
    // Default Subscription: 1 Year from now
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    bot.subscriptionEndDate = nextYear.toISOString();

    // Instagram Defaults
    bot.instagramConnected = false;
    bot.whatsappConnected = false;

    await setDoc(doc(db, COLLECTION_NAME, bot.id.toString()), bot);
    return bot;
  },

  // UPDATE
  updateBot: async (updatedBot: BotConfig): Promise<BotConfig> => {
    const botRef = doc(db, COLLECTION_NAME, updatedBot.id.toString());
    // @ts-ignore
    await updateDoc(botRef, { ...updatedBot });
    return updatedBot;
  },

  // DISCONNECT INSTAGRAM
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

  // CONNECT WHATSAPP (Simulation)
  connectWhatsApp: async (id: number, phoneNumber: string): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(botRef, {
      whatsappConnected: true,
      whatsappPhoneNumber: phoneNumber
    });
  },

  // DISCONNECT WHATSAPP
  disconnectWhatsApp: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(botRef, {
      whatsappConnected: false,
      whatsappPhoneNumber: null
    } as any);
  },

  // UPDATE PENDING ACTION (Trigger Alert)
  updatePendingAction: async (botId: number, action: PendingAction | null): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, botId.toString());
    await updateDoc(botRef, { pendingAction: action });
  },

  // ACTIVATE BOT (Client Side)
  activateBot: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(botRef, { 
      isActivated: true,
      activationDate: new Date().toISOString()
    });
  },

  // DELETE
  deleteBot: async (id: number): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id.toString()));
  },

  // TOGGLE ACTIVE STATUS
  toggleBotStatus: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    const botSnap = await getDoc(botRef);
    
    if (botSnap.exists()) {
      const bot = botSnap.data() as BotConfig;
      await updateDoc(botRef, { isActive: !bot.isActive });
    }
  },

  // TOGGLE LISTENING MODE
  toggleBotListening: async (id: number): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    const botSnap = await getDoc(botRef);
    
    if (botSnap.exists()) {
      const bot = botSnap.data() as BotConfig;
      await updateDoc(botRef, { isListening: !bot.isListening });
    }
  },

  // LEARN NEW INFO
  addLearnedObservation: async (id: number, observation: string): Promise<void> => {
    const botRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(botRef, {
        learnedObservations: arrayUnion(observation)
    });
  }
};
