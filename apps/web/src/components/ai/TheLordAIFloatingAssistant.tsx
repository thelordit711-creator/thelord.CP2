'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAskTheLordAIMutation } from '../../store/api/aiApi';
import { Send, X, Sparkles, RefreshCw, Zap, Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

export const TheLordAIFloatingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check user preference (Default: Hidden to keep interface clean)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkVisibility = () => {
        setIsVisible(localStorage.getItem('lord_show_floating_ai') === 'true');
      };
      checkVisibility();
      window.addEventListener('lord_floating_tools_updated', checkVisibility);
      return () => {
        window.removeEventListener('lord_floating_tools_updated', checkVisibility);
      };
    }
  }, []);

  // Responsive Draggable Position State
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 450 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 20,
    initialY: 450,
    moved: false
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lord_ai_btn_coords');
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const maxX = winW - 90;
          const maxY = winH - 90;
          setPosition({
            x: Math.min(Math.max(12, parsed.x), maxX),
            y: Math.min(Math.max(12, parsed.y), maxY)
          });
        } catch (e) {
          setPosition({ x: 20, y: Math.max(100, winH - 120) });
        }
      } else {
        // Safe initial position (bottom left above potential bottom bars)
        setPosition({ x: 20, y: Math.max(100, winH - 120) });
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

    const maxX = window.innerWidth - 90;
    const maxY = window.innerHeight - 90;
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
      text: 'مرحباً بك يا قائد! 🦁 أنا TheLordAI، محرك الذكاء الاصطناعي المؤسسي لشركة THE LORD OF CRYPTO. أنا جاهز لمساعدتك في تحليل الشارتات، إعداد خطط الصفقات، تدقيق الميزانيات، وتلخيص مهام الفريق.',
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
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || isLoading) return;

    setInputMessage('');
    const timeNow = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });

    setChatLog((prev) => [
      ...prev,
      { sender: 'user', text: textToSend, time: timeNow }
    ]);

    try {
      const historyFormatted = chatLog.map((c) => ({
        role: c.sender === 'user' ? 'user' : 'model',
        parts: [{ text: c.text }]
      }));

      const res = await askAI({
        message: textToSend,
        history: historyFormatted
      }).unwrap();

      const reply = res?.data?.reply || 'تم تحليل طلبك بنجاح من خلال TheLordAI Enterprise.';

      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      toast.error('تعذر معالجة الطلب عبر TheLordAI، يرجى المحاولة مرة أخرى.');
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ تعذر الاتصال بمحرك الذكاء الاصطناعي مؤقتاً. يرجى التأكد من مفتاح الـ API والاتصال بالشبكة.',
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

  if (!isVisible) return null;

  return (
    <>
      {/* Draggable Luxury Obsidian-Gold Floating Orb */}
      <div
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed z-50 select-none px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-[#16120b]/90 via-[#10121a]/95 to-[#0b0d14]/90 border-2 border-amber-500/50 text-white shadow-[0_4px_25px_rgba(245,158,11,0.25)] backdrop-blur-xl hover:border-amber-400 hover:shadow-[0_4px_30px_rgba(245,158,11,0.45)] cursor-grab active:cursor-grabbing active:scale-95 transition-all duration-150 flex items-center gap-2.5 group"
        title="اسحب لتحريك الشعار إلى أي مكان، أو انقر للمحادثة مع TheLordAI"
      >
        <div className="relative flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 flex items-center justify-center text-black font-black text-sm shadow-md group-hover:scale-110 transition-transform">
            🦁
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 border-2 border-black animate-ping" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 border-2 border-black" />
        </div>

        <div className="flex flex-col text-right pointer-events-none">
          <span className="text-xs font-black tracking-wider text-amber-400 flex items-center gap-1">
            <span>TheLordAI</span>
            <span className="text-[9px] bg-amber-500/25 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">2.5</span>
          </span>
          <span className="text-[9px] text-slate-400 font-mono hidden sm:block">المساعد الذكي ✦</span>
        </div>
      </div>

      {/* Slide-over Executive Chat Panel: Responsive for Mobile & Desktop */}
      {isOpen && (
        <div
          className="fixed z-50 inset-x-2 bottom-3 sm:inset-x-auto sm:bottom-auto w-auto sm:w-[420px] max-w-[calc(100vw-1rem)] h-[600px] max-h-[85vh] bg-[#0c0f17]/95 border-2 border-amber-500/40 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden backdrop-blur-2xl animate-fadeIn"
          style={
            typeof window !== 'undefined' && window.innerWidth >= 640
              ? {
                  left: `${Math.min(Math.max(16, position.x), window.innerWidth - 440)}px`,
                  bottom: position.y > 450 ? '80px' : 'auto',
                  top: position.y <= 450 ? `${Math.min(position.y + 55, window.innerHeight - 620)}px` : 'auto'
                }
              : undefined
          }
        >
          {/* Executive Header */}
          <div className="p-4 bg-[#141824]/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                🦁
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>TheLordAI Core</span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Online
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">الذكاء الاصطناعي لإدارة التداول والعمليات</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                title="مسح المحادثة"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gradient-to-b from-[#0c0f17] via-[#090c13] to-[#07090f]">
            {chatLog.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 shadow-lg group relative ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold rounded-tr-none shadow-[0_4px_15px_rgba(245,158,11,0.3)]'
                      : 'bg-[#151926] text-slate-100 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div className="flex items-center justify-between text-[9px] pt-1 border-t border-black/10 text-slate-400">
                    <span>{msg.time}</span>
                    {msg.sender === 'bot' && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.text, idx)}
                        className="text-slate-400 hover:text-amber-400 flex items-center gap-0.5"
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
                <div className="p-3 bg-[#151926] rounded-2xl text-xs text-amber-400 border border-amber-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] font-bold">TheLordAI يحلل البيانات ويصيغ الرد...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Smart Prompt Suggestions */}
          <div className="px-3 py-2 bg-[#0a0d14] border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleSendMessage('قم بتحليل اتجاه البيتكوين والذهب اليوم ومناطق الدخول المقترحة')}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-400 px-2.5 py-1 rounded-xl border border-slate-700 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
            >
              <Zap className="w-3 h-3" />
              <span>تحليل BTC والذهب</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('اكتب منشور تليجرام إعلاني جذاب لقناة VIP مع هوك قوي')}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-400 px-2.5 py-1 rounded-xl border border-slate-700 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
            >
              <Zap className="w-3 h-3" />
              <span>صياغة إعلان VIP</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('لخص لي أهم إجراءات السلامة في صرف طلبات الخزينة اليوم')}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2.5 py-1 rounded-xl border border-slate-700 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
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
            className="p-3 bg-[#111420] border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="اسأل TheLordAI عن أي شارت أو مهمة أو قرار..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            <Button
              type="submit"
              variant="gold"
              size="sm"
              isLoading={isLoading}
              disabled={!inputMessage.trim()}
              className="rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};
