
import React from 'react';
import { Message, Sender } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  // Handle System Messages (Admin Feedback)
  if (message.sender === Sender.SYSTEM) {
    return (
      <div className="flex w-full mb-4 justify-center">
        <div className="bg-slate-100 border border-slate-200 text-slate-500 text-xs px-3 py-1 rounded-full shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  const isUser = message.sender === Sender.USER;

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`flex flex-col max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm relative border ${
          isUser
            ? 'bg-brand-600 text-white border-brand-500 rounded-tr-none' // Brand Blue for User
            : 'bg-white text-slate-800 border-slate-200 rounded-tl-none' // White for Agent (Darker border for contrast)
        }`}
      >
        {/* Sender Name Label */}
        <span className={`text-[10px] font-bold mb-1 opacity-80 ${isUser ? 'text-brand-100' : 'text-brand-600'}`}>
          {isUser ? 'أنت' : 'مستشار RAWBOT'}
        </span>

        {/* Image Attachment */}
        {message.imageUrl && (
          // Fixed: border-white/20 was invisible on white bg. Changed to conditional.
          <div className={`mb-3 rounded-lg overflow-hidden border ${isUser ? 'border-white/20' : 'border-slate-200'}`}>
            <img 
              src={message.imageUrl} 
              alt="User uploaded" 
              className="w-full h-auto object-cover max-h-64"
            />
          </div>
        )}

        {/* Text Content */}
        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
          {message.text}
        </div>

        {/* Timestamp */}
        <span className={`text-[10px] mt-2 self-end ${isUser ? 'text-brand-200' : 'text-slate-400'}`}>
          {message.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};