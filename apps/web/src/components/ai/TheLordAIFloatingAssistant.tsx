'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAskTheLordAIMutation } from '../../store/api/aiApi';
import { Bot, Send, X, Sparkles, RefreshCw, Zap, Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

export const TheLordAIFloatingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Draggable State & Persistence
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 24,
    initialY: 300,
    moved: false
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lord_ai_btn_coords');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const maxX = window.innerWidth - 80;
          const maxY = window.innerHeight - 80;
          setPosition({
            x: Math.min(Math.max(12, parsed.x), maxX),
            y: Math.min(Math.max(12, parsed.y), maxY)
          });
        } catch (e) {}
      } else {
        // default position bottom-left
        setPosition({ x: 24, y: Math.max(100, window.innerHeight - 100) });
      }
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      moved: false
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragRef.current.moved = true;
    }

    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 80;
    const newX = Math.min(Math.max(12, dragRef.current.initialX + deltaX), maxX);
    const newY = Math.min(Math.max(12, dragRef.current.initialY + deltaY), maxY);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      localStorage.setItem('lord_ai_btn_coords', JSON.stringify(position));
    }

    if (!dragRef.current.moved) {
      setIsOpen((prev) => !prev);
    }
  };

  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'مرحباً بك يا قائد! 🦁 أنا TheLordAI، محرك الذكاء الاصطناعي المؤسسي الخاص بشركة THE LORD OF CRYPTO. أنا جاهز لمساعدتك في تحليل الشارتات، إعداد خطط الصفقات، تدقيق الميزانيات، وتلخيص مهام الفريق.',
      time: 'الآن'
    }
  ]);

  const [askAI, { isLoading }] = useAskTheLordAIMutation();

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog, isOpen]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage.trim();
    if (!textToSend || isLoading) return;

    if (!customPrompt) setInputMessage('');

    const now = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
    setChatLog(prev => [...prev, { sender: 'user', text: textToSend, time: now }]);

    try {
      const res = await askAI({ message: textToSend }).unwrap();
      const reply = res?.data?.reply || 'تم تحليل طلبك بنجاح من خلال TheLordAI Enterprise.';
      setChatLog(prev => [...prev, { sender: 'bot', text: reply, time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (err) {
      setChatLog(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'عذراً، حدث خطأ أثناء معالجة طلبك عبر خادم الذكاء الاصطناعي. يرجى التأكد من تشغيل الخادم والمحاولة مجدداً.',
          time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast.success('تم نسخ النص إلى الحافظة 📋');
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  const handleClearHistory = () => {
    setChatLog([
      {
        sender: 'bot',
        text: 'تمت إعادة تهيئة جلسة المحادثة. كيف يمكنني خدمتك الآن؟ 🦁',
        time: 'الآن'
      }
    ]);
    toast.info('تم مسح سجل المحادثة');
  };

  return (
    <>
      {/* Draggable Semi-Transparent Floating Orb */}
      <div
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed z-50 select-none p-2 sm:px-3.5 sm:py-2.5 rounded-full bg-obsidian-card/40 border border-lord-gold/30 text-white shadow-2xl backdrop-blur-md hover:border-lord-gold hover:bg-obsidian-card/80 opacity-75 hover:opacity-100 cursor-grab active:cursor-grabbing active:scale-95 transition-all duration-200 flex items-center gap-2 group"
        title="اسحب لتحريك الشعار إلى أي مكان، أو انقر للمحادثة مع TheLordAI"
      >
        <div className="relative flex items-center justify-center pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-lord-gold/20 border border-lord-gold/70 flex items-center justify-center text-lord-gold group-hover:scale-110 transition-transform">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-lord-gold" />
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 border border-black animate-ping" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 border border-black" />
        </div>

        <div className="hidden sm:flex flex-col text-right pointer-events-none">
          <span className="text-xs font-black tracking-wider text-lord-gold flex items-center gap-1">
            <span>TheLordAI</span>
            <span className="text-[9px] bg-lord-gold/20 text-lord-gold px-1 py-0.2 rounded font-mono font-bold">2.5</span>
          </span>
          <span className="text-[8px] text-gray-400 font-mono">اسحب للتحريك ✦</span>
        </div>
      </div>

      {/* Slide-over Executive Chat Panel */}
      {isOpen && (
        <div
          style={{
            left: `${Math.min(Math.max(12, position.x), typeof window !== 'undefined' ? window.innerWidth - 420 : 24)}px`,
            bottom: position.y > 450 ? '80px' : 'auto',
            top: position.y <= 450 ? `${Math.min(position.y + 50, typeof window !== 'undefined' ? window.innerHeight - 590 : 80)}px` : 'auto'
          }}
          className="fixed z-50 w-[410px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[85vh] bg-obsidian-surface/95 border-2 border-lord-gold/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl animate-fadeIn"
        >
          {/* Executive Header */}
          <div className="p-4 bg-obsidian-card/90 border-b border-obsidian-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-xl shadow-gold-glow">
                🦁
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>TheLordAI Core</span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Online
                  </span>
                </h4>
                <p className="text-[11px] text-gray-400">الذكاء الاصطناعي لإدارة التداول والعمليات</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-xl text-gray-400 hover:text-lord-gold hover:bg-gray-800 transition-colors"
                title="مسح المحادثة"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {chatLog.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 shadow-lg group relative ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-lord-gold to-yellow-600 text-obsidian-primary font-bold rounded-tr-none shadow-gold-glow'
                      : 'bg-obsidian-card text-gray-200 border border-obsidian-border rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div className="flex items-center justify-between text-[9px] pt-1 border-t border-black/10 text-gray-400">
                    <span>{msg.time}</span>
                    {msg.sender === 'bot' && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.text, idx)}
                        className="text-gray-400 hover:text-lord-gold flex items-center gap-0.5"
                        title="نسخ الإجابة"
                      >
                        {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>نسخ</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="p-3 bg-obsidian-card rounded-2xl text-xs text-lord-gold border border-lord-gold/30 flex items-center gap-2 shadow-gold-glow">
                  <span className="w-2 h-2 rounded-full bg-lord-gold animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-lord-gold animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-lord-gold animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] font-bold">TheLordAI يحلل البيانات ويصيغ الرد...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Smart Prompt Suggestions */}
          <div className="px-3 py-2 bg-obsidian-primary/60 border-t border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleSendMessage('قم بتحليل اتجاه البيتكوين والذهب اليوم ومناطق الدخول المقترحة')}
              className="text-[10px] bg-obsidian-card hover:bg-gray-800 text-lord-gold px-2.5 py-1 rounded-xl border border-gray-800 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
            >
              <Zap className="w-3 h-3" />
              <span>تحليل BTC والذهب</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('اكتب منشور تليجرام إعلاني جذاب لقناة VIP مع هوك قوي')}
              className="text-[10px] bg-obsidian-card hover:bg-gray-800 text-blue-400 px-2.5 py-1 rounded-xl border border-gray-800 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
            >
              <Zap className="w-3 h-3" />
              <span>صياغة إعلان VIP</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('لخص لي أهم إجراءات السلامة في صرف طلبات الخزينة اليوم')}
              className="text-[10px] bg-obsidian-card hover:bg-gray-800 text-emerald-400 px-2.5 py-1 rounded-xl border border-gray-800 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
            >
              <Zap className="w-3 h-3" />
              <span>إجراءات الصندوق</span>
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-obsidian-card border-t border-obsidian-border flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="اسأل TheLordAI عن أي شارت أو مهمة أو قرار..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-obsidian-primary border border-gray-700 focus:border-lord-gold rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            <Button
              type="submit"
              variant="gold"
              size="sm"
              isLoading={isLoading}
              disabled={!inputMessage.trim()}
              className="rounded-xl shadow-gold-glow shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};
