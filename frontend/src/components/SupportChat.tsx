/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { MessageSquare, X, Send, User, Compass, RefreshCw } from 'lucide-react';

export const SupportChat: React.FC = () => {
  const { chatOpen, setChatOpen, messages, isTyping, sendMessage } = useChatStore();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when message list appends or typing state toggles
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!chatOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed bottom-4 right-2 sm:bottom-6 sm:right-6 w-[calc(100vw-1rem)] sm:w-80 max-w-sm h-96 bg-[#090D1A] border border-slate-850 rounded-2xl shadow-2xl flex flex-col justify-between z-50 overflow-hidden">
      
      {/* Top chat header info bar */}
      <div className="p-3 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
              V
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-teal-400 rounded-full border border-slate-950" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Valerie (Operator)</p>
            <span className="text-[9px] text-slate-500 block font-mono">Senior Help Specialist</span>
          </div>
        </div>

        <button 
          onClick={() => setChatOpen(false)}
          className="p-1 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-350 transition cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Messages Thread list */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 pr-1 scrollbar-thin text-[11px]" ref={scrollRef}>
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div 
              key={m.id}
              className={`max-w-[85%] p-2.5 rounded-xl text-xs space-y-0.5 ${
                isUser 
                  ? 'bg-blue-600 text-slate-100 ml-auto rounded-tr-none' 
                  : 'bg-slate-950 border border-slate-900 text-slate-300 rounded-tl-none'
              }`}
            >
              <p className="leading-relaxed">{m.text}</p>
              <span className={`text-[8px] font-mono block text-right mt-1 ${isUser ? 'text-blue-300' : 'text-slate-600'}`}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div className="bg-slate-950 border border-slate-900 text-slate-550 rounded-xl rounded-tl-none p-2.5 max-w-[85%] flex items-center space-x-1.5 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin" />
            <span>Valerie is typing comments...</span>
          </div>
        )}
      </div>

      {/* Chat inputs panel */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-850 bg-slate-950/30 flex items-center space-x-2">
        <input 
          type="text" 
          placeholder="Write message desk inquiry..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-3 py-1.5 text-xs text-slate-250"
        />
        <button 
          type="submit"
          className="p-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

    </div>
  );
};
