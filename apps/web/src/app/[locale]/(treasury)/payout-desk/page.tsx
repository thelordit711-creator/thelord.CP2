'use client';

import React, { useState, useEffect } from 'react';
import {
  useGetTreasuryOrdersQuery,
  useStartPayoutProcessingMutation,
  useConfirmPayoutDisbursedMutation
} from '../../../../store/api/treasuryApi';
import { useGetVaultQuery } from '../../../../store/api/financeApi';
import { useGetMeQuery } from '../../../../store/api/usersApi';
import { IsolatedPayoutCard } from '../../../../components/treasury/IsolatedPayoutCard';
import { SubVaultsSection } from '../../../../components/treasury/sections/SubVaultsSection';
import { EmployeeLedgerSection } from '../../../../components/treasury/sections/EmployeeLedgerSection';
import { RecurringExpensesSection } from '../../../../components/treasury/sections/RecurringExpensesSection';
import { MasterLedgerSection } from '../../../../components/treasury/sections/MasterLedgerSection';
import { AppModalPortal } from '../../../../components/ui/AppModalPortal';
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
  Filter,
  Eye,
  EyeOff,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Server
} from 'lucide-react';
import { toast } from 'sonner';

export default function PayoutDeskPage() {
  const { data: meRes } = useGetMeQuery();
  const currentUser = meRes?.data;
  const userRole = currentUser?.accessRole || 'TREASURY';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Topic Modals
  const [isVaultsModalOpen, setIsVaultsModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isEmployeesModalOpen, setIsEmployeesModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isMasterLedgerModalOpen, setIsMasterLedgerModalOpen] = useState(false);

  // Privacy Masking for Financial Figures
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);

  // Orders Filter inside Modal
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const { data: vaultRes, refetch: refetchVault } = useGetVaultQuery();
  const { data: response, isLoading: isLoadingOrders, refetch: refetchOrders } = useGetTreasuryOrdersQuery({
    status: filterStatus === 'ALL' ? undefined : filterStatus
  });

  const [startProcessing] = useStartPayoutProcessingMutation();
  const [confirmDisbursed] = useConfirmPayoutDisbursedMutation();

  const vault = vaultRes?.data;
  const orders = response?.data || [];

  const handleRefresh = () => {
    refetchVault();
    refetchOrders();
    toast.info('تم تحديث الحسابات اللحظية');
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
  const inProgressOrdersCount = orders.filter((o) => o.executionStatus === 'IN_PROGRESS').length;
  const disbursedOrdersCount = orders.filter((o) => o.executionStatus === 'DISBURSED').length;

  const realSpentTotal =
    (vault?.totalSpentByCategory?.salaries ?? 0) +
    (vault?.totalSpentByCategory?.bonuses ?? 0) +
    (vault?.totalSpentByCategory?.advances ?? 0) +
    (vault?.totalSpentByCategory?.telegramOfficialAds ?? 0) +
    (vault?.totalSpentByCategory?.telegramChannelPromos ?? 0) +
    (vault?.totalSpentByCategory?.softwareSubscriptions ?? 0) +
    (vault?.totalSpentByCategory?.otherExpenses ?? 0);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 text-right">
      {/* 1. Header & Live Liquidity Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-obsidian-card border border-lord-gold/30 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <span className="text-xs font-bold text-lord-gold tracking-widest uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-lord-gold" />
            <span>THE LORD ACCOUNTING & TREASURY HUB</span>
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-1">
            النظام المحاسبي والصندوق المركزي
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            نظام مبسط: انقر على أي صندوق لفتح نافذة التفاصيل والتحكم بالعمليات الحقيقية.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
            className="p-2.5 rounded-2xl bg-obsidian-surface border border-gray-800 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
            title={isPrivacyMasked ? 'كشف الأرقام' : 'حجب الأرقام'}
          >
            {isPrivacyMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-red-400" />}
            <span>{isPrivacyMasked ? 'كشف الأرقام' : 'حجب الأرقام'}</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2.5 rounded-2xl bg-obsidian-surface border border-gray-800 text-gray-300 hover:text-lord-gold hover:border-lord-gold/40 transition-all flex items-center gap-1.5 text-xs font-bold"
            title="تحديث البيانات اللحظية"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحديث الحسابات</span>
          </button>
        </div>
      </div>

      {/* 2. Top Accounting KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">رصيد صندوق الصرف المتاح</span>
            <div className="text-base sm:text-lg font-black text-lord-gold font-mono mt-0.5">
              {isPrivacyMasked ? '••••••••' : `$${(vault?.treasuryBalance ?? 0).toLocaleString()} USDT`}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-lord-gold/10 text-lord-gold">
            <Coins className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">الميزانية العامة للأصل</span>
            <div className="text-base sm:text-lg font-black text-lord-gold font-mono mt-0.5">
              {isPrivacyMasked ? '••••••••' : `$${(vault?.generalBudget ?? 0).toLocaleString()} USDT`}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-lord-gold/10 text-lord-gold">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">أوامر الصرف الجديدة</span>
            <div className="text-base sm:text-lg font-black font-mono mt-0.5">
              {pendingOrdersCount > 0 ? (
                <span className="text-amber-400 animate-pulse">{pendingOrdersCount} بانتظار الصرف</span>
              ) : (
                <span className="text-emerald-400">0 معلقة</span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-lord-gold/10 text-lord-gold">
            <Coins className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">إجمالي المصروفات المنفذة</span>
            <div className="text-base sm:text-lg font-black text-lord-gold font-mono mt-0.5">
              {isPrivacyMasked ? '••••••••' : `$${realSpentTotal.toLocaleString()} USDT`}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-lord-gold/10 text-lord-gold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. The 4 or 5 Primary Topic Boxes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* BOX 1: شجرة الصناديق وحركات السيولة */}
        <div
          onClick={() => setIsVaultsModalOpen(true)}
          className="bg-gradient-to-br from-[#0a0d17] via-[#0d1222] to-[#0a0d17] border-2 border-lord-gold/40 hover:border-lord-gold rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.12)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold">
                صندوق الصرف هو الأب
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors">
                هندسة الصناديق الهرمية وأرصدة السيولة
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                صندوق الرواتب، التسويق، والاحتياطي التشغيلي + الصناديق المخصصة. إنشاء صناديق جديدة وتخصيص السيولة.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800/80">
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">صندوق الرواتب</span>
                <span className="text-xs font-black text-lord-gold font-mono">
                  {isPrivacyMasked ? '••••' : `$${(vault?.segmentedVaults?.salaries?.balance ?? 0).toLocaleString()}`}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">صندوق التسويق</span>
                <span className="text-xs font-black text-lord-gold font-mono">
                  {isPrivacyMasked ? '••••' : `$${(vault?.segmentedVaults?.marketing?.balance ?? 0).toLocaleString()}`}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">صندوق الاحتياطي</span>
                <span className="text-xs font-black text-lord-gold font-mono">
                  {isPrivacyMasked ? '••••' : `$${(vault?.segmentedVaults?.operationalReserve?.balance ?? 0).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-lord-gold pt-2 border-t border-gray-800/60 group-hover:translate-x-[-4px] transition-transform">
            <span>انقر لفتح نافذة الصناديق والتقارير المحاسبية</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* BOX 2: أوامر الصرف المعتمدة (Payout Desk) */}
        <div
          onClick={() => setIsOrdersModalOpen(true)}
          className="bg-gradient-to-br from-[#0a0d17] via-[#0d1222] to-[#0a0d17] border-2 border-lord-gold/40 hover:border-lord-gold rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.12)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                <Coins className="w-6 h-6" />
              </div>
              {pendingOrdersCount > 0 ? (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                  {pendingOrdersCount} أمر بانتظار التنفيذ
                </span>
              ) : (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  كافة الأوامر منفذة
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors">
                أوامر الصرف المعتمدة والتدقيق البصري
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                تنفيذ الحوالات عبر BEP20 USDT ومحافظ جيب وجوالي مع التدقيق البصري بالذكاء الاصطناعي (Gemini Vision OCR).
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800/80">
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">بانتظار الصرف</span>
                <span className="text-xs font-black text-amber-400 font-mono">{pendingOrdersCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">قيد التنفيذ</span>
                <span className="text-xs font-black text-lord-gold font-mono">{inProgressOrdersCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">تم الصرف</span>
                <span className="text-xs font-black text-emerald-400 font-mono">{disbursedOrdersCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-lord-gold pt-2 border-t border-gray-800/60 group-hover:translate-x-[-4px] transition-transform">
            <span>انقر لفتح طاولة الصرف وتنفيذ الحوالات</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* BOX 3: حسابات الموظفين وسجل الرواتب */}
        <div
          onClick={() => setIsEmployeesModalOpen(true)}
          className="bg-gradient-to-br from-[#0a0d17] via-[#0d1222] to-[#0a0d17] border-2 border-lord-gold/40 hover:border-lord-gold rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.12)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold">
                دفتر الأستاذ للكادر
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors">
                حسابات الموظفين وسجل الرواتب والمستحقات
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                كشوفات حسابات الموظفين، الرواتب الشهرية الأساسية، المكافآت، السلف، وبيانات محافظ الاستلام المعتمدة.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">الرواتب الملتزم بها</span>
                <span className="text-xs font-black text-lord-gold font-mono">
                  {isPrivacyMasked ? '••••' : `$${(vault?.segmentedVaults?.salaries?.monthlyAllocated ?? 0).toLocaleString()} USDT`}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">صلاحية التعديل</span>
                <span className="text-xs font-black text-lord-gold">
                  {isSuperAdmin ? 'متاحة للمدير العام' : 'صرف فقط (محمية)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-lord-gold pt-2 border-t border-gray-800/60 group-hover:translate-x-[-4px] transition-transform">
            <span>انقر لفتح كشوفات حسابات الكادر</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* BOX 4: المصروفات الشهرية المؤتمتة */}
        <div
          onClick={() => setIsRecurringModalOpen(true)}
          className="bg-gradient-to-br from-[#0a0d17] via-[#0d1222] to-[#0a0d17] border-2 border-lord-gold/40 hover:border-lord-gold rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.12)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                <CalendarClock className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold">
                جدولة وأتمتة شهرية
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors">
                المصروفات الشهرية والاشتراكات المؤتمتة
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                اشتراكات السيرفرات، الإنترنت، البرمجيات، ومسير الرواتب الموحد. صرف آلي أو تأكيد فوري بنقرة واحدة.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">دورية التنفيذ</span>
                <span className="text-xs font-black text-gray-300 font-mono">يوم 1 من كل شهر</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">نمط الأمان</span>
                <span className="text-xs font-black text-emerald-400">تدقيق وتوثيق قيد فوري</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-lord-gold pt-2 border-t border-gray-800/60 group-hover:translate-x-[-4px] transition-transform">
            <span>انقر لفتح جدول المصروفات المؤتمتة</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* BOX 5: دفتر الأستاذ العام والعمليات الشاملة (للمسؤول فقط) */}
        {isSuperAdmin && (
          <div
            onClick={() => setIsMasterLedgerModalOpen(true)}
            className="md:col-span-2 bg-gradient-to-br from-[#0a0d17] via-[#1a140a] to-[#0a0d17] border-2 border-lord-gold hover:border-amber-400 rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.2)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-lord-gold/20 border border-lord-gold/50 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-lord-gold text-black">
                  صلاحية القائد الأعلى (المدير العام) 👑
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors flex items-center gap-2">
                  <span>دفتر الأستاذ والعمليات الشاملة (التعديل والحذف المتسلسل للأثر المالي)</span>
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed mt-1">
                  جدول شامل لكافة عمليات الصرف والإيداع للميزانية والصناديق مع فلترة متقدمة، وخاصية التعديل والحذف مع عكس الأثر المالي واسترجاع الأرصدة وتعديل المعاملات المرتبطة آلياً.
                </p>
              </div>

              {/* Quick Summary Strip */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-lord-gold/30">
                <div className="p-3 rounded-2xl bg-black/60 border border-lord-gold/30">
                  <span className="text-[10px] text-gray-400 block font-bold">الحذف المتسلسل</span>
                  <span className="text-xs font-black text-red-400">يعكس الرصيد ويلغي القيد</span>
                </div>
                <div className="p-3 rounded-2xl bg-black/60 border border-lord-gold/30">
                  <span className="text-[10px] text-gray-400 block font-bold">التعديل المتسلسل</span>
                  <span className="text-xs font-black text-amber-400">يضبط فروقات الخزينة</span>
                </div>
                <div className="p-3 rounded-2xl bg-black/60 border border-lord-gold/30">
                  <span className="text-[10px] text-gray-400 block font-bold">التدقيق الرقابي</span>
                  <span className="text-xs font-black text-emerald-400">توثيق كامل مشفر</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-black text-lord-gold pt-2 border-t border-lord-gold/30 group-hover:translate-x-[-4px] transition-transform">
              <span>انقر لفتح دفتر الأستاذ الشامل وإدارة العمليات المتقدمة</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: نافذة هندسة الصناديق وحركات السيولة */}
      {/* ======================================================== */}
      <AppModalPortal isOpen={isVaultsModalOpen} onClose={() => setIsVaultsModalOpen(false)} maxWidthClassName="max-w-6xl">
        <div className="bg-[#090c15] border-2 border-lord-gold/60 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-lord-gold/20 border border-lord-gold/50 flex items-center justify-center text-lord-gold">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">هندسة الصناديق الهرمية وأرصدة السيولة الحقيقية</h3>
                <p className="text-xs text-gray-400">الصناديق المستقلة، التخصيص المحاسبي، وتقارير كل فئة</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsVaultsModalOpen(false)}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <SubVaultsSection />

          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setIsVaultsModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </AppModalPortal>

      {/* ======================================================== */}
      {/* MODAL 2: نافذة أوامر الصرف المعتمدة */}
      {/* ======================================================== */}
      <AppModalPortal isOpen={isOrdersModalOpen} onClose={() => setIsOrdersModalOpen(false)} maxWidthClassName="max-w-6xl">
        <div className="bg-[#090c15] border-2 border-lord-gold/30 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">طاولة أوامر الصرف المعتمدة (Payout Orders Desk)</h3>
                <p className="text-xs text-gray-400">تنفيذ الحوالات مع التدقيق البصري الذكي ومطابقة الإيصالات</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOrdersModalOpen(false)}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 p-1.5 bg-obsidian-surface rounded-2xl border border-obsidian-border text-xs w-fit">
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
                    ? 'bg-lord-gold text-black shadow-gold-glow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders Grid */}
          {isLoadingOrders ? (
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

          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setIsOrdersModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </AppModalPortal>

      {/* ======================================================== */}
      {/* MODAL 3: نافذة حسابات الموظفين وسجل الرواتب */}
      {/* ======================================================== */}
      <AppModalPortal isOpen={isEmployeesModalOpen} onClose={() => setIsEmployeesModalOpen(false)} maxWidthClassName="max-w-6xl">
        <div className="bg-[#090c15] border-2 border-lord-gold/30 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">حسابات الموظفين وسجل المستحقات والرواتب</h3>
                <p className="text-xs text-gray-400">
                  كشوفات الحساب، الرواتب المعتمدة، المكافآت والسلفيات (صلاحية تعديل الراتب للمسؤول فقط)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEmployeesModalOpen(false)}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <EmployeeLedgerSection />

          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setIsEmployeesModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </AppModalPortal>

      {/* ======================================================== */}
      {/* MODAL 4: نافذة المصروفات والاشتراكات الشهرية المؤتمتة */}
      {/* ======================================================== */}
      <AppModalPortal isOpen={isRecurringModalOpen} onClose={() => setIsRecurringModalOpen(false)} maxWidthClassName="max-w-6xl">
        <div className="bg-[#090c15] border-2 border-lord-gold/30 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">المصروفات والاشتراكات الشهرية المؤتمتة</h3>
                <p className="text-xs text-gray-400">
                  إدارة ومتابعة الالتزامات الدورية (سيرفرات، إنترنت، برمجيات، مسير الرواتب)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(false)}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <RecurringExpensesSection />

          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </AppModalPortal>

      {/* ======================================================== */}
      {/* MODAL 5: نافذة دفتر الأستاذ الشامل والتعديل والحذف المتسلسل (خاص بالمسؤول) */}
      {/* ======================================================== */}
      {isSuperAdmin && (
        <AppModalPortal isOpen={isMasterLedgerModalOpen} onClose={() => setIsMasterLedgerModalOpen(false)} maxWidthClassName="max-w-7xl">
          <div className="bg-[#090c15] border-2 border-lord-gold rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-lord-gold/20 border border-lord-gold/50 flex items-center justify-center text-lord-gold">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>دفتر الأستاذ العام والعمليات الشاملة</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-lord-gold text-black">
                      صلاحية الحذف والتعديل المتسلسل للمدير العام
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    كافة عمليات الصرف والإيداع مع التعديل والحذف المتسلسل للأثر المالي على أرصدة الصناديق
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMasterLedgerModalOpen(false)}
                className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MasterLedgerSection />

            <div className="flex justify-end pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsMasterLedgerModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </AppModalPortal>
      )}
    </div>
  );
}
