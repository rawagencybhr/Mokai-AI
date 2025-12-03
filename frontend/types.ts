

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
  imageUrl?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export enum Sender {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system'
}

export interface AdminState {
  storeContext: string;
  isOpen: boolean;
  pendingAction: PendingAction | null;
}

export interface PendingAction {
  id: string;
  type: 'DISCOUNT_REQUEST' | 'UNKNOWN_QUERY' | 'HOT_LEAD';
  userMessage: string;
  timestamp?: number;
}

export interface UserProfile {
  username: string;
  fullName: string;
  bio: string;
}

export interface BotStats {
  totalConversations: number;
  activeConversations: number;
  newClients: number;
  avgResponseTime: string;
  avgConversationDuration: string;
  topProducts: string[];
  peakHours: string;
  botResolutionRate: number;
  interventionRate: number;
  customerSatisfaction: number;
  topQuestions?: string[];
  healthScore: number;
  spamRate: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export type BotTone = 'friendly' | 'official' | 'salesman' | 'luxury';
export type BotPlan = 'starter' | 'professional' | 'growth';

export interface BotConfig {
  id: number;
  botName: string;
  storeName: string;
  location: string;
  businessType: string;
  workHours: string;
  language: string;
  
  // Legacy Tone (kept for compatibility, but UI now uses toneValue)
  tone: BotTone; 
  // New: Numeric Tone Value (0 = Friendly/Casual, 100 = Official/Formal)
  toneValue: number; 

  plan: BotPlan;
  products: string;
  additionalInfo: string;
  knowledgeBase?: string;
  learnedObservations?: string[];
  platforms: string[];
  isActive: boolean;
  isListening: boolean;
  createdAt: string;
  stats?: BotStats;

  // New: License & Subscription Fields
  licenseKey: string;         // Unique 13-char key (RWB-XXXX-XXXX)
  isActivated: boolean;       // Has the client entered the key?
  activationDate?: string;    // When was it activated
  subscriptionEndDate: string;// When does it expire

  // New: Sync Field for Alerts
  pendingAction?: PendingAction | null; 

  // Instagram Integration
  instagramConnected?: boolean;
  instagramAccessToken?: string;
  instagramBusinessId?: string;
  instagramUserId?: string;
  instagramPageId?: string;
  instagramUsername?: string;
  longLivedToken?: string;
  connectedAt?: string;

  // WhatsApp Integration
  whatsappConnected?: boolean;
  whatsappPhoneNumber?: string;
}