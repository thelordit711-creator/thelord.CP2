'use client';

import React, { useState } from 'react';
import {
  useGetTreasuryOrdersQuery,
  useStartPayoutProcessingMutation,
  useConfirmPayoutDisbursedMutation
} from '../../../../store/api/treasuryApi';
import { useGetVaultQuery } from '../../../../store/api/financeApi';
import { IsolatedPayoutCard } from '../../../../components/treasury/IsolatedPayoutCard';
import { SubVaultsSection } from '../../../../components/treasury/sections/SubVaultsSection';
import { EmployeeLedgerSection } from '../../../../components/treasury/sections/EmployeeLedgerSection';
import { RecurringExpensesSection } from '../../../../components/treasury/sections/RecurringExpensesSection';
import {
  Coins,
  Layers,
  Users,
  CalendarClock,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Sparkles,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

type AccountingTab = 'VAULTS_AND_PAYOUTS' | 'EMPLOYEES_LEDGER' | 'RECURRING_EXPENSES';

export default function PayoutDeskPage() {
  const [activeTab, setActiveTab] = useState<AccountingTab>('VAULTS_AND_PAYOUTS');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const { data: vaultRes, refetch: refetchVault } = useGetVaultQuery();
  const { data: response, isLoading, refetch: refetchOrders } = useGetTreasuryOrdersQuery({
    status: filterStatus === 'ALL' ? undefined : filterStatus
  });

  const [startProcessing] = useStartPayoutProcessingMutation();
  const [confirmDisbursed] = useConfirmPayoutDisbursedMutation();

  const vault = vaultRes?.data;
  const orders = response?.data || [];

  const handleRefresh = () => {
    refetchVault();
    refetchOrders();
    toast.info('تم تحديث بيانات النظام المحاسبي');
  };

  const handleStartProcessing = async (orderId: string) => {
    try {
      await startProcessing(orderId).unwrap();
      toast.info('تم بدء المعالجة وإشعار المستفيد بنجاح');
      refetchOrders();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل في تحديث حالة المعالجة');
    }
  };

  const handleConfirmDisbursed = async (orderId: string, proofData: { txHashOrReferenceNumber: string; receiptScreenshot?: any }) => {
    try {
      await confirmDisbursed({ id: orderId, data: proofData }).unwrap();
      toast.success('تم تأكيد الصرف وخصم المبلغ من أرصدة الشركة تلقائياً!');
      refetchOrders();
      refetchVault();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل في اعتماد الصرف');
    }
  };

  const pendingOrdersCount = orders.filter((o) => o.executionStatus === 'WAITING_TREASURY').length;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 text-right">
      {/* 1. Header & Live Liquidity Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-obsidian-card border border-lord-gold/30 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <span className="text-xs font-bold text-lord-gold tracking-widest uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-lord-gold" />
            <span>THE LORD ACCOUNTING & TREASURY SUITE</span>
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-1">
            النظام المحاسبي والصندوق المركزي
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            إدارة الصناديق الهرمية، كشوفات رواتب الموظفين، والمصروفات الشهرية المؤتمتة بدقة رقابية صارمة.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="p-3 rounded-2xl bg-obsidian-surface border border-gray-800 text-gray-300 hover:text-lord-gold hover:border-lord-gold/40 transition-all self-start md:self-auto flex items-center gap-2 text-xs font-bold"
          title="تحديث البيانات اللحظية"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث الحسابات</span>
        </button>
      </div>

      {/* 2. Top Accounting KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3.5 sm:p-4">
          <span className="text-[11px] text-gray-400 font-bold block">رصيد صندوق الصرف المتاح</span>
          <div className="text-lg sm:text-xl font-black text-lord-gold font-mono mt-0.5">
            ${(vault?.treasuryBalance ?? 0).toLocaleString()} <span className="text-xs font-normal">USDT</span>
          </div>
        </div>

        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3.5 sm:p-4">
          <span className="text-[11px] text-gray-400 font-bold block">الميزانية العامة للأصل الأساسي</span>
          <div className="text-lg sm:text-xl font-black text-cyber-blue font-mono mt-0.5">
            ${(vault?.generalBudget ?? 0).toLocaleString()} <span className="text-xs font-normal">USDT</span>
          </div>
        </div>

        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3.5 sm:p-4">
          <span className="text-[11px] text-gray-400 font-bold block">أوامر الصرف الجديدة</span>
          <div className="text-lg sm:text-xl font-black font-mono mt-0.5">
            {pendingOrdersCount > 0 ? (
              <span className="text-amber-400 animate-pulse">{pendingOrdersCount} أمر بانتظار الصرف</span>
            ) : (
              <span className="text-emerald-400">0 معلقة</span>
            )}
          </div>
        </div>

        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3.5 sm:p-4">
          <span className="text-[11px] text-gray-400 font-bold block">حالة الحوكمة والرقابة</span>
          <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">مقفلة بطلب للمسؤول</span>
          </div>
        </div>
      </div>

      {/* 3. The 3 Primary Accounting Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('VAULTS_AND_PAYOUTS')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all shrink-0 ${
            activeTab === 'VAULTS_AND_PAYOUTS'
              ? 'bg-lord-gold text-black shadow-lg shadow-lord-gold/20'
              : 'bg-obsidian-card text-gray-400 hover:text-white hover:bg-obsidian-surface border border-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>شجرة الصناديق وحركات الصرف</span>
          {pendingOrdersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-mono font-bold">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EMPLOYEES_LEDGER')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all shrink-0 ${
            activeTab === 'EMPLOYEES_LEDGER'
              ? 'bg-lord-gold text-black shadow-lg shadow-lord-gold/20'
              : 'bg-obsidian-card text-gray-400 hover:text-white hover:bg-obsidian-surface border border-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>حسابات الموظفين وسجل الرواتب</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECURRING_EXPENSES')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all shrink-0 ${
            activeTab === 'RECURRING_EXPENSES'
              ? 'bg-lord-gold text-black shadow-lg shadow-lord-gold/20'
              : 'bg-obsidian-card text-gray-400 hover:text-white hover:bg-obsidian-surface border border-gray-800'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>المصروفات الشهرية المؤتمتة</span>
        </button>
      </div>

      {/* 4. Tab 1 Content: Vaults & Orders */}
      {activeTab === 'VAULTS_AND_PAYOUTS' && (
        <div className="space-y-8">
          {/* Sub-Vaults Hierarchical Tree */}
          <SubVaultsSection />

          {/* Orders Section */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-lord-gold" />
                  <span>أوامر الصرف المعتمدة (Payout Orders)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  الحوالات المعتمدة من الإدارة للصرف عبر BEP20 USDT أو محافظ جيب وجوالي
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-2 p-1.5 bg-obsidian-surface rounded-2xl border border-obsidian-border text-xs">
                {[
                  { id: 'ALL', label: 'الكل' },
                  { id: 'WAITING_TREASURY', label: 'جديد (بانتظار الصرف)' },
                  { id: 'IN_PROGRESS', label: 'قيد التنفيذ' },
                  { id: 'DISBURSED', label: 'تم الصرف' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      filterStatus === tab.id
                        ? 'bg-lord-gold text-black shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Grid */}
            {isLoading ? (
              <div className="p-12 text-center text-xs text-gray-400 font-mono">جاري تحميل الأوامر...</div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 border border-gray-800 rounded-3xl bg-obsidian-card">
                لا توجد أوامر صرف تطابق الفلتر المحدد حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {orders.map((order) => (
                  <IsolatedPayoutCard
                    key={order._id}
                    order={order}
                    onStartProcessing={handleStartProcessing}
                    onConfirmDisbursed={handleConfirmDisbursed}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2 Content: Employee Ledger */}
      {activeTab === 'EMPLOYEES_LEDGER' && <EmployeeLedgerSection />}

      {/* 6. Tab 3 Content: Recurring Monthly Expenses */}
      {activeTab === 'RECURRING_EXPENSES' && <RecurringExpensesSection />}
    </div>
  );
}
