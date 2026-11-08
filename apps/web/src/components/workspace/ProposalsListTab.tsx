'use client';

import React from 'react';
import { Sparkles, Layers } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProposalsListTabProps {
  tasks: any[];
  onOpenProposeModal: () => void;
  onSelectTask: (task: any) => void;
}

export const ProposalsListTab: React.FC<ProposalsListTabProps> = ({
  tasks,
  onOpenProposeModal,
  onSelectTask
}) => {
  const proposedTasks = tasks.filter((t) => t.isProposedByEmployee);

  return (
    <div className="space-y-6 text-right">
      {/* Executive Proposal Hub Hero Card */}
      <div className="bg-gradient-to-br from-obsidian-card via-obsidian-surface to-obsidian-card border-2 border-lord-gold/40 rounded-3xl p-6 md:p-8 shadow-gold-glow relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-lord-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>محرك بناء واقتراح المبادرات والمهام المتكامل</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              اقترح مهمة ومراحلها التنفيذية بالذكاء الاصطناعي 💡
            </h2>
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
              يمكنك الآن كعضو في الكادر اقتراح مهام ومشاريع ذاتية أو تكليف زملاءك بها، مع بناء المسار التنفيذي للمراحل، وتحديد المخرجات المطلوبة بدقة، والتفريغ الصوتي بالذكاء الاصطناعي، وطلب ميزانية مالية معتمدة من الإدارة.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-gray-300">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-primary/60 border border-gray-800">
                <span className="w-6 h-6 rounded-lg bg-lord-gold/15 text-lord-gold flex items-center justify-center font-bold text-xs">🎙️</span>
                <span>تفريغ وهيكلة صوتية TheLord AI Voice-to-Task</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-primary/60 border border-gray-800">
                <span className="w-6 h-6 rounded-lg bg-cyber-blue/15 text-cyber-blue flex items-center justify-center font-bold text-xs">📋</span>
                <span>بناء مراحل تنفيذ تفصيلية وشروط استلام المخرجات</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-primary/60 border border-gray-800">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs">💰</span>
                <span>طلب ميزانية معتمدة وصرفها عبر USDT أو جيب/جوالي</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-obsidian-primary/60 border border-gray-800">
                <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs">👥</span>
                <span>تنفيذ ذاتي 🙋‍♂️ أو تكليف زملاء الكادر وإشعارهم لحظياً</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center sm:items-start md:items-center justify-center gap-3">
            <Button
              type="button"
              variant="gold"
              size="lg"
              onClick={onOpenProposeModal}
              className="font-black px-8 py-4 rounded-2xl shadow-gold-glow flex items-center gap-2 text-sm w-full sm:w-auto"
            >
              <Sparkles className="w-5 h-5 text-obsidian-primary" />
              <span>فتح محرك بناء واقتراح المهمة الآن ⚡</span>
            </Button>
            <span className="text-[11px] text-gray-400">نفس المحرك الشامل المتاح في صفحة المهام والمراحل</span>
          </div>
        </div>
      </div>

      {/* List of previously proposed initiatives by employee */}
      <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-lord-gold" />
            <span>سجل المبادرات والمقترحات التي رفعتها للإدارة ({proposedTasks.length})</span>
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenProposeModal}
            className="text-xs text-lord-gold border-lord-gold/40 hover:bg-lord-gold/10 rounded-xl"
          >
            + إضافة مقترح جديد
          </Button>
        </div>

        {proposedTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-obsidian-surface border border-gray-800 flex items-center justify-center mx-auto text-xl text-lord-gold">
              💡
            </div>
            <p className="text-sm font-semibold text-gray-300">لم تقم برفع أي مقترح مهمة حتى الآن</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              هل لديك فكرة أو مبادرة تطويرية؟ انقر على الزر بالأعلى لبناء مقترحك مع مراحله وميزانيته ورفعه للمسؤول للاعتماد!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposedTasks.map((t) => (
              <div
                key={t._id}
                onClick={() => onSelectTask(t)}
                className="p-5 rounded-2xl bg-obsidian-surface border border-gray-800 hover:border-lord-gold/50 cursor-pointer transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-lord-gold/10 text-lord-gold border border-lord-gold/30">
                    {t.targetPlatform || 'GENERAL_SYSTEM'}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      t.status === 'PENDING_ADMIN_REVIEW'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                        : t.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : t.status === 'REJECTED'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : 'bg-cyber-blue/15 text-cyber-blue border-cyber-blue/30'
                    }`}
                  >
                    {t.status === 'PENDING_ADMIN_REVIEW'
                      ? 'بانتظار مراجعة الإدارة ⏳'
                      : t.status === 'COMPLETED'
                      ? 'مكتملة ومعتمدة ✅'
                      : t.status === 'REJECTED'
                      ? 'تم رفض المقترح ❌'
                      : 'معتمدة وقيد التنفيذ 🚀'}
                  </span>
                </div>

                <h4 className="text-sm font-black text-white group-hover:text-lord-gold transition-colors line-clamp-1">
                  {t.title}
                </h4>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {t.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800/80 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-lord-gold" />
                    <span>{t.stages?.length || 0} مراحل تنفيذ</span>
                  </span>

                  {t.financialRequirement?.requiresBudget && (
                    <span className="text-lord-gold font-mono font-bold">
                      ميزانية: ${t.financialRequirement.amount} USDT
                    </span>
                  )}

                  <span className="text-gray-500 font-mono text-[10px]">
                    {new Date(t.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
