'use client';

import React from 'react';
import { Wallet, Coins, TrendingUp, ShieldCheck, ArrowLeftRight, Plus } from 'lucide-react';

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
  const totalSpent =
    (vault?.totalSpentByCategory?.salaries ?? 0) +
    (vault?.totalSpentByCategory?.bonuses ?? 0) +
    (vault?.totalSpentByCategory?.advances ?? 0) +
    (vault?.totalSpentByCategory?.telegramOfficialAds ?? 0) +
    (vault?.totalSpentByCategory?.telegramChannelPromos ?? 0) +
    (vault?.totalSpentByCategory?.softwareSubscriptions ?? 0) +
    (vault?.totalSpentByCategory?.otherExpenses ?? 0);

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* General Budget */}
        <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-lord-gold/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs text-lord-gold font-bold block">الميزانية العامة للشركة (الأصل الأساسي)</span>
              <span className="text-[11px] text-gray-400">Company Master Budget</span>
            </div>
            <div className="p-2.5 rounded-xl bg-lord-gold/15 text-lord-gold">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            ${(vault?.generalBudget ?? 0).toLocaleString()}{' '}
            <span className="text-xs text-lord-gold font-normal">USDT</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            الرصيد الأساسي الأم للشركة؛ تُغذى منه الخزينة عبر خصم معتمد ولا يُصرف منه مباشرة
          </p>
        </div>

        {/* Treasury Balance */}
        <div className="bg-obsidian-card border border-cyber-blue/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-cyber-blue/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs text-cyber-blue font-bold block">رصيد الصندوق المتاح للصرف</span>
              <span className="text-[11px] text-gray-400">Treasury Payout Desk</span>
            </div>
            <div className="p-2.5 rounded-xl bg-cyber-blue/15 text-cyber-blue">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            ${(vault?.treasuryBalance ?? 0).toLocaleString()}{' '}
            <span className="text-xs text-cyber-blue font-normal">USDT</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            الرصيد الفعلي المتاح لتحويلات الموظفين والمهام؛ أي إضافة تتم بخصم مباشر من الميزانية العامة
          </p>
        </div>

        {/* Total Spent */}
        <div className="bg-obsidian-card border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs text-emerald-400 font-bold block">إجمالي المصروفات المنفذة</span>
              <span className="text-[11px] text-gray-400">Total Disbursed Expenses</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            ${totalSpent.toLocaleString()}{' '}
            <span className="text-xs text-emerald-400 font-normal">USDT</span>
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
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/30 hover:bg-cyber-blue/25 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
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

