import React from 'react';

export const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex w-full mb-4 justify-end">
      <div className="bg-white text-slate-900 border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center space-x-1 space-x-reverse">
        <span className="text-xs font-bold text-slate-500 ml-2">جاري الكتابة...</span>
        <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
};