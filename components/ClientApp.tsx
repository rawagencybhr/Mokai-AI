'use client';
import React, { useState, useRef, useEffect } from 'react';
import { BotConfig } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { processFile } from '@/services/fileService';
import { botRepository } from '@/services/botRepository';
import { 
  Settings, MessageSquare, UploadCloud, FileText, 
  Smile, Power, Ear, Instagram, Phone, Save, 
  CheckCircle, ShieldCheck, Mail, HelpCircle, 
  BarChart3, ChevronRight, Check, MapPin, Globe
} from 'lucide-react';
import { RawbotLogo } from './RawbotLogo';

interface ClientAppProps {
  bot: BotConfig;
  onUpdateBot: (bot: BotConfig) => void;
  onExit: () => void;
}

type Tab = 'dashboard' | 'settings' | 'support' | 'stats';

export const ClientApp: React.FC<ClientAppProps> = ({ bot, onUpdateBot, onExit }) => {
  const { t, dir, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Activation State
  const [activationCode, setActivationCode] = useState('');
  const [activationError, setActivationError] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Dashboard State (Local edits before saving)
  const [instructions, setInstructions] = useState(bot.additionalInfo || '');
  const [toneValue, setToneValue] = useState(bot.toneValue || 50);
  const [useEmoji, setUseEmoji] = useState(bot.useEmoji ?? true);
  const [botMode, setBotMode] = useState<'active' | 'listening' | 'off'>(
      bot.isActive 
        ? (bot.isListening ? 'listening' : 'active') 
        : 'off'
  );

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
      botName: bot.botName,
      storeName: bot.storeName,
      location: bot.location,
      workHours: bot.workHours,
      locationUrl: bot.locationUrl || '',
      country: bot.country || ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HANDLERS ---

  const handleActivate = async () => {
    if (!activationCode) return;
    setIsActivating(true);
    setActivationError(false);

    // Simple check: remove dashes/spaces and compare case-insensitive
    const cleanInput = activationCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanKey = bot.licenseKey.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // In a real app, this would verify against the server backend
    if (cleanInput === cleanKey) {
        await botRepository.activateBot(bot.id);
        const updatedBot = { ...bot, isActivated: true, activationDate: new Date().toISOString() };
        onUpdateBot(updatedBot);
    } else {
        setActivationError(true);
    }
    setIsActivating(false);
  };

  const handleSaveInstructions = async () => {
      const updatedBot = { ...bot, additionalInfo: instructions };
      await botRepository.updateBot(updatedBot);
      onUpdateBot(updatedBot);
      alert(t('saveChanges'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const result = await processFile(file);
        const updatedBot = { 
            ...bot, 
            knowledgeBase: (bot.knowledgeBase || '') + `\n[File: ${file.name}]\n${result.content}`,
            lastUploadedFileName: file.name
        };
        await botRepository.updateBot(updatedBot);
        onUpdateBot(updatedBot);
        alert(t('fileProcessed'));
      } catch (err) {
        console.error(err);
        alert('Error processing file');
      }
    }
  };

  const handleBotModeChange = async (mode: 'active' | 'listening' | 'off') => {
      setBotMode(mode);
      let isActive = false;
      let isListening = false;

      if (mode === 'active') {
          isActive = true;
          isListening = false;
      } else if (mode === 'listening') {
          isActive = true;
          isListening = true;
      } else {
          isActive = false;
      }

      const updatedBot = { ...bot, isActive, isListening };
      await botRepository.updateBot(updatedBot);
      onUpdateBot(updatedBot);
  };

  const handleToneChange = async (val: number) => {
      setToneValue(val);
      // Debounce saving in real app, here we save on interaction end typically
      const updatedBot = { ...bot, toneValue: val };
      await botRepository.updateBot(updatedBot);
      onUpdateBot(updatedBot);
  };

  const handleEmojiToggle = async () => {
      const newVal = !useEmoji;
      setUseEmoji(newVal);
      const updatedBot = { ...bot, useEmoji: newVal };
      await botRepository.updateBot(updatedBot);
      onUpdateBot(updatedBot);
  };

  const handleSaveSettings = async () => {
      const updatedBot = { ...bot, ...settingsForm };
      await botRepository.updateBot(updatedBot);
      onUpdateBot(updatedBot);
      setActiveTab('dashboard');
  };

  // --- RENDERERS ---

  if (!bot.isActivated) {
     return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center" dir={dir}>
            <div className="mb-8 animate-pulse">
                <RawbotLogo width={120} height={80} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{t('activationTitle')}</h1>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto text-sm">{t('activationDesc')}</p>
            
            <div className="w-full max-w-xs space-y-4">
                <input 
                    type="text" 
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX"
                    className="w-full p-4 text-center text-xl font-mono tracking-widest border-2 border-slate-200 rounded-2xl focus:border-cyan-500 outline-none uppercase"
                    maxLength={15}
                />
                {activationError && <p className="text-red-500 text-sm font-bold">{t('activationError')}</p>}
                
                <button 
                    onClick={handleActivate}
                    disabled={isActivating || activationCode.length < 5}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-4 rounded-2xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isActivating ? '...' : t('activationBtn')}
                </button>
            </div>
        </div>
     );
  }

  // --- MAIN MERCHANT DASHBOARD ---
  return (
      <div className="min-h-screen bg-slate-50 font-sans pb-20" dir={dir}>
          
          {/* Header */}
          <header className="bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center font-bold text-lg">
                     {bot.storeName.charAt(0)}
                 </div>
                 <div>
                     <h1 className="font-bold text-slate-900 text-sm">{bot.botName}</h1>
                     <p className="text-[10px] text-slate-400 font-medium">{bot.storeName}</p>
                 </div>
             </div>
             <div className="flex items-center gap-3">
                 <button onClick={() => setActiveTab('support')} className="text-slate-400 hover:text-cyan-600"><MessageSquare size={24} /></button>
                 <button onClick={() => setActiveTab('settings')} className="text-slate-400 hover:text-cyan-600"><Settings size={24} /></button>
             </div>
          </header>

          {/* Body Content */}
          <main className="p-4 space-y-4 max-w-lg mx-auto">
             
             {/* 1. Instructions Card */}
             <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                 <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                     <FileText size={18} className="text-cyan-500" />
                     {t('dashInstructionsTitle')}
                 </h2>
                 <textarea 
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={t('dashInstructionsPlaceholder')}
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-cyan-400 outline-none resize-none mb-3"
                 />
                 <button onClick={handleSaveInstructions} className="w-full bg-slate-800 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition-colors">
                     {t('dashSaveInstructions')}
                 </button>
             </div>

             {/* 2. Knowledge Upload */}
             <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                 <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                     <UploadCloud size={18} className="text-cyan-500" />
                     {t('dashUploadTitle')}
                 </h2>
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                 >
                     <UploadCloud size={32} className="mx-auto text-slate-300 mb-2" />
                     <p className="text-sm text-slate-600 font-bold">{t('dashUploadDrag')}</p>
                     <p className="text-[10px] text-slate-400 mt-1">{t('dashUploadFormats')}</p>
                     <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv,.docx,.pdf" onChange={handleFileUpload} />
                 </div>
                 {bot.lastUploadedFileName && (
                     <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                         <CheckCircle size={12} className="text-green-500" />
                         {t('dashLastFile')} <span className="font-bold text-slate-700">{bot.lastUploadedFileName}</span>
                     </p>
                 )}
             </div>

             {/* 3. Behavior Card */}
             <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                 <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Smile size={18} className="text-cyan-500" />
                     {t('dashBehaviorTitle')}
                 </h2>
                 
                 {/* Tone Slider */}
                 <div className="mb-6">
                     <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                         <span>{t('dashToneLabel')}</span>
                         <span className="text-cyan-600">{toneValue < 30 ? t('toneFriendly') : toneValue > 70 ? t('toneFormal') : 'متوازن'}</span>
                     </div>
                     <input 
                        type="range" min="0" max="100" 
                        value={toneValue} onChange={(e) => handleToneChange(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                     />
                 </div>

                 {/* Emoji Toggle */}
                 <div className="flex items-center justify-between mb-6">
                     <div>
                         <p className="text-sm font-bold text-slate-800">{t('dashEmojiLabel')}</p>
                         <p className="text-[10px] text-slate-400">{t('dashEmojiDesc')}</p>
                     </div>
                     <button 
                        onClick={handleEmojiToggle}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${useEmoji ? 'bg-cyan-500' : 'bg-slate-300'}`}
                     >
                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${useEmoji ? (dir === 'rtl' ? '-translate-x-6' : 'translate-x-6') : ''}`} />
                     </button>
                 </div>

                 {/* Bot Mode (Segmented Control) */}
                 <div>
                     <p className="text-sm font-bold text-slate-800 mb-2">{t('dashBotMode')}</p>
                     <div className="flex bg-slate-100 p-1 rounded-xl">
                         {[
                             { id: 'active', label: 'modeActive', icon: Power, color: 'bg-white text-green-600 shadow-sm' },
                             { id: 'listening', label: 'modeListening', icon: Ear, color: 'bg-white text-orange-500 shadow-sm' },
                             { id: 'off', label: 'modeOff', icon: Power, color: 'bg-white text-red-500 shadow-sm' }
                         ].map((m) => (
                             <button
                                key={m.id}
                                onClick={() => handleBotModeChange(m.id as any)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${botMode === m.id ? m.color : 'text-slate-400 hover:text-slate-600'}`}
                             >
                                 <m.icon size={14} /> {t(m.label as any)}
                             </button>
                         ))}
                     </div>
                     <p className="text-[10px] text-slate-400 mt-2 text-center">
                         {t(`mode${botMode.charAt(0).toUpperCase() + botMode.slice(1)}Desc` as any)}
                     </p>
                 </div>
             </div>

             {/* 4. Channels Card */}
             <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                 <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <ShieldCheck size={18} className="text-cyan-500" />
                     {t('dashChannels')}
                 </h2>
                 <div className="grid grid-cols-2 gap-3">
                     <div className={`p-3 rounded-2xl border flex flex-col items-center text-center ${bot.instagramConnected ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100 grayscale'}`}>
                         <Instagram className={`mb-2 ${bot.instagramConnected ? 'text-[#E1306C]' : 'text-slate-400'}`} size={24} />
                         <span className="text-xs font-bold text-slate-700">Instagram</span>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 ${bot.instagramConnected ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'}`}>
                             {bot.instagramConnected ? t('channelActive') : t('channelInactive')}
                         </span>
                     </div>
                     <div className={`p-3 rounded-2xl border flex flex-col items-center text-center ${bot.whatsappConnected ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100 grayscale'}`}>
                         <Phone className={`mb-2 ${bot.whatsappConnected ? 'text-[#25D366]' : 'text-slate-400'}`} size={24} />
                         <span className="text-xs font-bold text-slate-700">WhatsApp</span>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 ${bot.whatsappConnected ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                             {bot.whatsappConnected ? t('channelActive') : t('channelInactive')}
                         </span>
                     </div>
                 </div>
                 <p className="text-[10px] text-slate-400 text-center mt-3">{t('contactSupport')}</p>
             </div>

             {/* Stats Button */}
             <button onClick={() => alert('Stats view mocked')} className="w-full bg-slate-50 border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100">
                 <BarChart3 size={18} />
                 {t('stats')}
             </button>

          </main>

          {/* SLIDE-OVER PANELS */}
          
          {/* Settings Panel */}
          {activeTab === 'settings' && (
              <div className="fixed inset-0 z-50 flex justify-end">
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setActiveTab('dashboard')} />
                  <div className="relative w-full max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 p-6 overflow-y-auto">
                      <div className="flex justify-between items-center mb-8">
                          <h2 className="text-xl font-bold text-slate-800">{t('settingsTitle')}</h2>
                          <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-slate-50 rounded-full"><ChevronRight size={20} className={dir === 'rtl' ? 'rotate-180' : ''} /></button>
                      </div>

                      {/* App Language Toggle */}
                      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                          <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                             <Globe size={18} className="text-cyan-500" />
                             {t('appLanguage')}
                          </label>
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button 
                                  onClick={() => setLanguage('ar')}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'ar' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-400'}`}
                              >
                                  العربية
                              </button>
                              <button 
                                  onClick={() => setLanguage('en')}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-400'}`}
                              >
                                  English
                              </button>
                          </div>
                      </div>

                      {/* Logo Upload Mock */}
                      <div className="flex flex-col items-center mb-8">
                          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-3 border-2 border-dashed border-slate-300">
                              <UploadCloud size={32} className="text-slate-400" />
                          </div>
                          <button className="text-xs text-cyan-600 font-bold underline">{t('uploadLogo')}</button>
                      </div>

                      {/* Editable Fields */}
                      <div className="space-y-4 mb-8">
                          <h3 className="font-bold text-slate-700 text-sm border-b pb-2">{t('storeData')}</h3>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{t('botName')}</label>
                              <input value={settingsForm.botName} onChange={e => setSettingsForm({...settingsForm, botName: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-100" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{t('storeName')}</label>
                              <input value={settingsForm.storeName} onChange={e => setSettingsForm({...settingsForm, storeName: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-100" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{t('location')}</label>
                              <input value={settingsForm.location} onChange={e => setSettingsForm({...settingsForm, location: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-100" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{t('locationUrl')}</label>
                              <input 
                                value={settingsForm.locationUrl} 
                                onChange={e => setSettingsForm({...settingsForm, locationUrl: e.target.value})} 
                                className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-100" 
                                placeholder="https://maps.google.com/..."
                              />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{t('country')}</label>
                            <select 
                                value={settingsForm.country} 
                                onChange={e => setSettingsForm({...settingsForm, country: e.target.value})} 
                                className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-100 appearance-none"
                            >
                                <option value="">{t('selectCountry')}</option>
                                <option value="saudi">{t('saudi')}</option>
                                <option value="kuwait">{t('kuwait')}</option>
                                <option value="uae">{t('uae')}</option>
                                <option value="bahrain">{t('bahrain')}</option>
                                <option value="qatar">{t('qatar')}</option>
                                <option value="oman">{t('oman')}</option>
                                <option value="egypt">{t('egypt')}</option>
                                <option value="jordan">{t('jordan')}</option>
                            </select>
                          </div>
                      </div>

                      {/* Read Only Subscription */}
                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl mb-8">
                           <h3 className="font-bold text-slate-700 text-sm border-b pb-2 border-slate-200">{t('subInfo')}</h3>
                           <div className="flex justify-between text-xs">
                               <span className="text-slate-500">{t('clientId')}</span>
                               {/* Formatted Client ID: 2026-XXXX */}
                               <span className="font-mono font-bold text-slate-700">2026-{bot.id.toString().padStart(4, '0')}</span>
                           </div>
                           <div className="flex justify-between text-xs">
                               <span className="text-slate-500">{t('subDate')}</span>
                               <span className="font-bold text-slate-700">{new Date(bot.createdAt).toLocaleDateString()}</span>
                           </div>
                           <div className="flex justify-between text-xs">
                               <span className="text-slate-500">{t('expDate')}</span>
                               <span className="font-bold text-slate-700">{new Date(bot.subscriptionEndDate).toLocaleDateString()}</span>
                           </div>
                      </div>

                      <button onClick={handleSaveSettings} className="w-full bg-cyan-600 text-white py-4 rounded-xl font-bold shadow-lg">
                          {t('saveChanges')}
                      </button>
                  </div>
              </div>
          )}

          {/* Support Panel */}
          {activeTab === 'support' && (
              <div className="fixed inset-0 z-50 flex justify-end">
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setActiveTab('dashboard')} />
                  <div className="relative w-full max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 p-6">
                      <div className="flex justify-between items-center mb-8">
                          <h2 className="text-xl font-bold text-slate-800">{t('supportTitle')}</h2>
                          <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-slate-50 rounded-full"><ChevronRight size={20} className={dir === 'rtl' ? 'rotate-180' : ''} /></button>
                      </div>

                      <div className="space-y-3">
                          <button className="w-full bg-green-50 text-green-700 p-4 rounded-2xl flex items-center gap-3 font-bold border border-green-100">
                              <Phone size={24} /> {t('contactWhatsapp')}
                          </button>
                          <button className="w-full bg-blue-50 text-blue-700 p-4 rounded-2xl flex items-center gap-3 font-bold border border-blue-100">
                              <Mail size={24} /> {t('sendEmail')}
                          </button>
                          <button className="w-full bg-slate-50 text-slate-700 p-4 rounded-2xl flex items-center gap-3 font-bold border border-slate-200">
                              <HelpCircle size={24} /> {t('faq')}
                          </button>
                      </div>
                  </div>
              </div>
          )}

      </div>
  );
};