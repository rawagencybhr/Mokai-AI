





import React, { useState } from 'react';
import { Plus, MessageCircle, Instagram, MessageSquare, Bot, ArrowRight, ArrowLeft, Check, Store, Clock, Languages, Package, PlayCircle, MapPin, Trash2, Edit, PauseCircle, Play, FileText, Upload, X, BarChart3, Users, Zap, TrendingUp, Calendar, ShoppingBag, BrainCircuit, Activity, Timer, ShieldCheck, AlertTriangle, Ear, Smartphone, Copy, CheckCheck, Share2, ExternalLink, Link2, LogOut } from 'lucide-react';
import { BotConfig } from '../types';
import { processFile, FileProcessingResult } from '../services/fileService';
import { RawbotLogo } from './RawbotLogo';
import { botRepository } from '../services/botRepository';

interface BotDashboardProps {
  bots: BotConfig[];
  onSelectBot: (bot: BotConfig) => void;
  onAddBot: (bot: BotConfig) => void;
  onUpdateBot: (bot: BotConfig) => void;
  onDeleteBot: (id: number) => void;
  onToggleBotStatus: (id: number) => void;
  onToggleBotListening: (id: number) => void;
  // New prop to launch client view
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
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingBotId, setEditingBotId] = useState<number | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileProcessingResult[]>([]);
  
  // Delete Confirmation State
  const [botToDelete, setBotToDelete] = useState<BotConfig | null>(null);

  // Statistics Modal State
  const [statsBot, setStatsBot] = useState<BotConfig | null>(null);

  // Copy State
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const [sharedLinkBotId, setSharedLinkBotId] = useState<number | null>(null);

  const initialFormData = {
    botName: '',
    storeName: '',
    location: '',
    businessType: '',
    workHours: '',
    language: 'العربية فقط 🇸🇦',
    tone: 'friendly', // Default
    plan: 'starter', // Default
    products: '',
    additionalInfo: '',
    platforms: [] as string[]
  };

  const [formData, setFormData] = useState(initialFormData);
  const [botResponse, setBotResponse] = useState('');

  const copyToClipboard = async (text: string, onSuccess: () => void) => {
    // 1. Try Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            onSuccess();
            return;
        } catch (err) {
            console.warn('Modern clipboard failed, trying fallback...', err);
        }
    }

    // 2. Robust Fallback
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "0";
        textArea.style.top = "0";
        textArea.style.opacity = "0";
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) onSuccess();
        else throw new Error('execCommand returned false');
    } catch (e) {
        prompt("عذراً، انسخ الرابط يدوياً:", text);
    }
  };

  const handleCopyLicense = (key: string, id: number) => {
    if (!key) return;
    copyToClipboard(key, () => {
        setCopiedKeyId(id);
        setTimeout(() => setCopiedKeyId(null), 2000);
    });
  };

  const handleShareLink = (e: React.MouseEvent, botId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create the direct link
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const directLink = `${origin}${pathname}?botId=${botId}`;

    copyToClipboard(directLink, () => {
        setSharedLinkBotId(botId);
        setTimeout(() => setSharedLinkBotId(null), 2000);
    });
  };

  const handleConnectInstagram = (e: React.MouseEvent, botId: number) => {
    e.preventDefault();
    e.stopPropagation();

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Open OAuth Popup
    window.open(
        `/api/instagram/oauth/start?botId=${botId}`,
        'Instagram Connect',
        `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  const handleDisconnectInstagram = async (e: React.MouseEvent, botId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من إلغاء ربط حساب انستقرام؟ سيتوقف الرد الآلي.')) {
        await botRepository.disconnectInstagram(botId);
        // We rely on parent state update or realtime listener to reflect changes
        // Since bots prop is passed down, we assume App.tsx updates it.
        // For immediate feedback in UI, we could trigger a refresh callback.
        // For now, assume optimistic update is handled by parent or realtime listener.
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingFile(true);
      const file = e.target.files[0];
      try {
        const result = await processFile(file);
        setUploadedFiles(prev => [...prev, result]);
        setBotResponse(`تم استيعاب ملف "${file.name}" بنجاح! 📂\nصار عندي خبرة أكثر بمنتجات العميل.`);
        
        setTimeout(() => {
          setBotResponse('');
        }, 3000);

      } catch (error) {
        alert('حدث خطأ أثناء معالجة الملف. تأكد أنه ملف نصي أو إكسل صالح.');
        console.error(error);
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ... (Steps configuration omitted for brevity, logic remains same)
  const steps = [
    {
      title: 'بيانات المساعد 🤖',
      icon: Bot,
      question: 'أهلاً بك في لوحة الإعداد.\n\nما هو الاسم الذي سيظهر للعملاء (اسم المساعد الذكي)؟',
      response: (value: string) => `ممتاز! تم اعتماد اسم "${value}" للمساعد.`,
      fields: [
        { name: 'botName', placeholder: 'مثال: مساعد خدمة العملاء، سارة، متجر الأناقة...', type: 'text' }
      ]
    },
    {
      title: 'بيانات العميل (المتجر) 🏪',
      icon: Store,
      question: (botName: string) => `الآن، لنوثق بيانات العميل التجاري الذي سيعمل "${botName}" لصالحه.`,
      response: (value: string) => `تم تسجيل متجر "${value}".`,
      fields: [
        { name: 'storeName', label: 'اسم المتجر / العميل', placeholder: 'اسم المتجر التجاري', type: 'text' },
        { name: 'businessType', label: 'نوع النشاط', placeholder: 'أثاث، مطعم، عيادة، عقارات...', type: 'text' },
        { name: 'plan', label: 'مستوى الخدمة (B2B Plan)', type: 'select', options: ['starter', 'professional', 'growth'] }
      ]
    },
    {
      title: 'الموقع والنطاق 📍',
      icon: MapPin,
      question: () => `أين يقع هذا النشاط التجاري؟\n(هذه المعلومة ستستخدم لتوجيه الزبائن للفرع)`,
      response: () => `تمام، تم حفظ الموقع.`,
      fields: [
        { name: 'location', placeholder: 'مثلاً: الرياض، حي الملقا - رابط قوقل ماب', type: 'text' }
      ]
    },
    {
      title: 'أوقات العمل واللغة ⏰',
      icon: Clock,
      question: () => `حدد أوقات العمل الرسمية للعميل ولغة الرد المفضلة.`,
      response: () => `إعدادات ممتازة.`,
      fields: [
        { name: 'workHours', placeholder: 'مثلاً: السبت - الخميس من 9 ص لـ 11 م', type: 'text' },
        { name: 'language', label: 'لغة المساعد', type: 'select', options: ['العربية فقط 🇸🇦', 'English Only 🌍', 'الاثنين معاً 🌐'] }
      ]
    },
    {
      title: 'قاعدة المعرفة (Files) 📂',
      icon: FileText,
      question: () => `هل توجد ملفات (منيو، كتالوج، سياسات) خاصة بهذا العميل؟\nارفعها هنا لتدريب المساعد عليها.`,
      response: () => `تمت معالجة الملفات بنجاح.`,
      fields: [
        { name: 'files', type: 'fileUpload' }
      ]
    },
    {
      title: 'المنتجات والخدمات ✨',
      icon: Package,
      question: () => `اكتب ملخصاً سريعاً عن أهم المنتجات أو الخدمات.\n(سيستخدمها المساعد كمرجع سريع)`,
      response: () => `معلومات واضحة وغنية.`,
      fields: [
        { name: 'products', label: 'أبرز المنتجات/الخدمات:', placeholder: 'مثال:\n- برجر لحم واغيو\n- فرايز بالجبن\n- مشروبات غازية', type: 'textarea' },
        { name: 'additionalInfo', label: 'ملاحظات إضافية (سياسات، عروض):', placeholder: 'مثل: التوصيل عبر تطبيقات التوصيل فقط، لا يوجد حجز مسبق...', type: 'textarea' }
      ]
    },
    {
      title: 'تفعيل القنوات 📱',
      icon: MessageCircle,
      question: () => `ما هي المنصات التي سيتم تفعيل المساعد عليها لهذا العميل؟\n(ستظهر أزرار الربط في تطبيق العميل)`,
      response: () => `تم إعداد العميل بنجاح! 🚀`,
      fields: [
        { name: 'platforms', type: 'platforms' }
      ]
    }
  ];

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData((prev: any) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p: string) => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const currentStepData = steps[currentStep];
      let responseText = '';
      
      if (currentStep === 0) {
        // @ts-ignore
        responseText = currentStepData.response(formData.botName);
      } else if (currentStep === 1) { 
        // @ts-ignore
        responseText = currentStepData.response(formData.storeName);
      } else {
        // @ts-ignore
        responseText = currentStepData.response();
      }
      
      setBotResponse(responseText);
      
      setTimeout(() => {
        setBotResponse('');
        setCurrentStep(currentStep + 1);
      }, 1500);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const combinedKnowledgeBase = uploadedFiles.map(f => `=== FILE: ${f.fileName} ===\n${f.content}`).join('\n\n');

    if (editingBotId) {
      const existingBot = bots.find(b => b.id === editingBotId);
      if (existingBot) {
         const updatedBot: BotConfig = {
             ...existingBot,
             ...formData as any,
             knowledgeBase: combinedKnowledgeBase || existingBot.knowledgeBase
         };
         onUpdateBot(updatedBot);
      }
    } else {
      const newBot: BotConfig = {
        id: Date.now(),
        ...formData as any,
        knowledgeBase: combinedKnowledgeBase,
        isActive: true,
        isListening: false,
        createdAt: new Date().toISOString(),
        licenseKey: 'PENDING',
        isActivated: false,
        subscriptionEndDate: new Date().toISOString(),
        toneValue: 50,
        instagramConnected: false,
        whatsappConnected: false
      };
      onAddBot(newBot);
    }
    
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBotId(null);
    setCurrentStep(0);
    setFormData(initialFormData);
    setUploadedFiles([]);
    setBotResponse('');
  };

  const handleEditBot = (bot: BotConfig) => {
    setEditingBotId(bot.id);
    setFormData({
      botName: bot.botName,
      storeName: bot.storeName,
      location: bot.location,
      businessType: bot.businessType,
      workHours: bot.workHours,
      language: bot.language,
      tone: bot.tone || 'friendly',
      plan: bot.plan || 'starter',
      products: bot.products,
      additionalInfo: bot.additionalInfo,
      platforms: bot.platforms || []
    });
    setShowModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, bot: BotConfig) => {
    e.preventDefault();
    e.stopPropagation();
    setBotToDelete(bot);
  };

  const handleConfirmDelete = () => {
    if (botToDelete) {
      onDeleteBot(botToDelete.id);
      setBotToDelete(null);
    }
  };

  const handleEditClick = (e: React.MouseEvent, bot: BotConfig) => {
    e.preventDefault();
    e.stopPropagation();
    handleEditBot(bot);
  };

  const handleToggleClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleBotStatus(id);
  };

  const handleListeningToggleClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleBotListening(id);
  };

  const handleStatsClick = (e: React.MouseEvent, bot: BotConfig) => {
    e.preventDefault();
    e.stopPropagation();
    setStatsBot(bot);
  };

  const handleClientAppClick = (e: React.MouseEvent, bot: BotConfig) => {
    e.preventDefault();
    e.stopPropagation();
    onLaunchClientApp(bot);
  };

  const isStepValid = () => {
    const currentFields = steps[currentStep].fields;
    return currentFields.every(field => {
      if (field.type === 'platforms') {
        // @ts-ignore
        return formData.platforms.length > 0;
      }
      if (field.type === 'fileUpload') {
        return true; 
      }
      // @ts-ignore
      return formData[field.name]?.trim() !== '';
    });
  };

  const renderField = (field: any) => {
    // ... (rendering logic same as before)
    if (field.type === 'fileUpload') {
      return (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-brand-50 hover:border-brand-400 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv,.docx,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessingFile}
            />
            {isProcessingFile ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-2"></div>
                <p className="text-brand-600 font-medium">جاري قراءة الملف...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                 <Upload className="w-10 h-10 text-slate-400 mb-2" />
                 <p className="text-slate-600 font-medium">اضغط لرفع ملف (Excel, Word)</p>
                 <p className="text-xs text-slate-400 mt-1">سأقوم باستخراج بيانات العميل تلقائياً</p>
              </div>
            )}
          </div>
        </div>
      )
    }
    if (field.type === 'platforms') {
        return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handlePlatformToggle('instagram')}
              // @ts-ignore
              className={`p-4 rounded-xl border-2 transition-all ${
                // @ts-ignore
                formData.platforms.includes('instagram')
                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                  : 'border-slate-200 hover:border-purple-300'
              }`}
            >
              <Instagram className={`w-8 h-8 mx-auto mb-2 ${
                // @ts-ignore
                formData.platforms.includes('instagram') ? 'text-purple-600' : 'text-slate-400'
              }`} />
              <div className="text-sm font-medium">Instagram</div>
              {/* @ts-ignore */}
              {formData.platforms.includes('instagram') && (
                <div className="text-xs text-purple-600 mt-1">✓ مفعّل</div>
              )}
            </button>
            <button
              type="button"
              onClick={() => handlePlatformToggle('whatsapp')}
              // @ts-ignore
              className={`p-4 rounded-xl border-2 transition-all ${
                // @ts-ignore
                formData.platforms.includes('whatsapp')
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                  : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <MessageSquare className={`w-8 h-8 mx-auto mb-2 ${
                // @ts-ignore
                formData.platforms.includes('whatsapp') ? 'text-emerald-600' : 'text-slate-400'
              }`} />
              <div className="text-sm font-medium">WhatsApp</div>
              {/* @ts-ignore */}
              {formData.platforms.includes('whatsapp') && (
                <div className="text-xs text-emerald-600 mt-1">✓ مفعّل</div>
              )}
            </button>
          </div>
        </div>
      );
    }
    if (field.type === 'select') {
        return (
        <div key={field.name}>
          {field.label && <label className="block text-sm font-medium text-slate-700 mb-2">{field.label}</label>}
          <select
            // @ts-ignore
            value={formData[field.name]}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
          >
            {field.options.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    }
    if (field.type === 'textarea') {
         return (
        <div key={field.name}>
          {field.label && <label className="block text-sm font-medium text-slate-700 mb-2">{field.label}</label>}
          <textarea
            // @ts-ignore
            value={formData[field.name]}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={5}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-white"
          />
        </div>
      );
    }
    return (
      <div key={field.name}>
        {field.label && <label className="block text-sm font-medium text-slate-700 mb-2">{field.label}</label>}
        <input
          type={field.type}
          // @ts-ignore
          value={formData[field.name]}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RawbotLogo width={50} height={30} />
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">RAWBOT Operations</h1>
                <p className="text-sm text-slate-500">لوحة إدارة المساعدين الذكيين</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                onClick={() => {
                    setEditingBotId(null);
                    setFormData(initialFormData);
                    setShowModal(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-md transition-all hover:scale-105"
                >
                <Plus className="w-5 h-5" />
                <span className="font-medium">تسجيل عميل جديد</span>
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {bots.length === 0 ? (
          <div className="text-center py-20">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                <Bot className="w-10 h-10 text-slate-400" />
             </div>
             <h3 className="text-lg font-bold text-slate-900 mb-2">لا يوجد عملاء بعد</h3>
             <p className="text-slate-500 mb-6">ابدأ بإضافة أول متجر أو شركة لاستخدام المساعد الذكي.</p>
             <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
             >
                إضافة عميل جديد
             </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map(bot => (
              // Enhanced contrast: Increased border color from slate-100 to slate-200/300, added bg-white
              <div key={bot.id} className={`bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all border border-slate-200 group relative ${!bot.isActive ? 'opacity-75' : ''}`}>
                
                {/* Status Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                   {/* ... badges ... */}
                   {bot.isActivated && (
                      <span className="text-[10px] font-bold px-2 py-1 bg-brand-50 text-brand-600 rounded-md border border-brand-200">
                        مفعل
                      </span>
                   )}
                   {/* Direct Link Share Button - Enhanced Border */}
                   <button
                      onClick={(e) => handleShareLink(e, bot.id)}
                      className="p-1.5 bg-white border border-slate-300 rounded-md text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-colors shadow-sm"
                      title="نسخ رابط التطبيق للعميل"
                   >
                      {sharedLinkBotId === bot.id ? <Check className="w-4 h-4 text-emerald-500" /> : <ExternalLink className="w-4 h-4" />}
                   </button>
                </div>

                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border border-slate-100 ${bot.isActive ? 'bg-brand-50' : 'bg-slate-100'}`}>
                    <Bot className={`w-6 h-6 ${bot.isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{bot.storeName}</h3>
                    <p className="text-sm text-slate-500">المساعد: {bot.botName}</p>
                  </div>
                </div>

                {/* License Key Section - Enhanced Contrast */}
                <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-between group/key">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">كود التفعيل (License Key)</span>
                        <code className="text-xs font-mono font-bold text-slate-700 tracking-wider select-all cursor-text">
                           {bot.licenseKey || 'PENDING'}
                        </code>
                    </div>
                    <button 
                       onClick={() => handleCopyLicense(bot.licenseKey || '', bot.id)}
                       className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded text-slate-400 hover:text-brand-600 transition-all"
                       title="نسخ الكود"
                    >
                       {copiedKeyId === bot.id ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                {/* Instagram Integration Section */}
                <div className="mb-4 border-t border-b border-slate-100 py-3">
                  <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Instagram className="w-3 h-3 text-pink-600" />
                        Instagram Integration
                      </span>
                  </div>
                  
                  {bot.instagramConnected ? (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-purple-700">Connected ✔️</span>
                        </div>
                        <button 
                          onClick={(e) => handleDisconnectInstagram(e, bot.id)}
                          className="text-[10px] text-red-500 hover:text-red-700 underline"
                        >
                          Disconnect
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-600 space-y-1">
                        <p><strong>Username:</strong> {bot.instagramUsername || 'N/A'}</p>
                        <p><strong>Business ID:</strong> {bot.instagramBusinessId || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <button
                        onClick={(e) => handleConnectInstagram(e, bot.id)}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Instagram className="w-4 h-4" />
                        Connect Instagram Account
                      </button>
                      <p className="text-[10px] text-slate-400 mt-2">
                         Allows the bot to reply to DMs automatically.
                      </p>
                    </div>
                  )}
                </div>

                {/* Details - Enhanced divider visibility */}
                <div className="space-y-2 mb-6 pb-4">
                  {/* ... Store details ... */}
                   <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Store className="w-4 h-4 text-slate-400" />
                    <span>{bot.businessType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{bot.location}</span>
                  </div>
                </div>
                
                {/* Actions Footer */}
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex gap-2 relative z-10">
                        {/* Client App Launch Button */}
                        <button 
                            type="button"
                            onClick={(e) => handleClientAppClick(e, bot)}
                            className="p-2 text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-100 rounded-lg transition-colors shadow-sm"
                            title="واجهة العميل (الجوال)"
                        >
                            <Smartphone className="w-5 h-5 pointer-events-none" />
                        </button>

                        <button 
                            type="button"
                            onClick={(e) => handleListeningToggleClick(e, bot.id)}
                            className={`p-2 rounded-lg border transition-all ${bot.isListening ? 'text-brand-600 bg-brand-50 border-brand-200 ring-1 ring-brand-100' : 'text-slate-400 border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                            title={bot.isListening ? 'تعطيل وضع الاستماع' : 'تفعيل وضع الاستماع'}
                        >
                            <Ear className="w-5 h-5 pointer-events-none" />
                        </button>
                        
                        {/* ... Edit/Delete buttons ... */}
                        <button 
                            type="button"
                            onClick={(e) => handleEditClick(e, bot)}
                            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => handleDeleteClick(e, bot)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                         <button 
                            type="button"
                            onClick={(e) => handleStatsClick(e, bot)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                            <BarChart3 className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => bot.isActive && onSelectBot(bot)}
                        disabled={!bot.isActive}
                        className={`flex items-center gap-1 text-sm font-bold transition-colors relative z-10 ${bot.isActive ? 'text-brand-600 hover:text-brand-800' : 'text-slate-400 cursor-not-allowed'}`}
                    >
                        <span>تجربة الشات</span>
                        <PlayCircle className="w-4 h-4 pointer-events-none" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ... (Previous Modals Code) ... */}
      
      {/* Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
                 <div className="bg-gradient-to-r from-brand-600 to-brand-800 px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            {React.createElement(steps[currentStep].icon, { className: "w-6 h-6" })}
                            <h2 className="text-xl font-bold">{steps[currentStep].title}</h2>
                        </div>
                        <button onClick={handleCloseModal} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2">✕</button>
                    </div>
                 </div>
                 <div className="p-6 overflow-y-auto flex-1 bg-white">
                      {botResponse && (
                        <div className="mb-6 p-4 bg-brand-50 rounded-xl border-2 border-brand-200 animate-pulse">
                           <p className="text-sm font-medium text-slate-900 whitespace-pre-line">{botResponse}</p>
                        </div>
                      )}
                      <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-base font-medium text-slate-900 whitespace-pre-line leading-relaxed">
                            {typeof steps[currentStep].question === 'function' 
                                // @ts-ignore
                                ? steps[currentStep].question(formData.botName || formData.storeName)
                                : steps[currentStep].question}
                          </p>
                      </div>
                      <div className="space-y-4 pb-4">
                        {steps[currentStep].fields.map(field => renderField(field))}
                      </div>
                 </div>
                 <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-between flex-shrink-0">
                    <button onClick={handlePrevious} disabled={currentStep === 0} className="px-6 py-2 text-slate-700 bg-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-300 transition">السابق</button>
                    {currentStep === steps.length - 1 ? (
                        <button onClick={handleSubmit} disabled={!isStepValid()} className="px-8 py-3 bg-emerald-600 text-white rounded-lg disabled:opacity-50 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">حفظ</button>
                    ) : (
                        <button onClick={handleNext} disabled={!isStepValid()} className="px-8 py-3 bg-brand-600 text-white rounded-lg disabled:opacity-50 hover:bg-brand-700 transition shadow-lg shadow-brand-200">التالي</button>
                    )}
                 </div>
             </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {botToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200">
              <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">تأكيد الحذف</h3>
              <p className="mb-6 text-slate-600">هل أنت متأكد من حذف {botToDelete.storeName}؟</p>
              <div className="flex gap-3 justify-center">
                  <button onClick={() => setBotToDelete(null)} className="px-6 py-2 bg-slate-100 rounded-lg hover:bg-slate-200">إلغاء</button>
                  <button onClick={handleConfirmDelete} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">حذف نهائي</button>
              </div>
            </div>
        </div>
      )}

      {/* Stats Modal */}
      {statsBot && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative border border-slate-200">
                 <button onClick={() => setStatsBot(null)} className="absolute top-4 right-4 z-20 bg-white rounded-full p-2 shadow border border-slate-200 hover:bg-slate-50">✕</button>
                 <div className="p-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-900"><BarChart3/> لوحة القيادة: {statsBot.storeName}</h2>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <p className="text-sm text-slate-500">المحادثات</p>
                           <h3 className="text-2xl font-bold text-slate-900">{statsBot.stats?.totalConversations}</h3>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <p className="text-sm text-slate-500">العملاء الجدد</p>
                           <h3 className="text-2xl font-bold text-slate-900">{statsBot.stats?.newClients}</h3>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <p className="text-sm text-slate-500">معدل الرضا</p>
                           <h3 className="text-2xl font-bold flex items-center gap-1 text-yellow-500">
                             {statsBot.stats?.customerSatisfaction} <span className="text-sm">★</span>
                           </h3>
                        </div>
                    </div>
                 </div>
              </div>
          </div>
      )}

    </div>
  );
}
