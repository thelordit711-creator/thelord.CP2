'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Coins,
  TrendingUp,
  ShieldCheck,
  ArrowLeftRight,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';

interface FinancialMetricsGridProps {
  vault: any;
  onOpenFundTreasury: () => void;
  onOpenDepositBudget: () => void;
}

export const FinancialMetricsGrid: React.FC<FinancialMetricsGridProps> = ({
  vault,
  onOpenFundTreasury,
  onOpenDepositBudget
}) => {
  // Executive Privacy Mode: By default, sensitive financial figures are masked until clicked
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(true);
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({
    generalBudget: false,
    treasuryBalance: false,
    totalSpent: false
  });

  const totalSpent =
    (vault?.totalSpentByCategory?.salaries ?? 0) +
    (vault?.totalSpentByCategory?.bonuses ?? 0) +
    (vault?.totalSpentByCategory?.advances ?? 0) +
    (vault?.totalSpentByCategory?.telegramOfficialAds ?? 0) +
    (vault?.totalSpentByCategory?.telegramChannelPromos ?? 0) +
    (vault?.totalSpentByCategory?.softwareSubscriptions ?? 0) +
    (vault?.totalSpentByCategory?.otherExpenses ?? 0);

  const toggleCard = (key: 'generalBudget' | 'treasuryBalance' | 'totalSpent') => {
    setRevealedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllPrivacy = () => {
    if (isPrivacyMode) {
      // Reveal all
      setIsPrivacyMode(false);
      setRevealedCards({
        generalBudget: true,
        treasuryBalance: true,
        totalSpent: true
      });
    } else {
      // Mask all
      setIsPrivacyMode(true);
      setRevealedCards({
        generalBudget: false,
        treasuryBalance: false,
        totalSpent: false
      });
    }
  };

  const isCardVisible = (key: 'generalBudget' | 'treasuryBalance' | 'totalSpent') => {
    if (!isPrivacyMode) return true;
    return !!revealedCards[key];
  };

  return (
    <div className="space-y-6">
      {/* Privacy Bar & Controls */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
          <span>المؤشرات المالية للخزينة والسيولة</span>
          {isPrivacyMode && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold font-bold flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>وضع التكتم التنفيذي (الأرقام مخفية حتى النقر)</span>
            </span>
          )}
        </span>

        {/* Master Eye Toggle Button */}
        <button
          type="button"
          onClick={toggleAllPrivacy}
          className="px-3 py-1.5 rounded-xl bg-obsidian-card border border-gray-800 hover:border-lord-gold/40 text-xs font-bold text-gray-300 hover:text-lord-gold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          title="تبديل إظهار / إخفاء كافة الأرقام المالية الحساسة"
        >
          {isPrivacyMode ? (
            <>
              <Eye className="w-3.5 h-3.5 text-lord-gold" />
              <span>إظهار كافة الأرقام</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-red-400" />
              <span>إخفاء وحجب الأرقام 🔒</span>
            </>
          )}
        </button>
      </div>

      {/* 3 Metric Cards (Click to reveal / mask) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. General Budget */}
        <div
          onClick={() => toggleCard('generalBudget')}
          className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-lord-gold/60 transition-all cursor-pointer select-none"
          title="انقر للكشف أو الحجب"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs text-lord-gold font-bold block">الميزانية العامة للشركة (الأصل الأساسي)</span>
              <span className="text-[11px] text-gray-400">Company Master Budget</span>
            </div>
            <div className="p-2.5 rounded-xl bg-lord-gold/15 text-lord-gold group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-white tracking-tight">
              {isCardVisible('generalBudget') ? (
                <>
                  ${(vault?.generalBudget ?? 0).toLocaleString()}{' '}
                  <span className="text-xs text-lord-gold font-normal">USDT</span>
                </>
              ) : (
                <span className="text-2xl font-mono text-gray-500 tracking-widest flex items-center gap-2">
                  <span>••••••••</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-800 text-gray-400 font-sans font-bold">
                    انقر للكشف 🔒
                  </span>
                </span>
              )}
            </div>

            <span className="text-[10px] text-gray-500 group-hover:text-lord-gold transition-colors">
              {isCardVisible('generalBudget') ? '👁️ إخفاء' : '👁️ كشف'}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            الرصيد الأساسي الأم للشركة؛ تُغذى منه الخزينة عبر خصم معتمد ولا يُصرف منه مباشرة
          </p>
        </div>

        {/* 2. Treasury Balance */}
        <div
          onClick={() => toggleCard('treasuryBalance')}
          className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-lord-gold/60 transition-all cursor-pointer select-none"
          title="انقر للكشف أو الحجب"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs text-lord-gold font-bold block">رصيد الصندوق المتاح للصرف</span>
              <span className="text-[11px] text-gray-400">Treasury Payout Desk</span>
            </div>
            <div className="p-2.5 rounded-xl bg-lord-gold/15 text-lord-gold group-hover:scale-105 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-white tracking-tight">
              {isCardVisible('treasuryBalance') ? (
                <>
                  ${(vault?.treasuryBalance ?? 0).toLocaleString()}{' '}
                  <span className="text-xs text-lord-gold font-normal">USDT</span>
                </>
              ) : (
                <span className="text-2xl font-mono text-gray-500 tracking-widest flex items-center gap-2">
                  <span>••••••••</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-800 text-gray-400 font-sans font-bold">
                    انقر للكشف 🔒
                  </span>
                </span>
              )}
            </div>

            <span className="text-[10px] text-gray-500 group-hover:text-lord-gold transition-colors">
              {isCardVisible('treasuryBalance') ? '👁️ إخفاء' : '👁️ كشف'}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            الرصيد الفعلي المتاح لتحويلات الموظفين والمهام؛ أي إضافة تتم بخصم مباشر من الميزانية العامة
          </p>
        </div>

        {/* 3. Total Spent */}
        <div
          onClick={() => toggleCard('totalSpent')}
          className="bg-obsidian-card border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all cursor-pointer select-none"
          title="انقر للكشف أو الحجب"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs text-emerald-400 font-bold block">إجمالي المصروفات المنفذة</span>
              <span className="text-[11px] text-gray-400">Total Disbursed Expenses</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-white tracking-tight">
              {isCardVisible('totalSpent') ? (
                <>
                  ${totalSpent.toLocaleString()}{' '}
                  <span className="text-xs text-emerald-400 font-normal">USDT</span>
                </>
              ) : (
                <span className="text-2xl font-mono text-gray-500 tracking-widest flex items-center gap-2">
                  <span>••••••••</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-800 text-gray-400 font-sans font-bold">
                    انقر للكشف 🔒
                  </span>
                </span>
              )}
            </div>

            <span className="text-[10px] text-gray-500 group-hover:text-emerald-400 transition-colors">
              {isCardVisible('totalSpent') ? '👁️ إخفاء' : '👁️ كشف'}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            كافة المصروفات المعتمدة والمنفذة حصراً عبر الصندوق (رواتب، مهام، مكافآت، إعلانات)
          </p>
        </div>
      </div>

      {/* Governance & Liquidity Flow Indicator */}
      <div className="bg-gradient-to-r from-obsidian-card via-obsidian-surface to-obsidian-card border border-lord-gold/25 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-lord-gold/15 text-lord-gold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">قواعد الحوكمة المحاسبية لدورة السيولة</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-lord-gold/20 text-lord-gold font-bold border border-lord-gold/30">
                نظام محاسبي صارم
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              الميزانية العامة هي الرصيد الأساسي ➔ أي إضافة للصندوق تُخصم تلقائياً من الميزانية العامة ➔ المصروفات تُصرف حصراً عبر الصندوق
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={onOpenFundTreasury}
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-lord-gold/15 text-lord-gold border border-lord-gold/30 hover:bg-lord-gold/25 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>تغذية الصندوق من الميزانية</span>
          </button>

          <button
            type="button"
            onClick={onOpenDepositBudget}
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-lord-gold/15 text-lord-gold border border-lord-gold/30 hover:bg-lord-gold/25 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إيداع في الميزانية العامة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
