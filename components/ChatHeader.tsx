import React from 'react';
import { RawbotLogo } from './RawbotLogo';

export const ChatHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center">
            <RawbotLogo width={40} height={40} />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-lg">مستشار RAWBOT</h1>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-xs text-slate-500">متواجد لخدمتك</p>
          </div>
        </div>
      </div>
    </header>
  );
};