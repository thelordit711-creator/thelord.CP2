'use client';

import React from 'react';
import { useGetVaultQuery } from '../../store/api/financeApi';
import { Coins, TrendingDown, ShieldCheck, AlertTriangle, Layers, Wallet, Sparkles } from 'lucide-react';

export const SegmentedVaultsOverview: React.FC = () => {
  const { data: vaultRes, isLoading } = useGetVaultQuery();
  const vault = vaultRes?.data;

  const defaultVaults = {
    salaries: {
      name: 'صندوق الرواتب والأجور',
      balance: vault?.segmentedVaults?.salaries?.balance ?? 15000,
      monthlyAllocated: vault?.segmentedVaults?.salaries?.monthlyAllocated ?? 20000,
      totalSpent: vault?.segmentedVaults?.salaries?.totalSpent ?? 5000,
      alertThresholdPercent: 20
    },
    marketing: {
      name: 'صندوق التسويق والإعلانات',
      balance: vault?.segmentedVaults?.marketing?.balance ?? 8000,
      monthlyAllocated: vault?.segmentedVaults?.marketing?.monthlyAllocated ?? 10000,
      totalSpent: vault?.segmentedVaults?.marketing?.totalSpent ?? 2000,
      alertThresholdPercent: 25
    },
    operationalReserve: {
      name: 'صندوق الاحتياطي التقني والتشغيلي',
      balance: vault?.segmentedVaults?.operationalReserve?.balance ?? 12000,
      monthlyAllocated: vault?.segmentedVaults?.operationalReserve?.monthlyAllocated ?? 15000,
      totalSpent: vault?.segmentedVaults?.operationalReserve?.totalSpent ?? 3000,
      alertThresholdPercent: 15
    }
  };

  const vaults = [
    {
      key: 'salaries',
      data: defaultVaults.salaries,
      icon: Wallet,
      colorTheme: 'from-amber-500/20 via-obsidian-surface to-obsidian-card',
      borderColor: 'border-amber-500/40',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    },
    {
      key: 'marketing',
      data: defaultVaults.marketing,
      icon: TrendingDown,
      colorTheme: 'from-cyber-blue/20 via-obsidian-surface to-obsidian-card',
      borderColor: 'border-cyber-blue/40',
      badgeColor: 'text-cyber-blue bg-cyber-blue/10 border-cyber-blue/30'
    },
    {
      key: 'operationalReserve',
      data: defaultVaults.operationalReserve,
      icon: ShieldCheck,
      colorTheme: 'from-emerald-500/20 via-obsidian-surface to-obsidian-card',
      borderColor: 'border-emerald-500/40',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    }
  ];

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
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
              className={`p-5 rounded-3xl bg-gradient-to-br ${colorTheme} border ${borderColor} shadow-xl relative overflow-hidden space-y-4`}
            >
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
              <div className="space-y-1.5">
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

              {/* Footer status */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-800/80 text-[10px] text-gray-400">
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

