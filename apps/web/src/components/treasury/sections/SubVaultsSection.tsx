'use client';

import React, { useState } from 'react';
import { useGetVaultQuery } from '../../../store/api/financeApi';
import {
  Wallet,
  TrendingDown,
  ShieldCheck,
  Plus,
  ArrowLeftRight,
  BarChart3,
  Layers,
  Sparkles,
  AlertTriangle,
  FolderKanban
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { CreateSubVaultModal } from '../modals/CreateSubVaultModal';
import { TransferToSubVaultModal } from '../modals/TransferToSubVaultModal';
import { AccountingReportsModal } from './AccountingReportsModal';

export const SubVaultsSection: React.FC = () => {
  const { data: vaultRes, refetch } = useGetVaultQuery();
  const vault = vaultRes?.data;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  // Predefined sub-vaults (Real operational values without static/fake fallbacks)
  const defaultVaults = [
    {
      key: 'salaries',
      name: 'صندوق الرواتب والأجور',
      code: 'SALARIES_VAULT',
      balance: vault?.segmentedVaults?.salaries?.balance ?? 0,
      monthlyAllocated: vault?.segmentedVaults?.salaries?.monthlyAllocated ?? 0,
      totalSpent: vault?.segmentedVaults?.salaries?.totalSpent ?? 0,
      alertThreshold: 20,
      icon: Wallet,
      colorTheme: 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-obsidian-surface to-obsidian-card',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    },
    {
      key: 'marketing',
      name: 'صندوق التسويق والإعلانات',
      code: 'MARKETING_VAULT',
      balance: vault?.segmentedVaults?.marketing?.balance ?? 0,
      monthlyAllocated: vault?.segmentedVaults?.marketing?.monthlyAllocated ?? 0,
      totalSpent: vault?.segmentedVaults?.marketing?.totalSpent ?? 0,
      alertThreshold: 25,
      icon: TrendingDown,
      colorTheme: 'border-cyber-blue/40 bg-gradient-to-br from-cyber-blue/10 via-obsidian-surface to-obsidian-card',
      badgeColor: 'text-cyber-blue bg-cyber-blue/10 border-cyber-blue/30'
    },
    {
      key: 'operationalReserve',
      name: 'صندوق الاحتياطي التقني والتشغيلي',
      code: 'RESERVE_VAULT',
      balance: vault?.segmentedVaults?.operationalReserve?.balance ?? 0,
      monthlyAllocated: vault?.segmentedVaults?.operationalReserve?.monthlyAllocated ?? 0,
      totalSpent: vault?.segmentedVaults?.operationalReserve?.totalSpent ?? 0,
      alertThreshold: 15,
      icon: ShieldCheck,
      colorTheme: 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-obsidian-surface to-obsidian-card',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    }
  ];

  const customSubVaults = vault?.customSubVaults || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-obsidian-card border border-gray-800 rounded-3xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-lord-gold" />
            <h3 className="text-lg font-black text-white">هندسة الصناديق الهرمية والمستقلة</h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            صندوق الصرف الرئيسي هو الأب: أي عملية صرف تنقل المبلغ آلياً للصندوق الفرعي وتوثق القيد
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="surface"
            size="sm"
            onClick={() => setIsReportsModalOpen(true)}
            className="flex items-center gap-1.5 border border-cyber-blue/40 text-cyber-blue hover:bg-cyber-blue/10 text-xs font-bold rounded-2xl"
          >
            <BarChart3 className="w-4 h-4 ml-1" />
            <span>التقارير المحاسبية 📊</span>
          </Button>

          <Button
            variant="surface"
            size="sm"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 border border-lord-gold/40 text-lord-gold hover:bg-lord-gold/10 text-xs font-bold rounded-2xl"
          >
            <ArrowLeftRight className="w-4 h-4 ml-1" />
            <span>نقل وتخصيص سيولة</span>
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold rounded-2xl"
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>إنشاء صندوق فرعي</span>
          </Button>
        </div>
      </div>

      {/* Grid of Sub-Vaults (Predefined + Custom) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Render Predefined Sub-Vaults */}
        {defaultVaults.map((sub) => {
          const Icon = sub.icon;
          const percentRemaining =
            sub.monthlyAllocated > 0
              ? Math.max(0, Math.min(100, Math.round((sub.balance / sub.monthlyAllocated) * 100)))
              : 100;
          const isCritical = percentRemaining <= sub.alertThreshold;

          return (
            <div
              key={sub.key}
              className={`border-2 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden transition-all hover:scale-[1.01] ${sub.colorTheme}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-black/40 border border-gray-700 flex items-center justify-center text-white">
                    <Icon className="w-5 h-5 text-lord-gold" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{sub.name}</h4>
                    <span className="text-[10px] text-gray-400 font-mono block">الأب: صندوق الصرف الرئيسي</span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sub.badgeColor}`}>
                  {sub.code}
                </span>
              </div>

              {/* Balance */}
              <div className="pt-2">
                <span className="text-[11px] text-gray-400 block font-bold">الرصيد المتاح للصرف</span>
                <div className="text-2xl font-black text-white font-mono mt-0.5">
                  ${sub.balance.toLocaleString()} <span className="text-xs text-lord-gold">USDT</span>
                </div>
              </div>

              {/* Progress & Allocation */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>المخصص الشهري: ${sub.monthlyAllocated.toLocaleString()}</span>
                  <span>{percentRemaining}% متبقي</span>
                </div>
                <div className="w-full bg-gray-800/80 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical ? 'bg-red-500' : 'bg-lord-gold'
                    }`}
                    style={{ width: `${percentRemaining}%` }}
                  />
                </div>
              </div>

              {/* Footer Metrics */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-800/80 text-[11px]">
                <span className="text-gray-400">
                  المصروف الفعلي: <span className="text-white font-mono">${sub.totalSpent.toLocaleString()}</span>
                </span>
                {isCritical ? (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>إنذار سيولة</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">✓ سيولة آمنة</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Render Custom Sub-Vaults */}
        {customSubVaults.map((sub: any, idx: number) => {
          const percentRemaining =
            sub.monthlyAllocated > 0
              ? Math.max(0, Math.min(100, Math.round((sub.balance / sub.monthlyAllocated) * 100)))
              : 100;
          const isCritical = percentRemaining <= (sub.alertThresholdPercent || 20);

          return (
            <div
              key={sub.code || idx}
              className="border-2 border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-obsidian-surface to-obsidian-card rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden transition-all hover:scale-[1.01]"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-black/40 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{sub.name}</h4>
                    <span className="text-[10px] text-gray-400 font-mono block">الأب: {sub.parentVault}</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400">
                  {sub.code}
                </span>
              </div>

              {/* Balance */}
              <div className="pt-2">
                <span className="text-[11px] text-gray-400 block font-bold">الرصيد المتاح للصرف</span>
                <div className="text-2xl font-black text-white font-mono mt-0.5">
                  ${(sub.balance ?? 0).toLocaleString()} <span className="text-xs text-purple-300">USDT</span>
                </div>
              </div>

              {/* Progress & Allocation */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>المخصص الشهري: ${(sub.monthlyAllocated ?? 0).toLocaleString()}</span>
                  <span>{percentRemaining}% متبقي</span>
                </div>
                <div className="w-full bg-gray-800/80 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical ? 'bg-red-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${percentRemaining}%` }}
                  />
                </div>
              </div>

              {/* Footer Metrics */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-800/80 text-[11px]">
                <span className="text-gray-400">
                  المصروف: <span className="text-white font-mono">${(sub.totalSpent ?? 0).toLocaleString()}</span>
                </span>
                {isCritical ? (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>إنذار سيولة</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">✓ صندوق مخصص</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <CreateSubVaultModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => refetch()}
      />

      <TransferToSubVaultModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => refetch()}
      />

      <AccountingReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
      />
    </div>
  );
};

