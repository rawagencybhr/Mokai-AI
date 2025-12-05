

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
  id: string;
  username: string;
  fullName: string;
  phone?: string;
  isVip?: boolean;
  pastOrdersCount?: number;
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
  topQuestions: string[];
  analyzedImages: number;
  generatedImages: number;
  healthScore: number;
  spamRate: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export type BotTone = 'friendly' | 'official' | 'salesman' | 'luxury';
export type BotPlan = 'starter' | 'professional' | 'growth';
export type BotLanguage = 'ar' | 'en' | 'bi'; // ar: Arabic, en: English, bi: Bilingual

export interface BotConfig {
  id: number;
  botName: string;
  storeName: string;
  location: string;
  locationUrl?: string; // New field for Google Maps Link
  country?: string;     // New field for Country context
  businessType: string;
  workHours: string;
  language: BotLanguage; 
  
  // Legacy Tone
  tone: BotTone; 
  // Slider Value (0-100)
  toneValue: number; 
  
  // New Behavior Settings
  useEmoji: boolean;

  plan: BotPlan;
  products: string;
  additionalInfo: string;
  knowledgeBase?: string; // Content from uploaded files
  lastUploadedFileName?: string; // For UI display
  learnedObservations?: string[];
  platforms: string[];
  isActive: boolean;
  isListening: boolean;
  createdAt: string;
  stats?: BotStats;

  // License
  licenseKey: string;
  isActivated: boolean;
  activationDate?: string;
  subscriptionEndDate: string;

  // Alerts
  pendingAction?: PendingAction | null; 

  // Instagram
  instagramConnected?: boolean;
  instagramAccessToken?: string;
  instagramBusinessId?: string;
  instagramUserId?: string;
  instagramPageId?: string;
  instagramUsername?: string;
  longLivedToken?: string;
  connectedAt?: string;

  // WhatsApp
  whatsappConnected?: boolean;
  whatsappPhoneNumber?: string;
  whatsappAccessToken?: string;
  whatsappBusinessAccountId?: string;
  whatsappPhoneNumberId?: string;
}