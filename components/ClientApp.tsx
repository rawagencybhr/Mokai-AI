



import React, { useState, useEffect, useRef } from 'react';
import { BotConfig, PendingAction } from '../types';
import { RawbotLogo } from './RawbotLogo';
import { Power, Ear, Upload, Send, MessageCircle, Lock, Key, Calendar, AlertTriangle, ShieldCheck, Phone, Bell, Zap, BellRing, Instagram, Link2, LogOut, CheckCircle2 } from 'lucide-react';
import { botRepository } from '../services/botRepository';
import { processFile } from '../services/fileService';

interface ClientAppProps {
  bot: BotConfig;
  onUpdateBot: (bot: BotConfig) => void;
  onExit: () => void; // To go back to admin dashboard (simulating app close)
}

export const ClientApp: React.FC<ClientAppProps> = ({ bot, onUpdateBot, onExit }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState('');
  const [activeAlert, setActiveAlert] = useState<PendingAction | null>(null);
  
  // Settings Tab State
  const [activeTab, setActiveTab] = useState<'control' | 'settings'>('control');
  
  // Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check Subscription
  const today = new Date();
  const expiryDate = new Date(bot.subscriptionEndDate);
  const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const isExpired = daysRemaining <= 0;
  const isNearExpiry = daysRemaining > 0 && daysRemaining <= 3;

  // --- REAL-TIME ALERT LISTENER ---
  useEffect(() => {
    if (!bot.isActivated || isExpired) return;

    // Request Notification Permission on load
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    const unsubscribe = botRepository.listenToBot(bot.id, (updatedBot) => {
        // Check for NEW pending action
        if (updatedBot.pendingAction && updatedBot.pendingAction.type === 'HOT_LEAD') {
            // If it's a new alert (different from current or current is null)
            const isNew = !activeAlert || (activeAlert.id !== updatedBot.pendingAction.id);
            
            if (isNew) {
                setActiveAlert(updatedBot.pendingAction);
                playRingSound();
                showSystemNotification("🔥 عميل جاهز للشراء!", updatedBot.pendingAction.userMessage);
            }
        } else if (!updatedBot.pendingAction) {
            setActiveAlert(null);
            stopRingSound();
        }
        
        // Update local bot state silently
        onUpdateBot(updatedBot);
    });

    return () => unsubscribe();
  }, [bot.id, bot.isActivated, activeAlert]);

  const playRingSound = () => {
      if (!audioRef.current) {
          audioRef.current = new Audio("https://cdn.freesound.org/previews/336/336912_5121236-lq.mp3"); // Generic phone ring
          audioRef.current.loop = true;
      }
      audioRef.current.play().catch(e => console.log("Audio play failed (interaction needed)", e));
  };

  const stopRingSound = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
  };

  const showSystemNotification = (title: string, body: string) => {
      if (Notification.permission === 'granted') {
          new Notification(title, {
              body: body,
              icon: '/favicon.ico'
          });
      }
  };

  // --- HANDLERS ---

  const handleDismissAlert = async () => {
      setActiveAlert(null);
      stopRingSound();
      await botRepository.updatePendingAction(bot.id, null);
  };

  const handleActivate = async () => {
    setError('');
    setIsActivating(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Normalize comparison: Remove dashes and spaces, Case Insensitive
    const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (normalize(inputKey) === normalize(bot.licenseKey || '')) {
      const updatedBot = { ...bot, isActivated: true, activationDate: new Date().toISOString() };
      await botRepository.activateBot(bot.id);
      onUpdateBot(updatedBot);
    } else {
      setError('كود التفعيل غير صحيح. تأكد من تطابق الأحرف والأرقام.');
    }
    setIsActivating(false);
  };

  const handleToneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    const updatedBot = { ...bot, toneValue: val };
    // Optimistic update
    onUpdateBot(updatedBot);
    // Save to DB
    await botRepository.updateBot(updatedBot);
  };

  const handleToggleStatus = async () => {
    if (isExpired) return;
    const updatedBot = { ...bot, isActive: !bot.isActive };
    onUpdateBot(updatedBot);
    await botRepository.toggleBotStatus(bot.id);
  };

  const handleToggleListening = async () => {
    if (isExpired) return;
    const updatedBot = { ...bot, isListening: !bot.isListening };
    onUpdateBot(updatedBot);
    await botRepository.toggleBotListening(bot.id);
  };

  const handleSendCommand = async () => {
    if (!commandText.trim()) return;
    
    // Add command to memory
    await botRepository.addLearnedObservation(bot.id, `توجيه المالك: ${commandText}`);
    
    // Feedback
    setCommandText('');
    window.alert('تم إرسال التوجيه للمساعد بنجاح ✅');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingFile(true);
      setUploadFeedback('');
      const file = e.target.files[0];
      try {
        const result = await processFile(file);
        // Append to knowledge base
        const newKnowledge = `\n\n=== ملف جديد من المالك (${file.name}) ===\n${result.content}`;
        const updatedBot = { ...bot, knowledgeBase: (bot.knowledgeBase || '') + newKnowledge };
        
        await botRepository.updateBot(updatedBot);
        onUpdateBot(updatedBot);
        setUploadFeedback(`تم استيعاب ${file.name} بنجاح ✅`);
      } catch (error) {
        setUploadFeedback('فشل رفع الملف. تأكد من الصيغة ❌');
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  // --- PLATFORM CONNECTION HANDLERS ---
  const handleConnectInstagram = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Open OAuth Popup
    window.open(
        `/api/instagram/oauth/start?botId=${bot.id}`,
        'Instagram Connect',
        `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  const handleDisconnectInstagram = async () => {
      if (window.confirm('هل أنت متأكد من إلغاء ربط انستقرام؟')) {
          await botRepository.disconnectInstagram(bot.id);
          const updatedBot = { 
              ...bot, 
              instagramConnected: false, 
              instagramAccessToken: undefined,
              instagramUsername: undefined 
          };
          onUpdateBot(updatedBot);
      }
  };

  const handleConnectWhatsApp = async () => {
      const phoneNumber = window.prompt("لربط الواتساب (محاكاة)، يرجى إدخال رقم الهاتف مع الرمز الدولي:", "9665...");
      if (phoneNumber) {
          await botRepository.connectWhatsApp(bot.id, phoneNumber);
          const updatedBot = { ...bot, whatsappConnected: true, whatsappPhoneNumber: phoneNumber };
          onUpdateBot(updatedBot);
          window.alert(`تم ربط الواتساب بنجاح بالرقم ${phoneNumber} ✅`);
      }
  };

  const handleDisconnectWhatsApp = async () => {
      if (window.confirm('هل أنت متأكد من إلغاء ربط الواتساب؟')) {
          await botRepository.disconnectWhatsApp(bot.id);
          const updatedBot = { ...bot, whatsappConnected: false, whatsappPhoneNumber: undefined };
          onUpdateBot(updatedBot);
      }
  };

  // --- LOCKED SCREEN ---
  if (!bot.isActivated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white" dir="rtl">
        <div className="w-20 h-20 mb-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl">
          <Lock className="w-10 h-10 text-brand-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">تفعيل المساعد الذكي</h1>
        <p className="text-slate-400 text-center mb-8 max-w-xs text-sm">
          أهلاً بك في RAWBOT. لتشغيل مساعدك الخاص بـ <span className="text-brand-300 font-bold">"{bot.storeName}"</span>، يرجى إدخال كود التفعيل المزود لك.
        </p>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-bold">License Key (كود التفعيل)</label>
            <div className="relative">
              <Key className="absolute right-3 top-3.5 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                placeholder="RWB-XXXX-XXXX"
                dir="ltr"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pr-10 pl-4 text-center tracking-widest font-mono text-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none uppercase placeholder-slate-600 shadow-inner"
              />
            </div>
            {error && <p className="text-red-400 text-xs mt-2 text-center animate-pulse">{error}</p>}
          </div>

          <button
            onClick={handleActivate}
            disabled={isActivating || inputKey.length < 5}
            className="w-full bg-gradient-to-r from-brand-600 to-brand-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-500/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isActivating ? (
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>تفعيل التطبيق</span>
                <ShieldCheck className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
        
        <p className="fixed bottom-6 text-xs text-slate-600">RAWBOT v2.5 Secure System</p>
      </div>
    );
  }

  // --- MAIN APP (UNLOCKED) ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans relative" dir="rtl">
      
      {/* --- HOT LEAD ALERT OVERLAY --- */}
      {activeAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-6 animate-in fade-in zoom-in duration-300">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-green-500 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-green-500 animate-pulse"></div>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <BellRing className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">🔥 عميل صامل!</h2>
                  <p className="text-slate-600 mb-6 font-medium">العميل جاهز للشراء ويحتاج تدخلك لإتمام الصفقة الآن.</p>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-6 text-right">
                       <p className="text-[10px] text-slate-400 font-bold mb-1">آخر رسالة:</p>
                       <p className="text-sm font-bold text-slate-800 line-clamp-2">"{activeAlert.userMessage}"</p>
                  </div>

                  <button 
                    onClick={handleDismissAlert}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-200 active:scale-95 transition-all"
                  >
                      استلام المحادثة ✅
                  </button>
              </div>
          </div>
      )}

      {/* Alert Banner */}
      {isExpired ? (
        <div className="bg-red-600 text-white px-4 py-3 text-center text-sm font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          انتهى اشتراك المساعد. يرجى التجديد لاستئناف العمل.
        </div>
      ) : isNearExpiry ? (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-3 h-3" />
          تنبيه: سينتهي الاشتراك خلال {daysRemaining} أيام.
        </div>
      ) : null}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
             <RawbotLogo width={36} height={36} />
             <div>
               <h1 className="font-bold text-slate-900 text-sm">{bot.storeName}</h1>
               <div className="flex items-center gap-1">
                 <span className={`w-1.5 h-1.5 rounded-full ${bot.isActive && !isExpired ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                 <p className="text-[10px] text-slate-500">
                   {isExpired ? 'متوقف (اشتراك)' : bot.isActive ? 'المساعد يعمل' : 'متوقف يدوياً'}
                 </p>
               </div>
             </div>
          </div>
          <button onClick={onExit} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition">
            <Power className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-t border-slate-100">
          <button 
            onClick={() => setActiveTab('control')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'control' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            التحكم والذكاء
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            الإعدادات
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* === CONTROL TAB === */}
        {activeTab === 'control' && (
          <>
            {/* 1. Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleToggleStatus}
                disabled={isExpired}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 shadow-sm ${
                  bot.isActive 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-white border-slate-300 text-slate-400 hover:bg-slate-50'
                } ${isExpired ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
              >
                <Power className={`w-8 h-8 ${bot.isActive ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span className="font-bold text-sm">التشغيل</span>
              </button>

              <button 
                onClick={handleToggleListening}
                disabled={isExpired}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 shadow-sm ${
                  bot.isListening 
                    ? 'bg-brand-50 border-brand-200 text-brand-700' 
                    : 'bg-white border-slate-300 text-slate-400 hover:bg-slate-50'
                } ${isExpired ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
              >
                <Ear className={`w-8 h-8 ${bot.isListening ? 'text-brand-500' : 'text-slate-300'}`} />
                <span className="font-bold text-sm">الاستماع</span>
              </button>
            </div>

            {/* 2. Tone Slider */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-800 text-sm">شخصية المساعد 🎭</h3>
                 <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-600 border border-slate-200">
                    {bot.toneValue <= 25 ? 'ودي (خوي) 😎' : bot.toneValue >= 75 ? 'رسمي جداً 👔' : 'بائع محترف 🤝'}
                 </span>
              </div>
              
              {/* Slider Container - Forced LTR for consistent slider logic */}
              <div className="relative h-12 flex items-center px-2" dir="ltr">
                {/* Track Background */}
                <div className="absolute left-2 right-2 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                   {/* Active Fill */}
                   <div 
                      className="h-full bg-gradient-to-r from-brand-600 to-emerald-400 transition-all duration-150 ease-out" 
                      style={{ width: `${bot.toneValue}%` }} 
                   ></div>
                </div>
                
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={bot.toneValue || 50} 
                  onChange={handleToneChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {/* Thumb Visual */}
                <div 
                  className="absolute w-6 h-6 bg-white border-2 border-brand-600 rounded-full shadow-md pointer-events-none transition-transform duration-150 ease-out flex items-center justify-center"
                  style={{ 
                     left: `calc(${bot.toneValue}% - 12px)`
                  }}
                >
                    <div className="w-1.5 h-1.5 bg-brand-600 rounded-full opacity-50"></div>
                </div>
              </div>

              {/* Labels - Forced LTR to match physical slider position */}
              <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold" dir="ltr">
                 <span>ودّي / خوي</span>
                 <span>رسمي / شركة</span>
              </div>
            </div>

            {/* 3. Direct Commands */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-3">توجيهات للمساعد 💬</h3>
              <textarea 
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder="مثال: لا تعطي خصم، عندنا عرض جديد، لا ترد على التعليقات..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 mb-3 placeholder-slate-400"
              />
              <button 
                onClick={handleSendCommand}
                disabled={!commandText.trim()}
                className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                إرسال التوجيه
              </button>
            </div>

            {/* 4. Knowledge Upload */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-3">تغذية المعلومات 🧠</h3>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".pdf,.docx,.xlsx,.txt"
                  onChange={handleFileUpload}
                  disabled={isProcessingFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button 
                  className="w-full py-3 border-2 border-dashed border-brand-200 bg-brand-50 text-brand-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-100 transition-colors"
                >
                  {isProcessingFile ? (
                    <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isProcessingFile ? 'جاري التحليل...' : 'رفع ملف (PDF, Excel, Word)'}
                </button>
              </div>
              {uploadFeedback && (
                <p className="text-xs text-center mt-2 text-emerald-600 font-bold animate-in fade-in">{uploadFeedback}</p>
              )}
            </div>
          </>
        )}

        {/* === SETTINGS TAB === */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            
            {/* PLATFORM CONNECTIONS SECTION - DYNAMIC BASED ON ADMIN SELECTION */}
            {bot.platforms && bot.platforms.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                   <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
                     <Link2 className="w-4 h-4" />
                     ربط المنصات
                   </h3>
                   <div className="space-y-3">
                       
                       {/* Instagram Connection */}
                       {bot.platforms.includes('instagram') && (
                           <div className={`border rounded-xl p-4 transition-all ${bot.instagramConnected ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                               <div className="flex items-center justify-between mb-3">
                                   <div className="flex items-center gap-2">
                                       <div className={`p-2 rounded-lg ${bot.instagramConnected ? 'bg-white text-purple-600' : 'bg-white text-slate-400'}`}>
                                            <Instagram className="w-5 h-5" />
                                       </div>
                                       <div>
                                           <h4 className={`font-bold text-sm ${bot.instagramConnected ? 'text-purple-900' : 'text-slate-700'}`}>Instagram</h4>
                                           <p className="text-xs text-slate-500">
                                               {bot.instagramConnected ? `متصل: @${bot.instagramUsername}` : 'غير متصل'}
                                           </p>
                                       </div>
                                   </div>
                                   {bot.instagramConnected && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                               </div>
                               
                               {bot.instagramConnected ? (
                                   <button 
                                      onClick={handleDisconnectInstagram}
                                      className="w-full py-2 bg-white border border-purple-200 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 flex items-center justify-center gap-2"
                                   >
                                       <LogOut className="w-3 h-3" />
                                       إلغاء الربط
                                   </button>
                               ) : (
                                   <button 
                                      onClick={handleConnectInstagram}
                                      className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2"
                                   >
                                       <Link2 className="w-3 h-3" />
                                       ربط حساب انستغرام
                                   </button>
                               )}
                           </div>
                       )}

                       {/* WhatsApp Connection */}
                       {bot.platforms.includes('whatsapp') && (
                           <div className={`border rounded-xl p-4 transition-all ${bot.whatsappConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                               <div className="flex items-center justify-between mb-3">
                                   <div className="flex items-center gap-2">
                                       <div className={`p-2 rounded-lg ${bot.whatsappConnected ? 'bg-white text-emerald-600' : 'bg-white text-slate-400'}`}>
                                            <MessageCircle className="w-5 h-5" />
                                       </div>
                                       <div>
                                           <h4 className={`font-bold text-sm ${bot.whatsappConnected ? 'text-emerald-900' : 'text-slate-700'}`}>WhatsApp</h4>
                                           <p className="text-xs text-slate-500">
                                               {bot.whatsappConnected ? `متصل: ${bot.whatsappPhoneNumber}` : 'غير متصل'}
                                           </p>
                                       </div>
                                   </div>
                                   {bot.whatsappConnected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                               </div>
                               
                               {bot.whatsappConnected ? (
                                   <button 
                                      onClick={handleDisconnectWhatsApp}
                                      className="w-full py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-50 flex items-center justify-center gap-2"
                                   >
                                       <LogOut className="w-3 h-3" />
                                       إلغاء الربط
                                   </button>
                               ) : (
                                   <button 
                                      onClick={handleConnectWhatsApp}
                                      className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
                                   >
                                       <Link2 className="w-3 h-3" />
                                       ربط الواتساب
                                   </button>
                               )}
                           </div>
                       )}

                   </div>
                </div>
            )}

            {/* License Info (Read Only) */}
            <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-300 to-gray-400"></div>
               <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" />
                 ترخيص الاستخدام
               </h3>
               
               <div className="space-y-4">
                 <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Bot Name</label>
                    <p className="font-bold text-slate-800">{bot.botName}</p>
                 </div>
                 
                 <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">License Key</label>
                    <div className="bg-white border border-slate-300 rounded-lg p-3 font-mono text-slate-600 text-center tracking-widest text-sm mt-1 select-all shadow-sm">
                       {bot.licenseKey}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                           <Calendar className="w-3 h-3" />
                           تاريخ التفعيل
                        </label>
                        <p className="text-xs font-bold text-slate-700 mt-1">
                           {bot.activationDate ? new Date(bot.activationDate).toLocaleDateString('en-GB') : '-'}
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                           <AlertTriangle className="w-3 h-3" />
                           تاريخ الانتهاء
                        </label>
                        <p className={`text-xs font-bold mt-1 ${isNearExpiry || isExpired ? 'text-red-600' : 'text-slate-700'}`}>
                           {new Date(bot.subscriptionEndDate).toLocaleDateString('en-GB')}
                        </p>
                    </div>
                 </div>
               </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
               <p className="text-sm text-slate-500 mb-4">تواجه مشكلة أو تريد تجديد الاشتراك؟</p>
               <button className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200">
                  <MessageCircle className="w-5 h-5" />
                  تواصل مع الدعم الفني
               </button>
            </div>

            <div className="text-center pt-8">
               <p className="text-xs text-slate-400">RAWBOT PWA Client v2.5</p>
               <p className="text-[10px] text-slate-300 mt-1">Device ID: {bot.id}-SECURE</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};