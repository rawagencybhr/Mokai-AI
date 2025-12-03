

import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from './LoadingIndicator';
import { AdminPanel } from './AdminPanel';
import { sendMessageToGemini, fileToBase64, learnFromInteraction } from '../services/geminiService';
import { botRepository } from '../services/botRepository';
import { Message, Sender, PendingAction, BotConfig, UserProfile } from '../types';
import { GENERATE_SYSTEM_INSTRUCTION } from '../constants';
import { Power, UserCog, UserCircle2, ChevronDown, ChevronUp, Ear, BrainCircuit, Mic, Square, BellRing } from 'lucide-react';

interface ChatInterfaceProps {
    bot: BotConfig;
    onBack: () => void;
}

// Define Buffer Item Structure
interface BufferItem {
  text: string;
  image?: string;
  mimeType?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ bot, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Bot Status State
  const [isBotActive, setIsBotActive] = useState(true);

  // Admin State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [storeContext, setStoreContext] = useState(''); 
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Notification Simulation (Handoff)
  const [handoffNotification, setHandoffNotification] = useState(false);

  // Persistent Memory State
  const [localLearnedObservations, setLocalLearnedObservations] = useState<string[]>(bot.learnedObservations || []);

  // Simulation State (Customer Profile)
  const [showSimSettings, setShowSimSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: 'guest_user',
    fullName: '',
    bio: ''
  });

  // Buffering Refs
  const bufferRef = useRef<BufferItem[]>([]);
  const debounceTimerRef = useRef<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, handoffNotification]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً، ياليت تختار صورة أقل من 5 ميجا');
        return;
      }
      setSelectedImage(file);
      const base64 = await fileToBase64(file);
      setPreviewUrl(base64);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addSystemMessage = (text: string) => {
    setMessages(prev => [
      {
        id: Date.now().toString(),
        text,
        sender: Sender.SYSTEM,
        timestamp: new Date()
      },
      ...prev
    ]);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("متصفحك لا يدعم خاصية الصوت.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
      };
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
      
      recognition.start();
      recognitionRef.current = recognition;
    }
  };

  // --- THE CORE BUFFERING LOGIC ---
  const flushBufferToGemini = async () => {
    if (bufferRef.current.length === 0) return;

    // 1. Combine content
    const combinedText = bufferRef.current.map(item => item.text).filter(t => t).join('\n');
    const imageItem = bufferRef.current.find(item => item.image);
    const combinedImage = imageItem?.image;
    const combinedMimeType = imageItem?.mimeType;

    // Clear buffer immediately
    bufferRef.current = [];

    // 2. Prepare for API Call
    if (bot.isListening) return;
    if (!isBotActive) return;

    setIsLoading(true);

    try {
      const effectiveBot = {
          ...bot,
          learnedObservations: localLearnedObservations
      };

      // --- Time Context Calculation ---
      // Determine if this is a new session or continuing based on last message time
      let timeSinceLastMsgHours = -1;
      const lastMessage = messages.length > 0 ? messages[0] : null; // Messages are reversed in UI state (0 is newest)
      
      if (lastMessage) {
        const diffMs = new Date().getTime() - lastMessage.timestamp.getTime();
        timeSinceLastMsgHours = diffMs / (1000 * 60 * 60);
      }

      const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(effectiveBot, storeContext, userProfile, timeSinceLastMsgHours);
      
      // We use the messages state as history (Reversed back to chronological for API)
      const conversationHistory = [...messages].reverse();

      let responseText = await sendMessageToGemini(
        combinedText || (combinedImage ? "شرايك بهذي الصورة؟" : "."), 
        systemInstruction,
        conversationHistory,
        combinedImage,
        combinedMimeType
      );

      if (responseText === "QUOTA_EXCEEDED") {
         responseText = "المعذرة، عندي ضغط رسائل حالياً، ممكن تعيد سؤالك بعد شوي؟ 🌹";
      }

      // --- TAG HANDLING ---

      // 1. Sales Handoff (Hot Lead)
      if (responseText.includes('[[REQ_HANDOFF]]')) {
        const cleanResponse = responseText.replace('[[REQ_HANDOFF]]', '').trim();
        
        // Show Bot's final persuasive message
        if (cleanResponse) {
             const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: cleanResponse,
                sender: Sender.AGENT,
                timestamp: new Date(),
            };
            setMessages(prev => [botMessage, ...prev]);
        }
        
        setIsLoading(false);
        setHandoffNotification(true); // Trigger visual simulation

        // Sync with Database for Real-Time Notification on Owner's Phone
        const action: PendingAction = {
          id: Date.now().toString(),
          type: 'HOT_LEAD',
          userMessage: combinedText || 'اتمام شراء',
          timestamp: Date.now()
        };
        
        setPendingAction(action);
        // Important: Update DB so client app listens
        await botRepository.updatePendingAction(bot.id, action);
        
        return; 
      }

      // 2. Discount Request
      if (responseText.includes('[[REQ_DISCOUNT]]')) {
        const cleanResponse = responseText.replace('[[REQ_DISCOUNT]]', '').trim();
        if (cleanResponse) {
             const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: cleanResponse,
                sender: Sender.AGENT,
                timestamp: new Date(),
            };
            setMessages(prev => [botMessage, ...prev]);
        }
        setIsLoading(false);
        
        const action: PendingAction = {
          id: Date.now().toString(),
          type: 'DISCOUNT_REQUEST',
          userMessage: combinedText || 'صورة',
          timestamp: Date.now()
        };
        setPendingAction(action);
        await botRepository.updatePendingAction(bot.id, action);
        
        setIsAdminOpen(true); 
        addSystemMessage("🔔 طلب خصم جديد. اكتب ردك بعد علامة !");
        return; 
      }

      // 3. Unknown Query
      if (responseText.includes('[[UNKNOWN_QUERY]]')) {
        const cleanResponse = responseText.replace('[[UNKNOWN_QUERY]]', '').trim();
        const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: cleanResponse,
            sender: Sender.AGENT,
            timestamp: new Date(),
        };
        setMessages(prev => [botMessage, ...prev]);
        
        const action: PendingAction = {
            id: Date.now().toString(),
            type: 'UNKNOWN_QUERY',
            userMessage: combinedText || 'استفسار',
            timestamp: Date.now()
        };
        setPendingAction(action);
        await botRepository.updatePendingAction(bot.id, action);

        setIsAdminOpen(true);
        addSystemMessage("⚠️ استفسار غير معروف. أرسل المعلومة الصحيحة بعد علامة !");
        setIsLoading(false);
        return;
      }

      // Normal Message (Split by ||| if needed, though gemini mostly sends one block)
      const responseParts = responseText.split('|||').map(t => t.trim()).filter(t => t);
      
      for (let i = 0; i < responseParts.length; i++) {
        const part = responseParts[i];
        const delay = i === 0 ? 0 : (part.length * 20) + 500;
        
        if (i > 0) setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, delay));
        setIsLoading(false);

        const botMessage: Message = {
            id: (Date.now() + i).toString(),
            text: part,
            sender: Sender.AGENT,
            timestamp: new Date(),
        };
        setMessages(prev => [botMessage, ...prev]);
      }

    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setMessages(prev => [{
        id: Date.now().toString(),
        text: "النت يقطع عندي، دقيقة بس...",
        sender: Sender.AGENT,
        timestamp: new Date()
      }, ...prev]);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading) return;

    const rawText = inputText.trim();
    const imageToSend = selectedImage; 
    const imagePreviewToSend = previewUrl;

    // Reset Input UI Immediately
    setInputText('');
    setSelectedImage(null);
    setPreviewUrl(null);
    setHandoffNotification(false); // Reset notification on new message
    if (fileInputRef.current) fileInputRef.current.value = '';

    // --- IMMEDIATE HANDLERS (Bypass Buffer) ---

    // 1. OWNER INTERVENTION (.)
    if (rawText.startsWith('.')) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        bufferRef.current = [];

        const ownerMessageText = rawText.substring(1).trim();
        if (!ownerMessageText) return;

        const ownerMessage: Message = {
            id: Date.now().toString(),
            text: ownerMessageText,
            sender: Sender.AGENT,
            timestamp: new Date()
        };

        if (bot.isListening) {
             const lastUserMessage = messages.find(m => m.sender === Sender.USER);
             if (lastUserMessage) {
                 learnFromInteraction(lastUserMessage.text, ownerMessageText).then(async (observation) => {
                     if (observation) {
                         await botRepository.addLearnedObservation(bot.id, observation);
                         setLocalLearnedObservations(prev => [...prev, observation]);
                         addSystemMessage(`🧠 تعلمت معلومة جديدة: "${observation}"`);
                     }
                 });
             }
        }

        setMessages(prev => [ownerMessage, ...prev]);
        if (isBotActive) {
            setIsBotActive(false);
            addSystemMessage("⚠️ تم إيقاف المساعد تلقائياً لأنك تدخلت في المحادثة.");
        }
        return;
    }

    // 2. ADMIN COMMANDS (!)
    if (rawText.startsWith('!')) {
      const instruction = rawText.substring(1).trim();
      if (!instruction) return;

      if (pendingAction) {
        handleAdminDecision(instruction);
        return;
      }

      await botRepository.addLearnedObservation(bot.id, instruction);
      setLocalLearnedObservations(prev => [...prev, instruction]);
      setStoreContext(prev => prev + `\n- ${instruction}`);
      addSystemMessage(`✅ تم تحديث الذاكرة الدائمة: "${instruction}"`);
      return;
    }

    // --- BUFFERED USER MESSAGE ---
    const currentUserMessage: Message = {
      id: Date.now().toString(),
      text: rawText,
      sender: Sender.USER,
      timestamp: new Date(),
      imageUrl: imagePreviewToSend || undefined
    };
    setMessages(prev => [currentUserMessage, ...prev]);

    bufferRef.current.push({
      text: rawText,
      image: imagePreviewToSend || undefined,
      mimeType: imageToSend?.type
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const hasImage = bufferRef.current.some(item => item.image);
    const waitTime = hasImage ? 8000 : 3000;

    debounceTimerRef.current = setTimeout(() => {
       flushBufferToGemini();
    }, waitTime);
  };

  const handleAdminDecision = async (instruction: string) => {
    if (!pendingAction) return;

    const decisionNote = `توجيه إداري بخصوص (${pendingAction.userMessage}): ${instruction}`;
    await botRepository.addLearnedObservation(bot.id, decisionNote);
    setLocalLearnedObservations(prev => [...prev, decisionNote]);

    setPendingAction(null);
    setHandoffNotification(false); // Clear notification if addressed
    addSystemMessage(`📣 توجيهك: "${instruction}" (تم الحفظ)`);

    // Clear alert in DB
    await botRepository.updatePendingAction(bot.id, null);

    const effectiveBot = {
        ...bot,
        learnedObservations: [...localLearnedObservations, decisionNote]
    };
    // Passing -1 as timeSinceLastMsg because the owner is replying *now*
    const systemInstruction = GENERATE_SYSTEM_INSTRUCTION(effectiveBot, storeContext, userProfile, -1);
    const conversationHistory = [...messages].reverse(); 

    let bridgePrompt = '';
    if (pendingAction.type === 'HOT_LEAD') {
         bridgePrompt = `أنت حولت العميل للمالك، والمالك الآن رد بالمعلومة التالية: "${instruction}".\nالمطلوب: وصل المعلومة للعميل بشكل مباشر لتكملة البيعة.`;
    } else if (pendingAction.type === 'DISCOUNT_REQUEST') {
        bridgePrompt = `توجيه المالك بخصوص الخصم: "${instruction}"\nالمطلوب: بصفتك (${bot.botName})، أعد صياغة هذا التوجيه للعميل بأسلوبك البشري الطبيعي المختصر.`;
    } else {
        bridgePrompt = `العميل سأل: "${pendingAction.userMessage}" وأنت قلت له أنك ستتأكد.\nالآن، المالك أعطاك المعلومة الصحيحة وهي: "${instruction}"\nالمطلوب: جاوب العميل الآن بالمعلومة هذي بأسلوبك اللبق والمختصر.`;
    }
    
    setIsLoading(true);
    try {
      let responseText = await sendMessageToGemini(bridgePrompt, systemInstruction, conversationHistory);
      const responseParts = responseText.split('|||').map(t => t.trim()).filter(t => t);
      
      for (let i = 0; i < responseParts.length; i++) {
        const part = responseParts[i];
        if (i > 0) setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, (part.length * 20) + 300));
        setIsLoading(false);

        const botMessage: Message = {
            id: (Date.now() + i).toString(),
            text: part,
            sender: Sender.AGENT,
            timestamp: new Date(),
        };
        setMessages(prev => [botMessage, ...prev]);
      }
    } catch (error) {
       console.error(error);
       setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg overflow-hidden border-2 border-white shadow-sm">
                {bot.botName.charAt(0)}
            </div>
            <div>
                <h1 className="font-bold text-slate-900 text-base">{bot.botName}</h1>
                <div className="flex items-center gap-1">
                 {bot.isListening ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                      <p className="text-xs text-brand-600 font-bold">وضع الاستماع (تعلم ذاتي)</p>
                    </>
                 ) : (
                    <>
                      <span className={`w-2 h-2 rounded-full ${isBotActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                      <p className="text-xs text-slate-500">{bot.storeName}</p>
                    </>
                 )}
                </div>
            </div>
            </div>

            <div className="flex items-center gap-2">
                <button 
                onClick={() => setShowSimSettings(!showSimSettings)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs font-bold hover:bg-slate-100 transition-all"
                title="محاكاة بيانات العميل"
                >
                <UserCircle2 className="w-4 h-4" />
                <span className="hidden md:inline">بيانات العميل</span>
                {showSimSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <button 
                onClick={() => setIsBotActive(!isBotActive)}
                disabled={bot.isListening}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    bot.isListening 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isBotActive 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                }`}
                title={bot.isListening ? 'لا يمكن تغيير الحالة في وضع الاستماع' : 'تشغيل/إيقاف'}
                >
                <Power className="w-3 h-3" />
                <span className="hidden md:inline">{isBotActive ? 'نشط' : 'متوقف'}</span>
                </button>
            </div>
        </div>
        
        {/* Simulation Panel */}
        {showSimSettings && (
            <div className="bg-slate-50 rounded-xl p-3 text-xs border border-slate-200 animate-in slide-in-from-top-2">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <UserCog className="w-3 h-3" />
                    محاكاة بيانات العميل (Instagram API Simulation)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                        <label className="block text-slate-500 mb-1">Username</label>
                        <input 
                            type="text" 
                            value={userProfile.username}
                            onChange={(e) => setUserProfile({...userProfile, username: e.target.value})}
                            className="w-full px-2 py-1 rounded border border-slate-300 focus:border-brand-500 outline-none bg-white"
                            placeholder="e.g. reem_alharbi"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 mb-1">Full Name</label>
                        <input 
                            type="text" 
                            value={userProfile.fullName}
                            onChange={(e) => setUserProfile({...userProfile, fullName: e.target.value})}
                            className="w-full px-2 py-1 rounded border border-slate-300 focus:border-brand-500 outline-none bg-white"
                            placeholder="e.g. Reem Ahmed"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 mb-1">Bio Keywords</label>
                        <input 
                            type="text" 
                            value={userProfile.bio}
                            onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})}
                            className="w-full px-2 py-1 rounded border border-slate-300 focus:border-brand-500 outline-none bg-white"
                            placeholder="e.g. Mom of 3, Engineer"
                        />
                    </div>
                </div>
            </div>
        )}
      </header>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col-reverse">
        <div ref={messagesEndRef} />
        {isLoading && <LoadingIndicator />}
        
        {/* Sales Handoff Notification Simulation */}
        {handoffNotification && (
           <div className="flex w-full mb-6 justify-center animate-bounce">
              <div className="bg-green-100 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl shadow-md flex items-center gap-2">
                 <BellRing className="w-5 h-5 animate-pulse" />
                 <span>تم إرسال إشعار للمالك: "عميل جاهز للشراء" 📲</span>
              </div>
           </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        
        {bot.isListening && messages.length > 0 && (
             <div className="flex w-full mb-4 justify-center">
                <div className="bg-brand-50 border border-brand-100 text-brand-600 text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-1 animate-pulse">
                   <Ear className="w-3 h-3" />
                   وضع الاستماع مفعل: المساعد يتعلم من ردودك 🧠
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 relative z-20 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <div className="absolute -top-6 left-0 right-0 flex justify-center">
            <div className="bg-slate-800/90 backdrop-blur text-white text-[10px] px-3 py-1 rounded-t-lg shadow-sm flex gap-3">
                <span>للتحدث كمالك: ابدأ بـ <code>.</code></span>
                <span>للأوامر الإدارية: ابدأ بـ <code>!</code></span>
            </div>
        </div>

        {previewUrl && (
          <div className="absolute bottom-full left-4 mb-2 bg-white p-2 rounded-lg shadow-lg border border-slate-200 flex items-start gap-2">
            <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-md" />
            <button 
              onClick={removeImage}
              className="bg-red-100 text-red-500 rounded-full p-1 hover:bg-red-200 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 border border-slate-200"
            title="أرفق صورة"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isRecording ? "جاري الاستماع..." : "اكتب رسالة..."}
              className={`w-full bg-slate-50 border ${isRecording ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} text-slate-900 rounded-2xl py-3 pr-4 pl-10 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-slate-400`}
              dir="auto"
              disabled={isLoading}
            />
            {/* Mic Button absolute positioned at the left (end) of input in RTL */}
            <button
               onClick={toggleRecording}
               className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                 isRecording 
                   ? 'bg-red-500 text-white animate-pulse' 
                   : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100'
               }`}
               title="إدخال صوتي"
            >
               {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={(!inputText.trim() && !selectedImage) || isLoading}
            className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 shadow-lg ${
              (!inputText.trim() && !selectedImage) || isLoading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-brand-600 text-white hover:bg-brand-700 transform active:scale-95'
            }`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 rotate-180">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <button 
        onClick={() => setIsAdminOpen(true)}
        className="fixed bottom-24 left-4 bg-white/90 backdrop-blur p-3 rounded-full shadow-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:scale-110 transition-all z-0"
        title="لوحة التاجر"
      >
        <UserCog className="w-6 h-6" />
      </button>

      <AdminPanel 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)}
        storeContext={storeContext}
        setStoreContext={setStoreContext}
        pendingAction={pendingAction}
      />
    </div>
  );
};