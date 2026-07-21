import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, MessageSquare, X, Bot, Check, ArrowRight } from 'lucide-react';
import { ChatMessage, LanguageCode } from '../types';

interface LiveChatWidgetProps {
  language?: LanguageCode;
}

// Persistent per-visitor chat session id (survives page reloads).
function getChatSessionId(): string {
  const KEY = 'ilhomdent_chat_session';
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
      id = (crypto.randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9_-]/g, '');
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable — fall back to an in-memory id for this page load.
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// Map a server-stored message into the widget's ChatMessage shape.
function toChatMessage(m: any): ChatMessage {
  return {
    id: m.id,
    role: m.role === 'user' ? 'user' : 'model',
    text: m.text,
    timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
  };
}

export default function LiveChatWidget({ language }: LiveChatWidgetProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(getChatSessionId());
  const lastCountRef = useRef<number>(0);

  const activeLang = language || (i18n.resolvedLanguage || i18n.language || 'uz') as LanguageCode;

  // Merge server history into local state and track admin replies for the unread badge.
  const syncHistory = async () => {
    try {
      const res = await fetch(`/api/chat/history?sessionId=${sessionIdRef.current}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const mapped = data.map(toChatMessage);

      const prevCount = lastCountRef.current;
      const newModelReplies = mapped.filter((m) => m.role === 'model').length;
      setMessages(mapped);

      // If new messages arrived while the window is closed, bump the unread badge.
      if (mapped.length > prevCount && prevCount > 0) {
        setIsOpen((open) => {
          if (!open) {
            const added = mapped.slice(prevCount).filter((m) => m.role === 'model').length;
            if (added > 0) setUnreadCount((c) => c + added);
          }
          return open;
        });
      }
      lastCountRef.current = mapped.length;
      void newModelReplies;
    } catch {
      // Network hiccup — polling will retry.
    }
  };

  // Load history on mount, then poll for admin replies every 5s.
  useEffect(() => {
    syncHistory();
    const interval = setInterval(syncHistory, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the welcome message localized until the visitor writes.
  useEffect(() => {
    setMessages(prev =>
      prev.map(m => m.id === 'welcome' ? { ...m, text: t('live_chat_welcome') } : m)
    );
  }, [activeLang, t]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
    scrollToBottom();
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsgText = inputText.trim();
    setInputText("");

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: userMsgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message: userMsgText,
          language: activeLang
        })
      });

      if (response.ok) {
        // Pull the authoritative history (includes the auto-acknowledgement).
        await syncHistory();
      } else {
        const data = await response.json().catch(() => ({}));
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-error`,
          role: 'model',
          text: data.error || t('live_chat_welcome'),
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-error`,
        role: 'model',
        text: `Tarmoq xatosi. Iltimos telefon orqali bog'laning.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans" id="live-chat">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Jonli chatni ochish"
          className="relative flex items-center justify-center w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-[0_0_15px_rgba(14,165,233,0.35)] hover:shadow-[0_0_25px_rgba(14,165,233,0.55)] transition-all hover:scale-110 active:scale-95 group focus:outline-none cursor-pointer"
        >
          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] sm:text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
              {unreadCount}
            </span>
          )}
          
          {/* Tooltip */}
          <span className="absolute right-16 px-3 py-1.5 rounded-lg bg-slate-900 text-xs text-white border border-slate-800 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
            {t('live_chat_title')}
          </span>
        </button>
      )}

      {/* Chat Window - Elegant Light theme */}
      {isOpen && (
        <div className="w-[calc(100vw-32px)] max-w-[360px] sm:max-w-[400px] sm:w-[400px] h-[460px] sm:h-[520px] rounded-3xl bg-white border border-slate-200 shadow-[0_0_30px_rgba(14,165,233,0.18)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50/50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                <Bot className="w-5 h-5 text-sky-500" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-[#0F172A] tracking-tight">{t('live_chat_title')}</h4>
                <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                  <span>●</span> {t('live_chat_badge')}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Chatni yopish"
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {msg.role === 'model' && (
                  <div className="w-7 h-7 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-sky-500" />
                  </div>
                )}
                
                <div className="flex flex-col text-left">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-sky-500 text-white rounded-tr-sm shadow-sm font-medium'
                        : 'bg-white border border-slate-150 text-slate-700 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 self-end flex items-center gap-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.role === 'user' && <Check className="w-3 h-3 text-sky-500" />}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 max-w-[80%] mr-auto">
                <div className="w-7 h-7 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-sky-500" />
                </div>
                <div className="bg-white border border-slate-150 px-4 py-3 rounded-2xl rounded-tl-sm text-slate-400 text-xs flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Prompts */}
          {messages.length === 1 && !isLoading && (
            <div className="p-2 bg-slate-50/30 border-t border-slate-100 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => setInputText(activeLang === 'uz' ? "Implantatsiya narxlari qancha?" : "How much are implants?")}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                {activeLang === 'uz' ? "Implantatsiya narxlari" : "Implant Prices"} <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setInputText(activeLang === 'uz' ? "Vinirlar nima?" : "What are veneers?")}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                {activeLang === 'uz' ? "Vinirlar haqida" : "About Veneers"} <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setInputText(activeLang === 'uz' ? "Klinika manzili va ish vaqti?" : "Clinic address and hours?")}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                {activeLang === 'uz' ? "Manzil va ish vaqti" : "Address & Hours"} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('live_chat_ph')}
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-full px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/10 transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
