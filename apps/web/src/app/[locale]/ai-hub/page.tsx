'use client';

import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Mic,
  ShieldAlert,
  Cpu,
  BarChart3,
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  Flame
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useAskTheLordAIMutation } from '../../../store/api/aiApi';
import { toast } from 'sonner';

export default function AIHubPage() {
  const [askAI, { isLoading }] = useAskTheLordAIMutation();
  const [inputQuery, setInputQuery] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'مرحباً بك يا لورد في مركز القيادة الذكي TheLordAI. أنا مربوط برمجياً بمحرك Gemini Flash مع جدار ناري مالي عازل. كيف يمكنني مساندة قراراتك التشغيلية والاستراتيجية اليوم؟',
      time: 'الآن'
    }
  ]);

  const QUICK_PROMPTS = [
    {
      title: 'تحليل الأداء المالي ورصيد الصندوق',
      desc: 'مقارنة مصروفات الإعلانات والرواتب بالمتبقي في الخزينة',
      prompt: 'قم بتحليل الوضع المالي الحالي للشركة، موضحاً هل معدل صرف إعلانات تليجرام متوازن مع رصيد الصندوق المتاح؟'
    },
    {
      title: 'كشف المهام المتأخرة والمراحل العالقة',
      desc: 'تدقيق المراحل التي لم تسلم في موعدها',
      prompt: 'افحص كافة مراحل المهام المفتوحة وحدد لي أي مرحلة متأخرة تحتاج تنبيهاً فورياً للموظف المنفذ.'
    },
    {
      title: 'صياغة بوست صفقة BTC تليجرام',
      desc: 'كتابة إعلان احترافي للقناة العامة لجذب المشتركين',
      prompt: 'صغ منشوراً جذاباً لقناة تليجرام العامة يعلن عن صفقة بيتكوين رابحة بنسبة 350% مع دعوة للانضمام لقناة VIP.'
    },
    {
      title: 'تحويل ملخص اجتماع إلى مهام',
      desc: 'استخراج مهام عملية وتعيين مراحل تنفيذ لها',
      prompt: 'لدينا خطة لإطلاق بوت تداول جديد ومسابقة أسبوعية. حول هذه الفكرة إلى 3 مهام مقسمة لمراحل تنفيذية متسلسلة.'
    }
  ];

  const handleSend = async (messageToSend?: string) => {
    const text = messageToSend || inputQuery;
    if (!text.trim() || isLoading) return;

    const userEntry = {
      sender: 'user' as const,
      text: text.trim(),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    setChatLog(prev => [...prev, userEntry]);
    setInputQuery('');

    try {
      const res = await askAI({ message: text.trim() }).unwrap();
      const botReply = res?.data?.reply || 'تم استلام استفسارك بنجاح.';

      setChatLog(prev => [
        ...prev,
        {
          sender: 'bot',
          text: botReply,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setChatLog(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'حدث خطأ مؤقت في خادم TheLordAI. تم تفعيل الاستجابة التلقائية.',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-cyber-blue tracking-widest uppercase">
              THE LORD AI — EXECUTIVE INTELLIGENCE SUITE
            </span>
            <span className="text-[10px] font-mono bg-cyber-blue/15 text-cyber-blue px-2 py-0.5 rounded-full border border-cyber-blue/30">
              Gemini Flash Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            مركز الذكاء الاصطناعي والأتمتة التشغيلية
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            المساعد الذكي التنفيذي لتحليل العمليات، مراقبة المهام، صياغة المحتوى، وعزل الصندوق المالي
          </p>
        </div>

        {/* Firewall Status Badge */}
        <div className="p-3 bg-obsidian-card rounded-2xl border border-obsidian-border flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
          <div className="text-xs">
            <span className="text-white font-bold block">الجدار الناري المالي نشط 🛡️</span>
            <span className="text-[10px] text-gray-400 font-mono">Zero-Leakage Financial Firewall</span>
          </div>
        </div>
      </div>

      {/* Quick Action Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_PROMPTS.map((qp, idx) => (
          <div
            key={idx}
            onClick={() => handleSend(qp.prompt)}
            className="p-4 rounded-3xl bg-obsidian-card border border-obsidian-border hover:border-lord-gold/40 cursor-pointer transition-all duration-300 group flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-lord-gold/10 border border-lord-gold/20 flex items-center justify-center text-lord-gold mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1 group-hover:text-lord-gold transition-colors">
                {qp.title}
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">{qp.desc}</p>
            </div>
            <div className="mt-4 flex items-center text-[10px] font-bold text-lord-gold gap-1">
              <span>تنفيذ الآن</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Main AI Chat Console */}
      <div className="bg-obsidian-card border border-obsidian-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
        {/* Console Header */}
        <div className="p-4 bg-obsidian-surface/90 border-b border-obsidian-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>TheLordAI Terminal</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h3>
              <p className="text-[11px] text-gray-400 font-mono">وضع التحليل التنفيذي المباشر</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <span>Latency: 1.2s</span>
            <span>|</span>
            <span className="text-emerald-400">100% Operational</span>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {chatLog.map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${entry.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  entry.sender === 'user'
                    ? 'bg-lord-gold text-obsidian-primary'
                    : 'bg-obsidian-surface border border-lord-gold/30 text-lord-gold'
                }`}
              >
                {entry.sender === 'user' ? '👑' : '🦁'}
              </div>

              <div
                className={`max-w-[80%] p-4 rounded-3xl text-xs leading-relaxed space-y-1 shadow-lg ${
                  entry.sender === 'user'
                    ? 'bg-lord-gold text-obsidian-primary font-bold rounded-tr-none shadow-gold-glow'
                    : 'bg-obsidian-surface text-gray-200 border border-obsidian-border rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] opacity-70 border-b border-black/10 pb-1 mb-1">
                  <span>{entry.sender === 'user' ? 'المسؤول التنفيذي' : 'TheLordAI Flash'}</span>
                  <span>{entry.time}</span>
                </div>
                <p>{entry.text}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-obsidian-surface border border-lord-gold/30 flex items-center justify-center text-lord-gold">
                🦁
              </div>
              <div className="p-4 bg-obsidian-surface border border-obsidian-border rounded-3xl text-xs text-lord-gold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-lord-gold animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-lord-gold animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-lord-gold animate-bounce [animation-delay:0.4s]"></span>
                <span>TheLordAI يقوم بتحليل طلبك وصياغة الحل الأمثل...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-obsidian-surface border-t border-obsidian-border flex items-center gap-3"
        >
          <input
            type="text"
            placeholder="اسأل TheLordAI أي أمر تنفيذي، تدقيق مهام، أو صياغة صفقات..."
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            className="flex-1 bg-obsidian-card border border-gray-800 rounded-2xl px-5 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold transition-colors"
          />

          <Button type="submit" variant="gold" size="md" isLoading={isLoading} className="rounded-2xl">
            <Send className="w-4 h-4 ml-1.5" />
            <span>إرسال</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

