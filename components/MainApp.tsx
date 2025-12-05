
'use client';

import React, { useState, useEffect } from 'react';
import { BotDashboard } from './BotDashboard';
import { ChatInterface } from './ChatInterface';
import { ClientApp } from './ClientApp';
import { BotConfig } from '@/types';
import { botRepository } from '@/services/botRepository';
// Ensure LanguageProvider is available if MainApp is mounted directly in pages without layout (unlikely but safe)
// However, layout.tsx typically handles this. 

type ViewMode = 'admin' | 'chat' | 'client';

const MainApp: React.FC = () => {
  const [activeBot, setActiveBot] = useState<BotConfig | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const data = await botRepository.getAllBots();
        setBots(data);

        // Check for Client Mode via URL Search Params
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const sharedBotId = params.get('botId');

          if (sharedBotId) {
            const targetBot = data.find(b => b.id === Number(sharedBotId));
            if (targetBot) {
              setActiveBot(targetBot);
              setViewMode('client');
              setIsStandaloneMode(true);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load app data", error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const loadBots = async () => {
    if (isStandaloneMode) return;
    try {
      const data = await botRepository.getAllBots();
      setBots(data);
    } catch (error) {
      console.error("Failed to load bots", error);
    }
  };

  const handleAddBot = async (newBot: BotConfig) => {
    await botRepository.createBot(newBot);
    loadBots(); 
  };

  const handleUpdateBot = async (updatedBot: BotConfig) => {
    await botRepository.updateBot(updatedBot);
    setBots(prev => prev.map(b => b.id === updatedBot.id ? updatedBot : b));
    if (activeBot && activeBot.id === updatedBot.id) {
        setActiveBot(updatedBot);
    }
  };

  const handleDeleteBot = async (id: number) => {
    await botRepository.deleteBot(id);
    loadBots();
  };

  const handleToggleBotStatus = async (id: number) => {
    await botRepository.toggleBotStatus(id);
    loadBots();
  };

  const handleToggleBotListening = async (id: number) => {
    await botRepository.toggleBotListening(id);
    loadBots();
  };

  const openChat = (bot: BotConfig) => {
      setActiveBot(bot);
      setViewMode('chat');
  };

  const openClientApp = (bot: BotConfig) => {
      setActiveBot(bot);
      setViewMode('client');
  };

  const goBack = () => {
      if (isStandaloneMode) {
        window.location.reload();
        return;
      }
      setActiveBot(null);
      setViewMode('admin');
      loadBots();
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">جاري تحميل البيانات...</p>
            </div>
        </div>
    );
  }

  if (viewMode === 'chat' && activeBot) {
    return (
      <ChatInterface 
        bot={activeBot} 
        onBack={goBack} 
      />
    );
  }

  if (viewMode === 'client' && activeBot) {
    return (
      <ClientApp 
        bot={activeBot} 
        onUpdateBot={handleUpdateBot}
        onExit={goBack}
      />
    );
  }

  if (isStandaloneMode && !activeBot) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">الرابط غير صالح</h1>
            <p className="text-slate-500">لم يتم العثور على المساعد المطلوب. قد يكون تم حذفه أو إيقافه.</p>
        </div>
     );
  }

  return (
    <BotDashboard 
      bots={bots}
      onSelectBot={openChat}
      onLaunchClientApp={openClientApp}
      onAddBot={handleAddBot}
      onUpdateBot={handleUpdateBot}
      onDeleteBot={handleDeleteBot}
      onToggleBotStatus={handleToggleBotStatus}
      onToggleBotListening={handleToggleBotListening}
    />
  );
};

export default MainApp;
