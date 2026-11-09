'use client';

import React, { useState } from 'react';
import { useGetVaultQuery, useAdjustVaultMutation } from '../../store/api/financeApi';
import {
  Coins,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Wallet,
  Sparkles,
  Plus,
  ArrowDownLeft,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AppModalPortal } from '../ui/AppModalPortal';
import { lordToast } from '../../lib/lordToast';

export const SegmentedVaultsOverview: React.FC = () => {
  const { data: vaultRes, refetch } = useGetVaultQuery();
  const [adjustVault, { isLoading: isAdjusting }] = useAdjustVaultMutation();

  const vault = vaultRes?.data;

  // Selected Vault Segment to feed
  const [feedingVaultKey, setFeedingVaultKey] = useState<'salaries' | 'marketing' | 'operationalReserve' | null>(null);
  const [feedAmount, setFeedAmount] = useState<number>(5000);
  const [feedReason, setFeedReason] = useState<string>('تغذية الصندوق بالخصم من الميزانية العامة');

  const defaultVaults = {
    salaries: {
      name: 'صندوق الرواتب والأجور',
      balance: vault?.segmentedVaults?.salaries?.balance ?? 0,
      monthlyAllocated: vault?.segmentedVaults?.salaries?.monthlyAllocated ?? 0,
      totalSpent: vault?.segmentedVaults?.salaries?.totalSpent ?? 0,
      alertThresholdPercent: 20
    },
    marketing: {
      name: 'صندوق التسويق والإعلانات',
      balance: vault?.segmentedVaults?.marketing?.balance ?? 0,
      monthlyAllocated: vault?.segmentedVaults?.marketing?.monthlyAllocated ?? 0,
      totalSpent: vault?.segmentedVaults?.marketing?.totalSpent ?? 0,
      alertThresholdPercent: 25
    },
    operationalReserve: {
      name: 'صندوق الاحتياطي التقني والتشغيلي',
      balance: vault?.segmentedVaults?.operationalReserve?.balance ?? 0,
      monthlyAllocated: vault?.segmentedVaults?.operationalReserve?.monthlyAllocated ?? 0,
      totalSpent: vault?.segmentedVaults?.operationalReserve?.totalSpent ?? 0,
      alertThresholdPercent: 15
    }
  };

  const vaults = [
    {
      key: 'salaries' as const,
      data: defaultVaults.salaries,
      icon: Wallet,
      colorTheme: 'from-[#0a0d16] via-obsidian-surface to-obsidian-card',
      borderColor: 'border-lord-gold/30',
      badgeColor: 'text-lord-gold bg-lord-gold/10 border-lord-gold/30'
    },
    {
      key: 'marketing' as const,
      data: defaultVaults.marketing,
      icon: TrendingDown,
      colorTheme: 'from-[#0a0d16] via-obsidian-surface to-obsidian-card',
      borderColor: 'border-lord-gold/30',
      badgeColor: 'text-lord-gold bg-lord-gold/10 border-lord-gold/30'
    },
    {
      key: 'operationalReserve' as const,
      data: defaultVaults.operationalReserve,
      icon: ShieldCheck,
      colorTheme: 'from-[#0a0d16] via-obsidian-surface to-obsidian-card',
      borderColor: 'border-lord-gold/30',
      badgeColor: 'text-lord-gold bg-lord-gold/10 border-lord-gold/30'
    }
  ];

  const handleFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedingVaultKey) return;

    const amount = Number(feedAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      lordToast.error('خطأ في المبلغ', 'يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const currentGenBudget = vault?.generalBudget ?? 0;
    if (amount > currentGenBudget) {
      lordToast.error(
        'الميزانية العامة غير كافية',
        `المبلغ المطلوب (${amount.toLocaleString()} USDT) يتجاوز رصيد الميزانية العامة المتاحة (${currentGenBudget.toLocaleString()} USDT)! يرجى إيداع رصيد أولاً في الميزانية العامة.`
      );
      return;
    }

    try {
      await adjustVault({
        actionType: 'FUND_TREASURY',
        targetSegment: feedingVaultKey,
        amount,
        reason: feedReason.trim() || `تغذية ${defaultVaults[feedingVaultKey].name} من الميزانية العامة`
      }).unwrap();

      lordToast.financial(amount, 'USDT');
      lordToast.success(`تمت تغذية ${defaultVaults[feedingVaultKey].name} بنجاح! ⚡`);
      setFeedingVaultKey(null);
      refetch();
    } catch (err: any) {
      lordToast.error('فشل في التغذية', err?.data?.error || 'حدث خطأ أثناء تنفيذ التغذية');
    }
  };

  const selectedVaultData = feedingVaultKey ? defaultVaults[feedingVaultKey] : null;

  return (
    <div className="space-y-4 mb-8 text-right">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-lord-gold" />
          <span>هندسة الصناديق المستقلة للخزينة (Multi-Vault Segmentation)</span>
        </h3>
        <span className="text-[11px] text-gray-400 font-mono">
          إجمالي السيولة الجاهزة: ${((vault?.treasuryBalance ?? 35000)).toLocaleString()} USDT
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vaults.map(({ key, data, icon: Icon, colorTheme, borderColor, badgeColor }) => {
          const percentRemaining = data.monthlyAllocated > 0
            ? Math.round((data.balance / data.monthlyAllocated) * 100)
            : 100;
          const isLow = percentRemaining <= data.alertThresholdPercent;

          return (
            <div
              key={key}
              className={`p-5 rounded-3xl bg-gradient-to-br ${colorTheme} border ${borderColor} shadow-xl relative overflow-hidden space-y-4 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {data.name}
                    </span>
                    <div className="flex items-baseline gap-1.5 pt-2">
                      <span className="text-2xl font-black text-white font-mono tracking-tight">
                        ${data.balance.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">USDT</span>
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-obsidian-surface border border-gray-800 flex items-center justify-center text-lord-gold shadow-md">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 mt-3">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                    <span>المخصص الشهري: ${data.monthlyAllocated.toLocaleString()}</span>
                    <span className={isLow ? 'text-red-400 font-bold' : 'text-gray-300'}>
                      {percentRemaining}% متبقٍ
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLow ? 'bg-red-500' : 'bg-gradient-to-r from-lord-gold to-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, percentRemaining))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer status & Action */}
              <div className="space-y-2.5 pt-2 border-t border-gray-800/80">
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>المصروف الفعلي: ${data.totalSpent.toLocaleString()}</span>
                  {isLow ? (
                    <span className="text-red-400 flex items-center gap-1 font-bold animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      <span>تنبيه: وشك النفاد!</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>سيولة آمنة</span>
                    </span>
                  )}
                </div>

                {/* Direct Feed Button for Super Admin */}
                <button
                  type="button"
                  onClick={() => {
                    setFeedingVaultKey(key);
                    setFeedAmount(5000);
                    setFeedReason(`تغذية ${data.name} بالخصم من الميزانية العامة`);
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-obsidian-surface hover:bg-lord-gold text-lord-gold hover:text-obsidian-primary border border-lord-gold/30 hover:border-lord-gold text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تغذية هذا الصندوق ⚡</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct Feed Modal via AppModalPortal */}
      {feedingVaultKey && selectedVaultData && (
        <AppModalPortal
          isOpen={Boolean(feedingVaultKey)}
          onClose={() => setFeedingVaultKey(null)}
          maxWidthClassName="max-w-md"
        >
          <div className="bg-obsidian-surface border border-lord-gold/40 rounded-3xl p-6 shadow-2xl relative text-right space-y-4">
            <button
              type="button"
              onClick={() => setFeedingVaultKey(null)}
              className="absolute top-4 left-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-lord-gold font-bold text-base">
              <ArrowDownLeft className="w-5 h-5" />
              <span>تغذية {selectedVaultData.name}</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              سيتم اقتطاع المبلغ المحدد من <strong>الميزانية العامة للشركة (${(vault?.generalBudget ?? 0).toLocaleString()} USDT)</strong> وإضافته مباشرة إلى رصيد هذا الصندوق لرفع جاهزية الصرف.
            </p>

            <form onSubmit={handleFeedSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  المبلغ المطلوب إضافته (USDT):
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={feedAmount}
                  onChange={(e) => setFeedAmount(Number(e.target.value))}
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono text-base focus:border-lord-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  البيان والسبب المحاسبي:
                </label>
                <input
                  type="text"
                  required
                  value={feedReason}
                  onChange={(e) => setFeedReason(e.target.value)}
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-lord-gold focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFeedingVaultKey(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  disabled={isAdjusting}
                  className="flex items-center gap-1.5 font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAdjusting ? 'جاري التحويل...' : 'تأكيد التغذية والخصم ⚡'}</span>
                </Button>
              </div>
            </form>
          </div>
        </AppModalPortal>
      )}
    </div>
  );
};
