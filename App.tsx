
import React, { useState, useEffect } from 'react';
import { BotDashboard } from './components/BotDashboard';
import { ChatInterface } from './components/ChatInterface';
import { ClientApp } from './components/ClientApp';
import { BotConfig } from './types';
import { botRepository } from './services/botRepository';

type ViewMode = 'admin' | 'chat' | 'client';

const App: React.FC = () => {
  const [activeBot, setActiveBot] = useState<BotConfig | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  // Load data on mount and check URL
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        // 1. Load Bots
        const data = await botRepository.getAllBots();
        setBots(data);

        // 2. Check for Direct Link (Client Mode)
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
      } catch (error) {
        console.error("Failed to load app data", error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const loadBots = async () => {
    // Only reload if not in standalone mode (Client shouldn't trigger full refreshes)
    if (isStandaloneMode) return;

    setLoading(true);
    try {
      const data = await botRepository.getAllBots();
      setBots(data);
    } catch (error) {
      console.error("Failed to load bots", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBot = async (newBot: BotConfig) => {
    await botRepository.createBot(newBot);
    loadBots(); 
  };

  const handleUpdateBot = async (updatedBot: BotConfig) => {
    await botRepository.updateBot(updatedBot);
    // Update local state immediately for responsiveness
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
    const updatedBots = await botRepository.getAllBots(); // Fetch fresh to ensure sync
    setBots(updatedBots);
    
    if (activeBot && activeBot.id === id) {
       const updated = updatedBots.find(b => b.id === id);
       if (updated) setActiveBot(updated);
    }
  };

  const handleToggleBotListening = async (id: number) => {
    await botRepository.toggleBotListening(id);
    const updatedBots = await botRepository.getAllBots();
    setBots(updatedBots);
    
    if (activeBot && activeBot.id === id) {
        const updatedActive = updatedBots.find(b => b.id === id);
        if (updatedActive) setActiveBot(updatedActive);
    }
  };

  // Navigation Handlers
  const openChat = (bot: BotConfig) => {
      setActiveBot(bot);
      setViewMode('chat');
  };

  const openClientApp = (bot: BotConfig) => {
      setActiveBot(bot);
      setViewMode('client');
  };

  const goBack = () => {
      // If we are in standalone mode (Link shared with client), "Exit" means reload/lock
      if (isStandaloneMode) {
        window.location.reload();
        return;
      }

      // Normal Admin flow
      setActiveBot(null);
      setViewMode('admin');
      loadBots(); // Refresh data on return
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

  // View Routing
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

  // If in standalone mode but no bot found (or deleted), show error
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

export default App;
