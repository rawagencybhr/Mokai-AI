
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from './LoadingIndicator';
import { AdminPanel } from './AdminPanel';
import { sendMessageToGemini, fileToBase64 } from '@/services/geminiService';
import { botRepository } from '@/services/botRepository';
import { Message, Sender, PendingAction, BotConfig, UserProfile } from '@/types';
import { GENERATE_SYSTEM_INSTRUCTION } from '@/constants';
import { 
  Power, UserCog, ChevronLeft, Send, Image as ImageIcon, 
  Settings, RefreshCw, AlertCircle, User
} from 'lucide-react';

interface ChatInterfaceProps {
    bot: BotConfig;
    onBack: () => void;
}

// Mock User Context (In real app, detecting via DB or Login)
const MOCK_USER: UserProfile = {
  id: 'u123',
  username: 'ahmed_vip',
  fullName: 'أحمد محمد',
  isVip: true,
  pastOrdersCount: 5
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ bot, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [storeContext, setStoreContext] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  // User Identification Simulation
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(MOCK_USER);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Send Message
  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const isSystemCommand = input.startsWith('!');
    
    // 1. Create User Message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: isSystemCommand ? Sender.SYSTEM : Sender.USER, 
      timestamp: new Date(),
      imageUrl: selectedImage ? await fileToBase64(selectedImage) : undefined
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // 2. Generate Context
      const dynamicContext = isSystemCommand 
        ? `${storeContext}\n[توجيه مباشر من المالك]: ${input.substring(1)}` 
        : storeContext;

      // Pass userProfile to instruction
      const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(bot, dynamicContext, userProfile);

      // 3. Call Gemini
      const responseText = await sendMessageToGemini(
        isSystemCommand ? "ننفذ التوجيه..." : newUserMsg.text, 
        systemInstruction,
        messages, 
        newUserMsg.imageUrl
      );

      // 4. Handle Special Tags
      let cleanResponse = responseText;
      let action: PendingAction | null = null;

      if (responseText.includes('[[REQ_HANDOFF]]')) {
         action = { id: Date.now().toString(), type: 'HOT_LEAD', userMessage: input };
         cleanResponse = responseText.replace('[[REQ_HANDOFF]]', '').trim();
         setAdminPanelOpen(true);
      } else if (responseText.includes('[[REQ_DISCOUNT]]')) {
         action = { id: Date.now().toString(), type: 'DISCOUNT_REQUEST', userMessage: input };
         cleanResponse = responseText.replace('[[REQ_DISCOUNT]]', '').trim();
         setAdminPanelOpen(true);
      } else if (responseText.includes('[[UNKNOWN_QUERY]]')) {
         action = { id: Date.now().toString(), type: 'UNKNOWN_QUERY', userMessage: input };
         cleanResponse = responseText.replace('[[UNKNOWN_QUERY]]', '').trim();
         setAdminPanelOpen(true);
      }

      if (action) {
        await botRepository.updatePendingAction(bot.id, action);
      }

      // 5. Add Bot Response
      if (cleanResponse) {
          const newBotMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: cleanResponse,
            sender: Sender.AGENT,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, newBotMsg]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "حدث خطأ في الاتصال، حاول مرة أخرى.",
        sender: Sender.AGENT,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden relative">
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full max-w-5xl mx-auto bg-white shadow-xl md:rounded-2xl md:my-4 md:h-[95vh] overflow-hidden">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                {bot.botName}
                <span className="bg-cyan-100 text-cyan-700 text-[10px] px-2 py-0.5 rounded-full border border-cyan-200">تجربة</span>
              </h2>
              {/* User Detection Badge */}
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                 <User size={12} className="text-purple-500" />
                 <span>يتحدث مع: <span className="font-bold text-slate-700">{userProfile?.fullName || 'زائر مجهول'}</span></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
                onClick={() => setMessages([])}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="مسح المحادثة"
            >
                <RefreshCw size={20} />
            </button>
            <button 
                onClick={() => setAdminPanelOpen(!adminPanelOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    adminPanelOpen 
                    ? 'bg-cyan-500 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
                <Settings size={18} />
                <span className="hidden md:inline">لوحة التحكم</span>
            </button>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f8fafc] space-y-4" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
           {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                    <UserCog size={40} />
                </div>
                <p>ابدأ المحادثة لتجربة ذكاء {bot.botName}</p>
             </div>
           )}
           
           {messages.map((msg) => (
             <MessageBubble key={msg.id} message={msg} />
           ))}
           
           {isLoading && <LoadingIndicator />}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 p-4">
           {selectedImage && (
              <div className="flex items-center gap-2 mb-2 bg-slate-50 p-2 rounded-lg w-fit border border-slate-200">
                  <span className="text-xs text-slate-600 truncate max-w-[150px]">{selectedImage.name}</span>
                  <button onClick={() => setSelectedImage(null)} className="text-slate-400 hover:text-red-500">
                      <Settings size={14} className="rotate-45" /> 
                  </button>
              </div>
           )}

           <div className="flex items-end gap-2 relative">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors mb-0.5"
              >
                 <ImageIcon size={24} />
              </button>
              <input 
                 type="file" 
                 ref={fileInputRef}
                 className="hidden"
                 accept="image/*"
                 onChange={(e) => {
                    if (e.target.files?.[0]) setSelectedImage(e.target.files[0]);
                 }}
              />

              <div className="flex-1 bg-slate-100 rounded-2xl border border-transparent focus-within:border-cyan-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-50 transition-all flex items-center">
                 <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="اكتب رسالتك هنا... (أو ! لتوجيه المساعد)"
                    className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[50px] py-3 px-4 text-slate-700 placeholder-slate-400"
                    rows={1}
                 />
              </div>

              <button 
                onClick={handleSend}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={`p-3 rounded-xl mb-0.5 transition-all shadow-sm ${
                    (!input.trim() && !selectedImage) || isLoading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-cyan-500 text-white hover:bg-cyan-600 hover:shadow-md hover:scale-105'
                }`}
              >
                 <Send size={24} className={isLoading ? 'opacity-0' : ''} />
                 {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                 )}
              </button>
           </div>
           <p className="text-[10px] text-slate-400 text-center mt-2">
              💡 تلميح: ابدأ رسالتك بـ <code>!</code> لإعطاء توجيه خفي للمساعد (مثال: ! وافق على الخصم)
           </p>
        </div>
      </div>

      {/* Admin Panel Sidebar */}
      <AdminPanel 
         isOpen={adminPanelOpen}
         storeContext={storeContext}
         setStoreContext={setStoreContext}
         pendingAction={bot.pendingAction || null}
         onClose={() => setAdminPanelOpen(false)}
      />

    </div>
  );
};
