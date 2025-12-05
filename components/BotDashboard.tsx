
'use client';
import React, { useState } from 'react';
import { 
  Plus, MoreHorizontal, ExternalLink, Bot, Copy, Instagram, 
  Store, MapPin, PlayCircle, BarChart3, Trash2, Edit, 
  Ear, Smartphone, CheckCircle, X, Save, AlertTriangle, 
  TrendingUp, Users, MessageCircle, Clock, Star, Phone, Globe,
  Search, Power, FileText, UploadCloud, Check, Eye, EyeOff, LayoutGrid, Layers, RefreshCw
} from 'lucide-react';
import { BotConfig, BotPlan, BotStats, BotLanguage } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { processFile } from '@/services/fileService';

interface BotDashboardProps {
  bots: BotConfig[];
  onSelectBot: (bot: BotConfig) => void;
  onAddBot: (bot: BotConfig) => void;
  onUpdateBot: (bot: BotConfig) => void;
  onDeleteBot: (id: number) => void;
  onToggleBotStatus: (id: number) => void;
  onToggleBotListening: (id: number) => void;
  onLaunchClientApp: (bot: BotConfig) => void;
}

export const BotDashboard: React.FC<BotDashboardProps> = ({ 
  bots, 
  onSelectBot,
  onAddBot,
  onUpdateBot,
  onDeleteBot,
  onToggleBotStatus,
  onToggleBotListening,
  onLaunchClientApp
}) => {
  const { t, language, toggleLanguage, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  
  // Selection
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  
  // License Key Visibility State (Map of botId -> boolean)
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});

  // Form/Wizard State
  const [formData, setFormData] = useState<Partial<BotConfig>>({
    botName: '',
    storeName: '',
    location: '',
    businessType: '',
    workHours: '',
    products: '',
    additionalInfo: '',
    toneValue: 50
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleOpenWizard = (bot?: BotConfig) => {
    if (bot) {
      setSelectedBot(bot);
      setFormData(bot);
      setWizardStep(1); 
    } else {
      setSelectedBot(null);
      setWizardStep(1);
      setFormData({
        botName: '',
        storeName: '',
        location: '',
        businessType: '',
        workHours: '',
        products: '',
        additionalInfo: '',
        toneValue: 50,
        platforms: ['instagram'],
        plan: 'starter',
        language: 'ar'
      });
    }
    setIsWizardOpen(true);
  };

  const handleOpenDelete = (bot: BotConfig) => {
    setSelectedBot(bot);
    setIsDeleteModalOpen(true);
  };

  const handleOpenStats = (bot: BotConfig) => {
    setSelectedBot(bot);
    setIsStatsModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedBot) {
      onDeleteBot(selectedBot.id);
      setIsDeleteModalOpen(false);
      setSelectedBot(null);
    }
  };

  const handleSaveBot = () => {
    if (selectedBot) {
        onUpdateBot({ ...selectedBot, ...formData } as BotConfig);
    } else {
        const newId = Math.max(...bots.map(b => b.id), 0) + 1;
        onAddBot({ 
            id: newId, 
            ...formData, 
            isActive: true, 
            createdAt: new Date().toISOString() 
        } as BotConfig);
    }
    setIsWizardOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const result = await processFile(e.target.files[0]);
        // Append to products or specific field
        setFormData(prev => ({
            ...prev,
            products: (prev.products || '') + `\n[Data from ${result.fileName}]:\n${result.content}`
        }));
        alert(t('fileProcessed'));
      } catch (err) {
        console.error(err);
        alert('Error processing file');
      }
    }
  };

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateNewKey = () => {
     // Just a mock generation visual
     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
     const segment = () => Array(4).fill(0).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
     const key = `RWB-${segment()}-${segment()}`;
     // In real app, this would check duplicate keys or call API
     return key;
  };
  
  // Specific handler for regenerating key in Wizard
  const handleRegenerateKeyInWizard = () => {
     const newKey = generateNewKey();
     setFormData(prev => ({ ...prev, licenseKey: newKey }));
  };

  const handleConnectInstagram = (botId: number) => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(`/api/instagram/oauth/start?botId=${botId}`, 'Instagram Connect', `width=${width},height=${height},top=${top},left=${left}`);
  };

  const handleConnectWhatsApp = (botId: number) => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(`/api/whatsapp/oauth/start?botId=${botId}`, 'WhatsApp Connect', `width=${width},height=${height},top=${top},left=${left}`);
  };

  const handleOpenClientPopup = (bot: BotConfig) => {
     const width = 420;
     const height = 800;
     const left = window.screen.width / 2 - width / 2;
     const top = window.screen.height / 2 - height / 2;
     window.open(`/?botId=${bot.id}`, `ClientApp-${bot.id}`, `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
  };

  const copyLicense = (key: string) => {
      navigator.clipboard.writeText(key);
  };

  // Filter Bots
  const filteredBots = bots.filter(bot => 
    bot.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bot.botName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir={dir}>
       {/* Header */}
       <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <button 
            onClick={() => handleOpenWizard()}
            className="bg-[#06b6d4] hover:bg-[#0891b2] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-all text-sm"
          >
             <Plus size={20} />
             {t('addClient')}
          </button>
          
          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} size={18} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className={`w-full bg-slate-100 border border-transparent focus:bg-white focus:border-cyan-400 rounded-xl py-2.5 px-10 outline-none transition-all text-sm text-slate-700 placeholder-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}
              />
          </div>
          
          <div className="flex items-center gap-4">
             <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('appName')}</h1>
                <p className="text-xs text-slate-500 font-medium">{t('appSubtitle')}</p>
             </div>
             
             <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors"
             >
                <Globe size={14} />
                {language === 'ar' ? 'EN' : 'عربي'}
             </button>

             <button className="text-cyan-500 p-2.5 border border-cyan-100 rounded-full hover:bg-cyan-50 transition-colors">
                <MoreHorizontal size={20} />
             </button>
          </div>
       </header>

       {/* Grid Content */}
       <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filteredBots.map(bot => (
             <div key={bot.id} className="bg-white rounded-3xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 relative group hover:border-cyan-200 transition-all duration-300">
                
                {/* Power Toggle 
                    We position it opposite to the start.
                    In RTL, start is Right. So we put action on Left.
                    In LTR, start is Left. So we put action on Right.
                */}
                <div 
                   onClick={() => onToggleBotStatus(bot.id)}
                   className={`absolute top-6 cursor-pointer transition-all p-2 rounded-full shadow-sm border ${
                      bot.isActive 
                      ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' 
                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                   } ${isRTL ? 'left-6' : 'right-6'}`}
                   title={bot.isActive ? t('active') : t('inactive')}
                >
                    <Power size={18} />
                </div>

                {/* Header Info - Aligned to Start */}
                <div className="flex items-start gap-4 mb-6">
                   <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 shadow-sm shrink-0">
                      <Bot size={28} strokeWidth={1.5} />
                   </div>
                   <div className={`flex flex-col ${isRTL ? 'items-start text-right' : 'items-start text-left'}`}>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{bot.storeName}</h3>
                      <p className="text-sm text-slate-500 font-medium">{t('assistant')}: {bot.botName}</p>
                   </div>
                </div>

                {/* License Key Section */}
                <div className="bg-slate-50 rounded-xl p-3 mb-6 flex items-center justify-between border border-slate-100 hover:border-slate-200 transition-colors group/license">
                   <div className={`flex flex-col ${isRTL ? 'items-start text-right' : 'items-start text-left'}`}>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t('licenseKey')}</p>
                      <div className="flex items-center gap-2">
                          <p className="text-sm font-mono text-slate-700 font-bold tracking-wide">
                            {visibleKeys[bot.id] ? bot.licenseKey : '••••-••••-••••'}
                          </p>
                      </div>
                   </div>
                   <div className="flex gap-1">
                      <button 
                         onClick={() => copyLicense(bot.licenseKey)}
                         className="text-slate-400 hover:text-cyan-600 p-1.5"
                         title={t('copyLicense')}
                      >
                         <Copy size={16} />
                      </button>
                      <button 
                         onClick={() => toggleKeyVisibility(bot.id)}
                         className="text-slate-400 hover:text-cyan-600 p-1.5"
                         title={visibleKeys[bot.id] ? t('hideKey') : t('showKey')}
                      >
                         {visibleKeys[bot.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                   </div>
                </div>

                {/* Instagram Section */}
                <div className="mb-4">
                   <div className="flex items-center gap-1.5 mb-2.5">
                      <Instagram size={14} className={bot.instagramConnected ? "text-[#E1306C]" : "text-slate-400"} />
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Instagram</span>
                   </div>
                   
                   {bot.instagramConnected ? (
                      <div className="w-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
                         <CheckCircle size={18} />
                         {t('connected')}
                      </div>
                   ) : (
                      <button 
                        onClick={() => handleConnectInstagram(bot.id)}
                        className="w-full bg-slate-100 text-slate-400 hover:bg-slate-200 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors grayscale hover:grayscale-0"
                      >
                         <Instagram size={18} />
                         {t('connectInstagramBtn')}
                      </button>
                   )}
                </div>

                {/* WhatsApp Section */}
                <div className="mb-6">
                   <div className="flex items-center gap-1.5 mb-2.5">
                      <Phone size={14} className={bot.whatsappConnected ? "text-[#25D366]" : "text-slate-400"} />
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">WhatsApp</span>
                   </div>
                   
                   {bot.whatsappConnected ? (
                      <div className="w-full bg-[#25D366] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
                         <CheckCircle size={18} />
                         {bot.whatsappPhoneNumber || t('connected')}
                      </div>
                   ) : (
                      <button 
                        onClick={() => handleConnectWhatsApp(bot.id)}
                        className="w-full bg-slate-100 text-slate-400 hover:bg-slate-200 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors grayscale hover:grayscale-0"
                      >
                         <Phone size={18} />
                         {t('connectWhatsAppBtn')}
                      </button>
                   )}
                </div>

                {/* Details Section */}
                <div className="space-y-2 mb-6 border-t border-slate-50 pt-4">
                   <div className="flex items-center gap-2.5 text-slate-600 text-sm font-medium">
                      <Store size={16} className="text-slate-400" />
                      <span>{bot.businessType}</span>
                   </div>
                   <div className="flex items-center gap-2.5 text-slate-600 text-sm font-medium">
                      <MapPin size={16} className="text-slate-400" />
                      <span>{bot.location}</span>
                   </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-5 mt-auto">
                   
                   <button 
                     onClick={() => onSelectBot(bot)}
                     className="flex items-center gap-2 text-cyan-600 font-bold text-sm hover:bg-cyan-50 px-4 py-2 rounded-xl transition-colors group/chat"
                   >
                      <PlayCircle size={20} className="group-hover/chat:scale-110 transition-transform" />
                      {t('testChat')}
                   </button>
                   
                   <div className="flex items-center gap-1.5">
                      <button onClick={() => handleOpenStats(bot)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title={t('stats')}>
                         <BarChart3 size={18} />
                      </button>
                      <button onClick={() => handleOpenDelete(bot)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors" title={t('delete')}>
                         <Trash2 size={18} />
                      </button>
                      <button onClick={() => handleOpenWizard(bot)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors" title={t('edit')}>
                         <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => onToggleBotListening(bot.id)} 
                        className={`p-2 rounded-lg transition-colors border ${bot.isListening ? 'text-white bg-orange-500 border-orange-600 shadow-sm animate-pulse' : 'text-slate-400 border-transparent hover:bg-slate-50'}`}
                        title={bot.isListening ? t('listeningOn') : t('listeningOff')}
                      >
                         <Ear size={18} />
                      </button>
                      <button 
                        onClick={() => onLaunchClientApp(bot)} 
                        className="p-2 text-cyan-500 hover:bg-cyan-50 rounded-lg border border-cyan-100 hover:border-cyan-200 transition-colors"
                        title={t('clientLink')}
                      >
                         <Smartphone size={18} />
                      </button>
                   </div>
                </div>
             </div>
          ))}
       </main>

        {/* --- WIZARD MODAL --- */}
        {isWizardOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-100 max-h-[90vh] overflow-hidden flex flex-col">
                    
                    {/* Wizard Header */}
                    <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{t('wizardTitle')}</h2>
                            <p className="text-sm text-slate-400">{t(`step${wizardStep}` as any)}</p>
                        </div>
                        <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={28} />
                        </button>
                    </div>

                    {/* Stepper Progress */}
                    <div className="px-8 py-4 bg-slate-50/50 flex items-center justify-between relative">
                        {[1, 2, 3, 4, 5].map((step) => (
                           <div key={step} className={`z-10 flex flex-col items-center gap-2 ${step <= wizardStep ? 'text-cyan-600' : 'text-slate-300'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === wizardStep ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-200 scale-110' : step < wizardStep ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-400'}`}>
                                 {step < wizardStep ? <Check size={16} /> : step}
                              </div>
                              <span className="text-[10px] font-bold">{t(`step${step}` as any)}</span>
                           </div>
                        ))}
                        {/* Progress Line */}
                        <div className="absolute top-[34px] left-10 right-10 h-1 bg-slate-200 -z-0">
                           <div className="h-full bg-cyan-500 transition-all duration-300 ease-out" style={{ width: `${((wizardStep - 1) / 4) * 100}%` }}></div>
                        </div>
                    </div>
                    
                    {/* Wizard Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        
                        {/* Step 1: Plans */}
                        {wizardStep === 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               {[
                                  { id: 'starter', price: 'price15', color: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', feats: ['featureIG', 'feature500', 'featureImgBasic'] },
                                  { id: 'professional', price: 'price30', color: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', feats: ['featureIGWA', 'feature1500', 'featureImgAdv'] },
                                  { id: 'growth', price: 'price50', color: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', feats: ['featureIGWA', 'feature3000', 'featureImgUltra', 'featureSmartData'] }
                               ].map((plan) => (
                                  <div 
                                    key={plan.id}
                                    onClick={() => setFormData({...formData, plan: plan.id as BotPlan})}
                                    className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all ${formData.plan === plan.id ? `${plan.border} ${plan.color} ring-2 ring-offset-2 ring-cyan-200` : 'border-slate-100 hover:border-slate-200'}`}
                                  >
                                      {formData.plan === plan.id && <div className="absolute top-3 right-3 text-cyan-600"><CheckCircle size={20} /></div>}
                                      <h3 className="font-bold text-slate-800 mb-1">{t(`plan${plan.id.charAt(0).toUpperCase() + plan.id.slice(1)}` as any)}</h3>
                                      <p className={`text-xl font-black mb-4 ${plan.text}`}>{t(plan.price as any)}</p>
                                      <ul className="space-y-2 text-xs text-slate-600">
                                         {plan.feats.map(f => (
                                            <li key={f} className="flex items-center gap-2"><Check size={12} className="text-cyan-500" /> {t(f as any)}</li>
                                         ))}
                                      </ul>
                                  </div>
                               ))}
                            </div>
                        )}

                        {/* Step 2: Identity */}
                        {wizardStep === 2 && (
                           <div className="grid grid-cols-1 gap-6">
                              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('botName')}</label>
                                  <input 
                                      value={formData.botName}
                                      onChange={e => setFormData({...formData, botName: e.target.value})}
                                      className={`w-full p-4 rounded-xl border border-slate-200 focus:border-cyan-400 outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                      placeholder={t('botNamePlaceholder')}
                                  />
                              </div>

                              {/* Language Selection */}
                              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('botLanguage')}</label>
                                  <div className="grid grid-cols-3 gap-2">
                                     {[
                                        { id: 'ar', label: 'langAr' },
                                        { id: 'en', label: 'langEn' },
                                        { id: 'bi', label: 'langBi' }
                                     ].map((lang) => (
                                        <button
                                          key={lang.id}
                                          onClick={() => setFormData({...formData, language: lang.id as BotLanguage})}
                                          className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all ${
                                              formData.language === lang.id 
                                              ? 'bg-cyan-500 text-white border-cyan-500 shadow-md' 
                                              : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-200'
                                          }`}
                                        >
                                           {t(lang.label as any)}
                                        </button>
                                     ))}
                                  </div>
                              </div>

                              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                  <label className="block text-sm font-bold text-slate-700 mb-4">{t('botTone')}</label>
                                  <div className="flex items-center gap-4">
                                      <span className="text-sm font-bold text-slate-500">{t('toneFriendly')}</span>
                                      <input 
                                          type="range" 
                                          min="0" max="100" 
                                          value={formData.toneValue || 50}
                                          onChange={e => setFormData({...formData, toneValue: Number(e.target.value)})}
                                          className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                      />
                                      <span className="text-sm font-bold text-slate-500">{t('toneFormal')}</span>
                                  </div>
                              </div>
                           </div>
                        )}

                        {/* Step 3: Business */}
                        {wizardStep === 3 && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-2">{t('storeName')}</label>
                                      <input 
                                          value={formData.storeName}
                                          onChange={e => setFormData({...formData, storeName: e.target.value})}
                                          className={`w-full p-4 rounded-xl border border-slate-200 focus:border-cyan-400 outline-none bg-slate-50 ${isRTL ? 'text-right' : 'text-left'}`}
                                          placeholder={t('storeNamePlaceholder')}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-2">{t('businessType')}</label>
                                      <input 
                                          value={formData.businessType}
                                          onChange={e => setFormData({...formData, businessType: e.target.value})}
                                          className={`w-full p-4 rounded-xl border border-slate-200 focus:border-cyan-400 outline-none bg-slate-50 ${isRTL ? 'text-right' : 'text-left'}`}
                                          placeholder={t('businessTypePlaceholder')}
                                      />
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-2">{t('location')}</label>
                                      <input 
                                          value={formData.location}
                                          onChange={e => setFormData({...formData, location: e.target.value})}
                                          className={`w-full p-4 rounded-xl border border-slate-200 focus:border-cyan-400 outline-none bg-slate-50 ${isRTL ? 'text-right' : 'text-left'}`}
                                          placeholder={t('locationPlaceholder')}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-2">{t('workHours')}</label>
                                      <input 
                                          value={formData.workHours}
                                          onChange={e => setFormData({...formData, workHours: e.target.value})}
                                          className={`w-full p-4 rounded-xl border border-slate-200 focus:border-cyan-400 outline-none bg-slate-50 ${isRTL ? 'text-right' : 'text-left'}`}
                                          placeholder={t('workHoursPlaceholder')}
                                      />
                                  </div>
                              </div>
                           </div>
                        )}

                        {/* Step 4: Knowledge (File Upload) */}
                        {wizardStep === 4 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('products')}</label>
                                    <textarea 
                                        value={formData.products}
                                        onChange={e => setFormData({...formData, products: e.target.value})}
                                        className={`w-full p-4 rounded-xl border border-slate-200 focus:border-cyan-400 outline-none h-32 resize-none bg-slate-50 ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('productsPlaceholder')}
                                    />
                                </div>
                                
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors">
                                    <UploadCloud size={40} className="mx-auto text-cyan-500 mb-4" />
                                    <h3 className="font-bold text-slate-700 mb-1">{t('uploadData')}</h3>
                                    <p className="text-xs text-slate-400 mb-4">{t('uploadHint')}</p>
                                    <button 
                                      onClick={() => fileInputRef.current?.click()}
                                      className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-sm font-bold hover:border-cyan-400 hover:text-cyan-600 transition-colors"
                                    >
                                       {t('uploadData')}
                                    </button>
                                    <input 
                                       type="file" 
                                       ref={fileInputRef}
                                       className="hidden"
                                       accept=".xlsx,.xls,.csv,.docx,.txt"
                                       onChange={handleFileUpload}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 5: Review */}
                        {wizardStep === 5 && (
                           <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center space-y-4">
                              <div className="w-20 h-20 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                  <Bot size={40} />
                              </div>
                              <h3 className="text-2xl font-bold text-slate-800">{formData.botName}</h3>
                              <p className="text-slate-500">{formData.storeName} - {formData.businessType}</p>
                              <div className="flex flex-wrap justify-center gap-2 mt-4">
                                  <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-600">{formData.location}</span>
                                  <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-600">{formData.workHours}</span>
                                  <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-600">Tone: {formData.toneValue}</span>
                                  <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-600 uppercase">{formData.language}</span>
                              </div>
                              <button onClick={() => handleRegenerateKeyInWizard()} className="text-cyan-600 text-sm font-bold underline mt-4 flex items-center gap-1 mx-auto">
                                  <RefreshCw size={14} />
                                  {t('generateKey')}
                              </button>
                              <p className="font-mono text-sm bg-slate-200 px-4 py-2 rounded-lg inline-block mt-2">{formData.licenseKey || 'RWB-????-????'}</p>
                           </div>
                        )}
                    </div>

                    {/* Wizard Footer */}
                    <div className="mt-auto px-8 py-6 border-t border-slate-100 flex justify-between bg-white rounded-b-[2rem]">
                        <button 
                            onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                            disabled={wizardStep === 1}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            {t('back')}
                        </button>
                        
                        <button 
                            onClick={() => {
                                if (wizardStep < 5) setWizardStep(prev => prev + 1);
                                else handleSaveBot();
                            }}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-cyan-100"
                        >
                            {wizardStep === 5 ? t('finish') : t('next')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedBot && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                       <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('deleteTitle')}</h3>
                    <p className="text-slate-500 mb-8">
                       {t('deleteMessage', { name: selectedBot.storeName })}
                    </p>
                    <div className="flex gap-3">
                       <button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors">{t('confirmDelete')}</button>
                       <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">{t('cancel')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* Stats Modal (Advanced) */}
        {isStatsModalOpen && selectedBot && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-100 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                           <h2 className="text-2xl font-bold text-slate-900">{t('performanceReport')}</h2>
                           <p className="text-slate-500 text-sm">{t('statsSubtitle', { name: selectedBot.storeName })}</p>
                        </div>
                        <button onClick={() => setIsStatsModalOpen(false)} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100"><X size={24} className="text-slate-400" /></button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {/* existing stats + new stats */}
                        {[
                           { label: 'totalConversations', value: selectedBot.stats?.totalConversations || 0, icon: MessageCircle, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
                           { label: 'analyzedImages', value: selectedBot.stats?.analyzedImages || 0, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                           { label: 'generatedImages', value: selectedBot.stats?.generatedImages || 0, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                           { label: 'customerSatisfaction', value: (selectedBot.stats?.customerSatisfaction || 5) + '/5', icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                        ].map((stat, i) => (
                           <div key={i} className={`rounded-2xl p-4 border ${stat.bg} ${stat.border}`}>
                               <div className={`flex items-center gap-2 mb-2 ${stat.color}`}><stat.icon size={18} /><span className="text-xs font-bold uppercase">{t(stat.label as any)}</span></div>
                               <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                           </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><LayoutGrid size={18} /> {t('topQuestions')}</h4>
                            <div className="space-y-3">
                                {(selectedBot.stats?.topQuestions || []).length > 0 ? (
                                    selectedBot.stats?.topQuestions?.map((q, i) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 text-sm text-slate-600 shadow-sm flex gap-3">
                                       <span className="font-bold text-cyan-500">#{i+1}</span> {q}
                                    </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-sm">{t('noData')}</p>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                             <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={18} /> {t('topProducts')}</h4>
                             <div className="space-y-3">
                                {(selectedBot.stats?.topProducts || []).length > 0 ? (
                                    selectedBot.stats?.topProducts?.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <span className="text-sm font-medium text-slate-700">{p}</span>
                                        <span className="bg-cyan-100 text-cyan-700 text-xs px-2 py-1 rounded-full font-bold">#{i+1}</span>
                                    </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-sm">{t('noData')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
