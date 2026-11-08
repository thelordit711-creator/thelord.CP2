'use client';

import React, { useState } from 'react';
import {
  FileCheck,
  Check,
  X,
  Wallet,
  Coins,
  ShieldAlert,
  HelpCircle,
  Building2,
  TrendingUp,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AppModalPortal } from '../ui/AppModalPortal';

type VaultSegment = 'salaries' | 'marketing' | 'operationalReserve';

interface PendingFinancialRequestsProps {
  requests: any[];
  vault?: any;
  isDeciding: boolean;
  onDecision: (
    requestId: string,
    decision: 'APPROVE' | 'REJECT' | 'NOTE',
    targetVaultSegment?: VaultSegment,
    adminNotes?: string
  ) => void;
}

export const PendingFinancialRequests: React.FC<PendingFinancialRequestsProps> = ({
  requests,
  vault,
  isDeciding,
  onDecision
}) => {
  // Modal state for approving request and specifying vault
  const [selectedReqForApproval, setSelectedReqForApproval] = useState<any | null>(null);
  const [chosenSegment, setChosenSegment] = useState<VaultSegment>('operationalReserve');
  const [approvalNote, setApprovalNote] = useState<string>('');

  const openApprovalModal = (req: any) => {
    // Smart auto-selection based on expense category
    let autoSegment: VaultSegment = 'operationalReserve';
    const cat = req.financialRequirement?.expenseCategory;
    if (cat === 'SALARY' || cat === 'BONUS' || cat === 'ADVANCE') {
      autoSegment = 'salaries';
    } else if (cat === 'TG_ADS' || cat === 'TG_CHANNEL_PROMO') {
      autoSegment = 'marketing';
    } else {
      autoSegment = 'operationalReserve';
    }

    setChosenSegment(autoSegment);
    setApprovalNote('معتمد للصرف عبر الصندوق');
    setSelectedReqForApproval(req);
  };

  const handleConfirmApproval = () => {
    if (!selectedReqForApproval) return;
    onDecision(
      selectedReqForApproval._id,
      'APPROVE',
      chosenSegment,
      approvalNote.trim() || 'معتمد للصرف عبر الصندوق'
    );
    setSelectedReqForApproval(null);
  };

  const segmentedVaults = vault?.segmentedVaults || {
    salaries: { name: 'صندوق الرواتب والأجور', balance: 15000 },
    marketing: { name: 'صندوق التسويق والإعلانات', balance: 8000 },
    operationalReserve: { name: 'صندوق الاحتياطي التقني والتشغيلي', balance: 12000 }
  };

  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-lord-gold" />
          <div>
            <h3 className="text-lg font-bold text-white">الطلبات المالية بانتظار اعتماد المسؤول</h3>
            <p className="text-xs text-gray-400">
              اعتماد الصرف يتطلب تحديد الصندوق المالي المحاسبي المخصوم منه المبلغ
            </p>
          </div>
        </div>
        <Badge variant="gold">{requests.length} طلبات معلقة</Badge>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-10 text-xs text-gray-500 bg-obsidian-surface/40 rounded-2xl border border-dashed border-gray-800">
          لا توجد طلبات مالية معلقة بانتظار الاعتماد حالياً.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => (
            <div
              key={req._id}
              className="p-4 rounded-2xl bg-obsidian-surface border border-obsidian-border hover:border-lord-gold/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-bold text-white">{req.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-lord-gold/15 text-lord-gold border border-lord-gold/30 font-bold">
                    طلب ميزانية
                  </span>
                  {req.financialRequirement?.expenseCategory && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">
                      {req.financialRequirement.expenseCategory}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  المقدم: <strong className="text-gray-200">{req.createdBy?.fullName || 'عضو'}</strong> |
                  المبلغ: <strong className="text-emerald-400 font-mono font-bold">{req.financialRequirement?.amount} USDT</strong> |
                  الوسيلة المطلوبة: <strong className="text-cyber-blue font-mono">{req.financialRequirement?.payoutMethodRequested}</strong>
                </p>
                {req.financialRequirement?.justification && (
                  <p className="text-xs text-gray-400 mt-1 italic">
                    "{req.financialRequirement.justification}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="gold"
                  size="sm"
                  disabled={isDeciding}
                  onClick={() => openApprovalModal(req)}
                  className="flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>تحديد الصندوق والموافقة ⚡</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  disabled={isDeciding}
                  onClick={() => onDecision(req._id, 'REJECT')}
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>رفض</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Select Vault & Approve Request */}
      {selectedReqForApproval && (
        <AppModalPortal isOpen={!!selectedReqForApproval} onClose={() => setSelectedReqForApproval(null)}>
          <div className="w-full max-w-lg bg-[#090c15] border-2 border-lord-gold/60 rounded-3xl shadow-2xl p-6 text-white text-right space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center font-bold text-lord-gold text-lg">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">اعتماد الطلب المالي وتحديد صندوق الصرف</h3>
                  <p className="text-xs text-gray-400">حدد الصندوق المالي المخصص لخصم هذه الميزانية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqForApproval(null)}
                className="p-1.5 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Request Summary Card */}
            <div className="p-3.5 rounded-2xl bg-gray-900/80 border border-gray-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">المهمة / الغرض:</span>
                <span className="font-bold text-white">{selectedReqForApproval.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">المستفيد:</span>
                <span className="font-bold text-gray-200">{selectedReqForApproval.createdBy?.fullName || 'عضو'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-800/60">
                <span className="text-gray-400 font-bold">المبلغ المطلوب للصرف:</span>
                <span className="font-black text-emerald-400 font-mono text-sm">
                  {selectedReqForApproval.financialRequirement?.amount} USDT
                </span>
              </div>
            </div>

            {/* Selection: Target Vault Segment */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-lord-gold">
                اختر الصندوق المراد الصرف منه (حساب الخصم) *:
              </label>

              <div className="space-y-2">
                {/* 1. Salaries */}
                <div
                  onClick={() => setChosenSegment('salaries')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    chosenSegment === 'salaries'
                      ? 'bg-lord-gold/15 border-lord-gold text-white shadow-md'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className={`w-5 h-5 ${chosenSegment === 'salaries' ? 'text-lord-gold' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">صندوق الرواتب والأجور</div>
                      <div className="text-[10px] text-gray-400">رواتب الكادر، المكافآت، والسلف المالية</div>
                    </div>
                  </div>
                  <div className="text-left font-mono text-xs">
                    <span className="text-gray-400 block text-[10px]">الرصيد المتاح:</span>
                    <strong className="text-emerald-400">
                      ${(segmentedVaults.salaries?.balance ?? 0).toLocaleString()} USDT
                    </strong>
                  </div>
                </div>

                {/* 2. Marketing */}
                <div
                  onClick={() => setChosenSegment('marketing')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    chosenSegment === 'marketing'
                      ? 'bg-cyber-blue/15 border-cyber-blue text-white shadow-md'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className={`w-5 h-5 ${chosenSegment === 'marketing' ? 'text-cyber-blue' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">صندوق التسويق والإعلانات</div>
                      <div className="text-[10px] text-gray-400">إعلانات التليجرام الرسمية، ترويج القنوات، والحملات</div>
                    </div>
                  </div>
                  <div className="text-left font-mono text-xs">
                    <span className="text-gray-400 block text-[10px]">الرصيد المتاح:</span>
                    <strong className="text-emerald-400">
                      ${(segmentedVaults.marketing?.balance ?? 0).toLocaleString()} USDT
                    </strong>
                  </div>
                </div>

                {/* 3. Operational Reserve */}
                <div
                  onClick={() => setChosenSegment('operationalReserve')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    chosenSegment === 'operationalReserve'
                      ? 'bg-purple-500/15 border-purple-500 text-white shadow-md'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Cpu className={`w-5 h-5 ${chosenSegment === 'operationalReserve' ? 'text-purple-400' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">صندوق الاحتياطي التقني والتشغيلي</div>
                      <div className="text-[10px] text-gray-400">اشتراكات السيرفرات، أدوات التحليل، والنفقات العامة</div>
                    </div>
                  </div>
                  <div className="text-left font-mono text-xs">
                    <span className="text-gray-400 block text-[10px]">الرصيد المتاح:</span>
                    <strong className="text-emerald-400">
                      ${(segmentedVaults.operationalReserve?.balance ?? 0).toLocaleString()} USDT
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                توجيهات أو ملاحظات إدارية لأمين الصندوق (اختياري):
              </label>
              <input
                type="text"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="مثال: معتمد للصرف الفوري عبر شبكة BEP20"
                className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-lord-gold text-xs text-white outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedReqForApproval(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 transition-all"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isDeciding}
                onClick={handleConfirmApproval}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-lord-gold to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black text-xs font-black shadow-lg shadow-lord-gold/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isDeciding ? (
                  <span>جاري الاعتماد...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>تأكيد الاعتماد والتحويل للصندوق 🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </AppModalPortal>
      )}
    </div>
  );
};
