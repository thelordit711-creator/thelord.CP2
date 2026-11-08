'use client';

import React from 'react';
import { ArrowLeftRight, X, Sparkles, ArrowDownLeft, ArrowUpRight, Plus, AlertTriangle } from 'lucide-react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { lordToast } from '../../../lib/lordToast';

interface VaultLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: any;
  activeTab: 'FUND_TREASURY' | 'DEPOSIT_BUDGET' | 'RETURN_BUDGET';
  setActiveTab: (tab: 'FUND_TREASURY' | 'DEPOSIT_BUDGET' | 'RETURN_BUDGET') => void;
  adjustAmount: number;
  setAdjustAmount: (val: number) => void;
  adjustReason: string;
  setAdjustReason: (val: string) => void;
  targetSegment?: 'salaries' | 'marketing' | 'operationalReserve';
  setTargetSegment?: (seg?: 'salaries' | 'marketing' | 'operationalReserve') => void;
  isAdjusting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const VaultLiquidityModal: React.FC<VaultLiquidityModalProps> = ({
  isOpen,
  onClose,
  vault,
  activeTab,
  setActiveTab,
  adjustAmount,
  setAdjustAmount,
  adjustReason,
  setAdjustReason,
  targetSegment,
  setTargetSegment,
  isAdjusting,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="bg-obsidian-surface border border-lord-gold/40 rounded-3xl w-full p-6 shadow-2xl relative text-right">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-lord-gold" />
            <span>إدارة سيولة الخزينة وتغذية الصندوق</span>
          </h3>
          <p className="text-xs text-gray-400 mb-6">
            تحكّم بتدفقات رأس المال بين الميزانية العامة للشركة وصندوق الصرف التشغيلي وفق دورة حوكمة صارمة.
          </p>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-obsidian-primary rounded-2xl border border-gray-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('FUND_TREASURY');
                setAdjustReason('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');
              }}
              className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all ${
                activeTab === 'FUND_TREASURY'
                  ? 'bg-cyber-blue text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              تغذية الصندوق ⚡
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('DEPOSIT_BUDGET');
                setAdjustReason('إيداع رأس مال / أرباح جديدة في الميزانية العامة');
              }}
              className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all ${
                activeTab === 'DEPOSIT_BUDGET'
                  ? 'bg-lord-gold text-obsidian-primary shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              إيداع ميزانية 💰
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('RETURN_BUDGET');
                setAdjustReason('استرجاع فائض سيولة من الصندوق للميزانية العامة');
              }}
              className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all ${
                activeTab === 'RETURN_BUDGET'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              استرجاع للميزانية 🔄
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Context Box */}
            <div className="p-3.5 rounded-2xl bg-obsidian-primary border border-gray-800 text-xs space-y-1.5">
              {activeTab === 'FUND_TREASURY' && (
                <>
                  <div className="flex items-center gap-1.5 text-cyber-blue font-bold">
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>تغذية الصندوق بخصم من الميزانية العامة</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    سيتم خصم المبلغ من <strong>الميزانية العامة (${(vault?.generalBudget ?? 0).toLocaleString()} USDT)</strong> وإضافته مباشرة إلى <strong>رصيد الصندوق</strong> ليتمكن أمين الصندوق من صرف رواتب ومهام الكادر.
                  </p>
                </>
              )}

              {activeTab === 'DEPOSIT_BUDGET' && (
                <>
                  <div className="flex items-center gap-1.5 text-lord-gold font-bold">
                    <Plus className="w-4 h-4" />
                    <span>إيداع رأسمال جديد في الميزانية العامة</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    إضافة سيولة رأسمالية إلى الرصيد الأساسي الأم للشركة. الرصيد الحالي: <strong>${(vault?.generalBudget ?? 0).toLocaleString()} USDT</strong>.
                  </p>
                </>
              )}

              {activeTab === 'RETURN_BUDGET' && (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>استرجاع سيولة من الصندوق إلى الميزانية</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    سحب فائض السيولة من <strong>الصندوق (${(vault?.treasuryBalance ?? 0).toLocaleString()} USDT)</strong> وإعادته للأصل الأم في <strong>الميزانية العامة</strong>.
                  </p>
                </>
              )}
            </div>

            {activeTab === 'FUND_TREASURY' && setTargetSegment && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  توجيه السيولة لصندوق محدد (اختياري):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetSegment(undefined)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      !targetSegment
                        ? 'bg-cyber-blue text-white border-cyber-blue shadow-xs'
                        : 'bg-obsidian-primary text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    عام (الصندوق ككل)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSegment('salaries')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      targetSegment === 'salaries'
                        ? 'bg-amber-500 text-obsidian-primary border-amber-500 shadow-xs'
                        : 'bg-obsidian-primary text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    الرواتب والأجور 💼
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSegment('marketing')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      targetSegment === 'marketing'
                        ? 'bg-cyber-blue text-white border-cyber-blue shadow-xs'
                        : 'bg-obsidian-primary text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    التسويق 📣
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSegment('operationalReserve')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      targetSegment === 'operationalReserve'
                        ? 'bg-emerald-500 text-obsidian-primary border-emerald-500 shadow-xs'
                        : 'bg-obsidian-primary text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    الاحتياطي التشغيلي 🛡️
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                المبلغ (USDT):
              </label>
              <input
                type="number"
                required
                min={1}
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono text-base focus:border-lord-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                البيان وسبب التحويل:
              </label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-lord-gold focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                إلغاء
              </Button>
              <Button type="submit" variant="gold" size="sm" disabled={isAdjusting} className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{isAdjusting ? 'جاري التنفيذ...' : 'تأكيد العملية المحاسبية ⚡'}</span>
              </Button>
            </div>
          </form>
        </div>
    </AppModalPortal>
  );
};
