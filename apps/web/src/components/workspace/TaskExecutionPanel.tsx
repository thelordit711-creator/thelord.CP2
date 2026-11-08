'use client';

import React, { useState } from 'react';
import {
  Coins,
  CheckCircle,
  Clock,
  Building2,
  AlertTriangle,
  Receipt,
  Copy,
  ExternalLink,
  Check,
  FileText,
  Layers,
  Briefcase,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StageDeliverableBox } from '../tasks/StageDeliverableBox';
import { toast } from 'sonner';

interface TaskExecutionPanelProps {
  selectedTask: any | null;
  onCloseTask: () => void;
  onRefreshTasks: () => Promise<any>;
  onOpenLightbox: (img: { url: string; alt: string }) => void;
  confirmPayoutReceipt: (params: { orderId: string; note?: string }) => any;
  isConfirmingReceipt: boolean;
  settleTaskBudget: (params: { taskId: string; data: any }) => any;
  isSettlingBudget: boolean;
}

export const TaskExecutionPanel: React.FC<TaskExecutionPanelProps> = ({
  selectedTask,
  onCloseTask,
  onRefreshTasks,
  onOpenLightbox,
  confirmPayoutReceipt,
  isConfirmingReceipt,
  settleTaskBudget,
  isSettlingBudget
}) => {
  const [confirmNote, setConfirmNote] = useState('');
  const [showExpenseBox, setShowExpenseBox] = useState(false);
  const [spentAmountInput, setSpentAmountInput] = useState('');
  const [expenseDetailsInput, setExpenseDetailsInput] = useState('');
  const [invoiceUrlInput, setInvoiceUrlInput] = useState('');

  if (!selectedTask) {
    return (
      <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-12 text-center text-gray-500 text-right">
        <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-600" />
        <p className="text-sm">اختر مهمة من القائمة لعرض تفاصيلها ومراحل تسليمها</p>
      </div>
    );
  }

  const fin = selectedTask.financialRequirement;
  const payoutOrder = typeof fin?.payoutOrderId === 'object' ? (fin.payoutOrderId as any) : null;
  const isDisbursed = payoutOrder?.executionStatus === 'DISBURSED';
  const isProcessing = payoutOrder?.executionStatus === 'IN_PROGRESS';
  const isWaitingTreasury = payoutOrder?.executionStatus === 'WAITING_TREASURY' || fin?.adminApprovalStatus === 'APPROVED';
  const isRejected = fin?.adminApprovalStatus === 'REJECTED';

  const payoutMethodLabel =
    fin?.payoutMethodRequested === 'BEP20_USDT'
      ? 'USDT (شبكة BSC BEP-20)'
      : fin?.payoutMethodRequested === 'JEEB_WALLET'
      ? 'محفظة جيب الإلكترونية (Jeeb)'
      : fin?.payoutMethodRequested === 'JAWALI_WALLET'
      ? 'محفظة جوالي الإلكترونية (Jawali)'
      : fin?.payoutMethodRequested || 'تحويل مالي';

  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 space-y-6 text-right">
      {/* Title & Close */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-white truncate">{selectedTask.title}</h2>
            <Badge variant="gold" className="shrink-0">{selectedTask.targetPlatform}</Badge>
          </div>
          <button
            type="button"
            onClick={onCloseTask}
            className="p-1.5 rounded-xl bg-obsidian-surface hover:bg-gray-800 text-gray-400 hover:text-white transition-colors shrink-0"
            title="إغلاق تفاصيل المهمة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          {selectedTask.description}
        </p>
      </div>

      {/* Financial Requirement & Payout Status Card */}
      {fin?.requiresBudget && (
        <div
          className={`p-4 rounded-2xl border transition-all space-y-3 backdrop-blur-md shadow-md ${
            isDisbursed
              ? 'bg-gradient-to-l from-emerald-950/25 via-obsidian-card to-obsidian-surface border-emerald-500/50 shadow-emerald-500/10'
              : isProcessing
              ? 'bg-gradient-to-l from-amber-950/25 via-obsidian-card to-obsidian-surface border-amber-500/50 shadow-amber-500/10'
              : isWaitingTreasury
              ? 'bg-gradient-to-l from-amber-950/20 via-obsidian-card to-obsidian-surface border-lord-gold/40'
              : isRejected
              ? 'bg-gradient-to-l from-red-950/25 via-obsidian-card to-obsidian-surface border-red-500/50'
              : 'bg-gradient-to-l from-yellow-950/25 via-obsidian-card to-obsidian-surface border-yellow-500/40'
          }`}
        >
          {/* Financial Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                  isDisbursed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                    : isProcessing
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35 animate-pulse'
                    : 'bg-lord-gold/20 text-lord-gold border border-lord-gold/35'
                }`}
              >
                <Coins className="w-4 h-4 text-current" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>ميزانية المهمة:</span>
                  <span className="text-lord-gold font-mono font-black text-base">
                    ${fin.amount} {fin.currency || 'USDT'}
                  </span>
                </h4>
                <span className="text-[11px] text-gray-400 block">
                  طريقة الاستلام: <strong className="text-gray-200">{payoutMethodLabel}</strong>
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">
              {isDisbursed ? (
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم تحويل وصرف المبلغ بنجاح ✓</span>
                </span>
              ) : isProcessing ? (
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>جاري التحويل والصرف من الخزينة ⏳</span>
                </span>
              ) : isWaitingTreasury ? (
                <span className="px-3 py-1 rounded-xl bg-lord-gold/15 border border-lord-gold/40 text-lord-gold font-bold text-xs flex items-center gap-1.5 shadow-sm">
                  <Building2 className="w-3.5 h-3.5 text-lord-gold" />
                  <span>معتمد إدارياً — بانتظار صرف الخزينة 🏦</span>
                </span>
              ) : isRejected ? (
                <span className="px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                  <span>تم رفض الميزانية ❌</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                  <span>بانتظار موافقة الإدارة ⚠️</span>
                </span>
              )}
            </div>
          </div>

          {/* Proof Details if Disbursed */}
          {isDisbursed && payoutOrder?.transferProof && (
            <div className="p-3 rounded-xl bg-obsidian-surface border border-emerald-500/35 space-y-2.5">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  <span>إشعار وسند التحويل الصادر:</span>
                </span>
                {payoutOrder.disbursedClickedAt && (
                  <span className="text-gray-400 font-mono text-[10px]">
                    {new Date(payoutOrder.disbursedClickedAt).toLocaleString('ar-YE')}
                  </span>
                )}
              </div>

              {payoutOrder.transferProof.txHashOrReferenceNumber && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-obsidian-card border border-gray-700/80 gap-2 flex-wrap">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 block">كود / هاش التحويل:</span>
                    <span className="font-mono text-xs text-white font-bold select-all break-all">
                      {payoutOrder.transferProof.txHashOrReferenceNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(payoutOrder.transferProof.txHashOrReferenceNumber);
                        toast.success('تم نسخ كود التحويل 📋');
                      }}
                      className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3 text-lord-gold" />
                      <span>نسخ</span>
                    </button>
                    {payoutOrder.transferProof.txHashOrReferenceNumber.startsWith('0x') && (
                      <a
                        href={`https://bscscan.com/tx/${payoutOrder.transferProof.txHashOrReferenceNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded bg-lord-gold/15 text-lord-gold hover:underline text-xs font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>BscScan</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {payoutOrder.transferProof.receiptScreenshot?.fileUrl && (
                <div className="flex items-center gap-2.5 pt-0.5">
                  <span className="text-[10px] text-gray-300 font-bold">صورة السند:</span>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenLightbox({
                        url: payoutOrder.transferProof.receiptScreenshot.fileUrl,
                        alt: 'سند التحويل'
                      })
                    }
                    className="group relative cursor-zoom-in rounded-lg overflow-hidden border border-emerald-500/40 hover:border-lord-gold transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={payoutOrder.transferProof.receiptScreenshot.fileUrl}
                      alt="سند التحويل"
                      className="w-20 h-14 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white font-bold">
                      تكبير
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Receipt Confirmation Block */}
          {isDisbursed && payoutOrder && (
            <div className="p-3.5 rounded-xl bg-obsidian-surface border border-gray-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-lord-gold" />
                  <span>تأكيد استلام المبلغ من الصندوق</span>
                </span>
                {payoutOrder.requireConfirmation && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    مطلوب من الإدارة ⚠️
                  </span>
                )}
              </div>

              {payoutOrder.employeeConfirmation?.isConfirmed ? (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold block">✓ قمت بتأكيد استلام المبلغ في محفظتك</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(payoutOrder.employeeConfirmation.confirmedAt).toLocaleString('ar-YE')}
                    </span>
                    {payoutOrder.employeeConfirmation.confirmationNote && (
                      <p className="text-[11px] text-gray-300 mt-1 italic">
                        "{payoutOrder.employeeConfirmation.confirmationNote}"
                      </p>
                    )}
                  </div>
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-400">
                    فور وصول الحوالة لحسابك، يرجى تأكيد الاستلام لإشعار الصندوق والإدارة وإغلاق القيد:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="ملاحظة تأكيد (اختياري، مثلاً: استلمت الرصيد بنجاح في المحفظة)..."
                      value={confirmNote}
                      onChange={(e) => setConfirmNote(e.target.value)}
                      className="w-full sm:flex-1 bg-obsidian-card border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-lord-gold"
                    />
                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      disabled={isConfirmingReceipt}
                      onClick={async () => {
                        try {
                          await confirmPayoutReceipt({
                            orderId: payoutOrder._id,
                            note: confirmNote
                          }).unwrap();
                          toast.success('تم تأكيد استلام الحوالة بنجاح وإشعار الصندوق والإدارة! ✓');
                          onRefreshTasks();
                        } catch (err: any) {
                          toast.error(err?.data?.error || 'فشل تأكيد الاستلام');
                        }
                      }}
                      className="w-full sm:w-auto font-bold text-xs whitespace-nowrap"
                    >
                      ✓ أؤكد استلام الحوالة
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task Budget Expense Breakdown & Settlement Block */}
          {isDisbursed && (
            <div className="p-3.5 rounded-xl bg-obsidian-surface border border-gray-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-lord-gold" />
                  <span>بيان وتسوية مصروفات الميزانية (اختياري للمهمة)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowExpenseBox(!showExpenseBox)}
                  className="text-[11px] font-bold text-lord-gold hover:underline"
                >
                  {showExpenseBox
                    ? 'إخفاء ▲'
                    : selectedTask.budgetSettlement?.isSettled
                    ? 'عرض البيان المسجل ▼'
                    : '+ كتابة بيان الصرف ▼'}
                </button>
              </div>

              {selectedTask.budgetSettlement?.isSettled && !showExpenseBox && (
                <div className="p-2.5 rounded-lg bg-lord-gold/10 border border-lord-gold/30 text-xs text-lord-gold flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold block">
                      تم توثيق بيان الصرف: ${selectedTask.budgetSettlement.spentAmount} USDT
                    </span>
                    <span className="text-[11px] text-gray-300 block mt-0.5 line-clamp-1">
                      {selectedTask.budgetSettlement.breakdownDetails}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowExpenseBox(true)}
                    className="text-[11px] text-white underline font-bold"
                  >
                    تفاصيل
                  </button>
                </div>
              )}

              {showExpenseBox && (
                <div className="p-3 rounded-xl bg-obsidian-card border border-gray-700/80 space-y-3 animate-fadeIn">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    يمكنك هنا كتابة تفاصيل المبلغ المستلم وأين ومتى تم صرفه (مثلاً: إعلانات تليجرام، رسوم اشتراك، إلخ) وإرفاق أي فواتير أو روابط داعمة:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">المبلغ المنفق فعلياً (USDT):</label>
                      <input
                        type="number"
                        min={0}
                        placeholder={String(fin.amount)}
                        value={spentAmountInput}
                        onChange={(e) => setSpentAmountInput(e.target.value)}
                        className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">رابط الفاتورة أو الإيصال الداعم (اختياري):</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={invoiceUrlInput}
                        onChange={(e) => setInvoiceUrlInput(e.target.value)}
                        className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">تفاصيل ومواعيد الصرف وأي بيانات إضافية:</label>
                    <textarea
                      rows={3}
                      placeholder="اكتب أين ومتى تم صرف الميزانية، مثلاً: تم حجز حملة إعلانية في قناة X يوم 8 نوفمبر بمبلغ 150 دولار..."
                      value={expenseDetailsInput}
                      onChange={(e) => setExpenseDetailsInput(e.target.value)}
                      className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-lord-gold"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowExpenseBox(false)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      disabled={isSettlingBudget}
                      onClick={async () => {
                        try {
                          await settleTaskBudget({
                            taskId: selectedTask._id,
                            data: {
                              spentAmount: Number(spentAmountInput) || Number(fin.amount),
                              breakdownDetails: expenseDetailsInput,
                              invoicesAndReceipts: invoiceUrlInput ? [{ fileUrl: invoiceUrlInput, originalName: 'فاتورة الصرف', fileType: 'IMAGE', sizeBytes: 0 }] : []
                            }
                          }).unwrap();
                          toast.success('تم حفظ وتوثيق بيان مصروفات الميزانية بنجاح! 🧾');
                          setShowExpenseBox(false);
                          onRefreshTasks();
                        } catch (err: any) {
                          toast.error(err?.data?.error || 'فشل حفظ بيان المصروفات');
                        }
                      }}
                      className="font-bold text-xs"
                    >
                      حفظ وتوثيق بيان الصرف 🧾
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stages Stepper */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-lord-gold" />
          <span>مراحل التنفيذ المتسلسلة:</span>
        </h4>

        {selectedTask.stages?.map((stage: any) => (
          <StageDeliverableBox
            key={stage.stageOrder}
            taskId={selectedTask._id}
            stage={stage}
            canSubmit={true}
            isAdmin={false}
            onRefresh={async () => {
              const res = await onRefreshTasks();
              if (res?.data?.data) {
                const updated = res.data.data.find((t: any) => t._id === selectedTask._id);
                if (updated) {
                  // updated in parent
                }
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

