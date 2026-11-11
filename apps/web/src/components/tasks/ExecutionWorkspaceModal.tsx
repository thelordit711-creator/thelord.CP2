'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  FileText,
  FileDown,
  Printer,
  Copy,
  Send,
  X,
  Layers,
  CheckCircle2,
  Clock,
  Loader2,
  Bot,
  User,
  Share2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StageDeliverableBox } from './StageDeliverableBox';
import { toast } from 'sonner';

interface ExecutionWorkspaceModalProps {
  task: any;
  onClose: () => void;
  onStageUpdated?: () => void;
}

export const ExecutionWorkspaceModal: React.FC<ExecutionWorkspaceModalProps> = ({
  task,
  onClose,
  onStageUpdated
}) => {
  const [activeCopilotTab, setActiveCopilotTab] = useState<'CHAT' | 'DRAFT'>('CHAT');
  const [copilotMessages, setCopilotMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: `مرحباً بك يا بطل! أنا رفيق التنفيذ الذكي (TheLordAI Task Copilot) الخاص بمهمة "${task.title}". أنا جاهز لمساعدتك في كتابة المحتوى، تجهيز التقارير، وتدقيق العمل خطوة بخطوة قبل تسليم المراحل للمسؤول.`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Send message to Gemini for this specific task
  const handleSendCopilotMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isCopilotThinking) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');
    setCopilotMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsCopilotThinking(true);

    try {
      const { apiFetch } = await import('../../lib/apiClient');

      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `أنا أعمل الآن على المهمة: [${task.title}]. وصف المهمة: [${task.description}]. استفساري هو: ${userText}`
        })
      });

      const data = await res.json();
      const reply = data?.data?.reply || 'تمت معالجة استفسارك، هل تحتاج مساعدة إضافية في تسليم هذه المرحلة؟';
      setCopilotMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (err: any) {
      setCopilotMessages(prev => [
        ...prev,
        { role: 'model', text: 'حدث خطأ مؤقت في الاتصال برفيق الذكاء الاصطناعي. يرجى المحاولة ثانية.' }
      ]);
    } finally {
      setIsCopilotThinking(false);
    }
  };

  // Auto-generate formal task draft report
  const handleGenerateDraftReport = async () => {
    setIsCopilotThinking(true);
    setActiveCopilotTab('DRAFT');
    try {
      const { apiFetch } = await import('../../lib/apiClient');

      const prompt = `
قم بصياغة تقرير إنجاز وتسليم إداري رفيع المستوى لمهمة المنظومة التالية:
- عنوان المهمة: ${task.title}
- تفاصيل المهمة: ${task.description}
- المنصة: ${task.targetPlatform}
- عدد المراحل: ${task.stages?.length || 0} مراحل

المطلوب: توليد تقرير متكامل يشمل:
1. ملخص تنفيذي لما تم إنجازه.
2. تفصيل مراحل العمل ومخرجاتها.
3. التوصيات والخطوات اللاحقة.
      `;

      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: prompt })
      });

      const data = await res.json();
      setGeneratedDraft(data?.data?.reply || 'تم توليد مسودة التقرير بنجاح.');
      toast.success('تم توليد مسودة التقرير الرسمي بواسطة الذكاء الاصطناعي ✨');
    } catch (err) {
      toast.error('حدث خطأ أثناء توليد المسودة');
    } finally {
      setIsCopilotThinking(false);
    }
  };

  // Export 1: Direct Text Copy
  const handleCopyText = () => {
    const content = generatedDraft || `تقرير إنجاز المهمة: ${task.title}\n\nالوصف: ${task.description}\nالحالة: ${task.status}\nتاريخ التسليم: ${new Date().toLocaleDateString('ar-YE')}`;
    navigator.clipboard.writeText(content);
    toast.success('تم نسخ نص التقرير بالكامل إلى الحافظة! 📋');
  };

  // Export 2: Word (.doc / .docx) Official File Download
  const handleExportWord = () => {
    const reportText = generatedDraft || task.description;
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${task.title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 40px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 15px; margin-bottom: 25px; }
          .header h1 { color: #b45309; font-size: 22px; margin: 0; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          .meta-table td { border: 1px solid #ccc; padding: 8px; }
          .meta-table td.label { background-color: #f8fafc; font-weight: bold; width: 25%; }
          .content { line-height: 1.8; font-size: 13px; white-space: pre-wrap; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>THE LORD OF CRYPTO — تقرير تسليم إنجاز مهمة</h1>
          <p style="font-size: 12px; color: #666;">منظومة إدارة الموارد والعمليات المركزية</p>
        </div>
        <table class="meta-table">
          <tr><td class="label">عنوان المهمة:</td><td>${task.title}</td></tr>
          <tr><td class="label">المنصة المستهدفة:</td><td>${task.targetPlatform}</td></tr>
          <tr><td class="label">تاريخ التقرير:</td><td>${new Date().toLocaleDateString('ar-YE')}</td></tr>
          <tr><td class="label">حالة المهمة:</td><td>${task.status}</td></tr>
        </table>
        <h3>تفاصيل ومخرجات التقرير:</h3>
        <div class="content">${reportText}</div>
        <div class="footer">وثيقة إدارية معتمدة تم تصديرها آلياً من نظام The Lord ERP.C.P AI</div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_${task.title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('تم تصدير مستند Word الرسمي بنجاح! 📄');
  };

  // Export 3: Adobe PDF Export View
  const handleExportPDF = () => {
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Workspace Top Bar */}
        <div className="p-4 md:px-6 bg-obsidian-card border-b border-gray-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center text-lord-gold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black text-white">{task.title}</h2>
                <Badge variant="gold">{task.targetPlatform}</Badge>
              </div>
              <p className="text-[11px] text-gray-400">
                مساحة العمل والتنفيذ الذكية المشتركة مع TheLordAI Copilot
              </p>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-2.5 py-1.5 rounded-xl bg-obsidian-primary hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="نسخ نص التقرير"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">نسخ نص</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="تصدير كملف Word .doc"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>تصدير Word</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="تصدير أو طباعة PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-obsidian-primary text-gray-400 hover:text-white border border-gray-800 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body: Split Screen */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Panel: Dynamic Stage Deliverables */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
            <div className="p-4 bg-obsidian-card rounded-2xl border border-obsidian-border space-y-2">
              <span className="text-xs font-bold text-lord-gold block">وصف وتوجيهات المهمة:</span>
              <p className="text-xs text-gray-300 leading-relaxed">{task.description}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-lord-gold" />
                  <span>مراحل التنفيذ والتسليم المعتمدة ({task.stages?.length || 0} مراحل):</span>
                </span>
                <span className="text-[10px] text-gray-400">يرجى تسليم كل مرحلة بمرفقاتها الإلزامية</span>
              </div>

              {task.stages?.map((stage: any) => (
                <StageDeliverableBox
                  key={stage.stageOrder}
                  taskId={task._id}
                  stage={stage}
                  onRefresh={() => {
                    if (onStageUpdated) onStageUpdated();
                  }}
                />
              ))}
            </div>
          </div>

          {/* Side Panel: TheLordAI Task Copilot & Draft Generator */}
          <div className="w-full lg:w-96 bg-obsidian-card border-t lg:border-t-0 lg:border-r border-obsidian-border flex flex-col justify-between shrink-0 shadow-2xl">
            {/* Copilot Header */}
            <div className="p-3 bg-obsidian-surface border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-lord-gold" />
                <span className="text-xs font-bold text-white">TheLordAI Task Copilot</span>
              </div>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveCopilotTab('CHAT')}
                  className={`px-2 py-0.5 rounded-lg font-bold ${
                    activeCopilotTab === 'CHAT' ? 'bg-lord-gold text-obsidian-primary' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  الدردشة
                </button>
                <button
                  type="button"
                  onClick={handleGenerateDraftReport}
                  className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                    activeCopilotTab === 'DRAFT' ? 'bg-lord-gold text-obsidian-primary' : 'text-lord-gold hover:underline'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>توليد مسودة</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeCopilotTab === 'CHAT' ? (
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {copilotMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'model'
                        ? 'bg-obsidian-surface text-gray-200 border border-gray-800'
                        : 'bg-lord-gold/15 text-lord-gold border border-lord-gold/30 mr-4'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1 font-bold">
                      {msg.role === 'model' ? <Bot className="w-3 h-3 text-lord-gold" /> : <User className="w-3 h-3 text-cyber-blue" />}
                      <span>{msg.role === 'model' ? 'TheLordAI Copilot' : 'أنت'}</span>
                    </div>
                    {msg.text}
                  </div>
                ))}

                {isCopilotThinking && (
                  <div className="flex items-center gap-2 text-xs text-lord-gold p-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التفكير وصياغة الحل...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                <span className="text-[11px] font-bold text-lord-gold block">مسودة التقرير الرسمي المُولّدة:</span>
                <textarea
                  value={generatedDraft}
                  onChange={(e) => setGeneratedDraft(e.target.value)}
                  rows={14}
                  className="w-full bg-obsidian-surface border border-gray-800 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-lord-gold"
                  placeholder="جاري كتابة مسودة التقرير..."
                />
              </div>
            )}

            {/* Input Form */}
            {activeCopilotTab === 'CHAT' && (
              <form onSubmit={handleSendCopilotMessage} className="p-3 bg-obsidian-surface border-t border-gray-800 flex items-center gap-2">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="اسأل رفيق التنفيذ عن خطة المهمة أو صياغة العمل..."
                  className="flex-1 bg-obsidian-card border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold"
                />
                <Button type="submit" variant="gold" size="sm" disabled={isCopilotThinking || !inputPrompt.trim()} className="rounded-xl shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : null;
};
