'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  useGetVaultQuery,
  useAdjustVaultMutation,
  useGetFinancialRequestsQuery,
  useDecideFinancialRequestMutation
} from '../../../../store/api/financeApi';
import { Button } from '../../../../components/ui/Button';
import {
  UserPlus,
  ArrowLeftRight,
  Wallet,
  Coins,
  Radio,
  FileCheck,
  ShieldCheck,
  ArrowUpRight,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  TrendingUp,
  Activity,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { useSocket } from '../../../../providers/SocketProvider';
import { lordToast } from '../../../../lib/lordToast';
import { AppModalPortal } from '../../../../components/ui/AppModalPortal';

// Modular Subcomponents
import { FinancialMetricsGrid } from '../../../../components/dashboard/FinancialMetricsGrid';
import { LiveStaffStatusMonitor, StaffStatusItem } from '../../../../components/dashboard/LiveStaffStatusMonitor';
import { PendingFinancialRequests } from '../../../../components/dashboard/PendingFinancialRequests';
import { AuditLogsViewer } from '../../../../components/admin/AuditLogsViewer';
import { InviteStaffModal } from '../../../../components/dashboard/modals/InviteStaffModal';
import { VaultLiquidityModal } from '../../../../components/dashboard/modals/VaultLiquidityModal';

export default function AdminDashboardPage() {
  const { data: vaultRes, refetch: refetchVault } = useGetVaultQuery();
  const { data: requestsRes, refetch: refetchRequests } = useGetFinancialRequestsQuery();
  const { socket } = useSocket();

  const [adjustVault, { isLoading: isAdjusting }] = useAdjustVaultMutation();
  const [decideRequest, { isLoading: isDeciding }] = useDecideFinancialRequestMutation();

  // Modals for the 4 core topics
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Vault Liquidity & Governance modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'FUND_TREASURY' | 'DEPOSIT_BUDGET' | 'RETURN_BUDGET'>('FUND_TREASURY');
  const [adjustAmount, setAdjustAmount] = useState<number>(1000);
  const [adjustReason, setAdjustReason] = useState<string>('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');
  const [targetSegment, setTargetSegment] = useState<'salaries' | 'marketing' | 'operationalReserve' | undefined>(undefined);

  // Staff Monitoring State
  const [staffList, setStaffList] = useState<StaffStatusItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Global Quick Privacy Masking on the Cards
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(true);

  const vault = vaultRes?.data;
  const requests = requestsRes?.data || [];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  // Fetch staff statuses
  const fetchStaffStatuses = useCallback(async () => {
    try {
      const { apiFetch } = await import('../../../../lib/apiClient');
      const res = await apiFetch('/auth/staff-statuses');
      const data = await res.json();
      if (data.success && data.data) {
        setStaffList(data.data);
      }
    } catch (e) {
      console.error('Failed to load staff statuses', e);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffStatuses();

    // Listen to real-time status updates via Socket.io
    if (socket) {
      const handleVaultRefresh = () => {
        refetchVault();
        refetchRequests();
      };

      socket.on('vault:updated', handleVaultRefresh);
      socket.on('payout:new_order', handleVaultRefresh);
      socket.on('payout:disbursed', handleVaultRefresh);
      socket.on('payout:processing', handleVaultRefresh);
      socket.on('stage:submitted', handleVaultRefresh);
      socket.on('task:created', handleVaultRefresh);
      socket.on('task:proposed', handleVaultRefresh);

      socket.on('STAFF_STATUS_CHANGED', (updatedStaff: any) => {
        setStaffList((prev) => {
          const index = prev.findIndex((s) => s._id === updatedStaff.userId || s.email === updatedStaff.email);
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = {
              ...copy[index],
              workStatus: updatedStaff.workStatus,
              workStatusUpdatedAt: updatedStaff.workStatusUpdatedAt,
              presenceStatus: updatedStaff.presenceStatus
            };
            return copy;
          } else {
            return [
              {
                _id: updatedStaff.userId,
                fullName: updatedStaff.fullName,
                email: updatedStaff.email,
                accessRole: updatedStaff.accessRole,
                workStatus: updatedStaff.workStatus,
                workStatusUpdatedAt: updatedStaff.workStatusUpdatedAt,
                presenceStatus: updatedStaff.presenceStatus
              },
              ...prev
            ];
          }
        });
        lordToast.gold(`تحديث حالة الموظف`, `${updatedStaff.fullName} -> ${updatedStaff.workStatus}`);
      });

      return () => {
        socket.off('vault:updated', handleVaultRefresh);
        socket.off('payout:new_order', handleVaultRefresh);
        socket.off('payout:disbursed', handleVaultRefresh);
        socket.off('payout:processing', handleVaultRefresh);
        socket.off('stage:submitted', handleVaultRefresh);
        socket.off('task:created', handleVaultRefresh);
        socket.off('task:proposed', handleVaultRefresh);
        socket.off('STAFF_STATUS_CHANGED');
      };
    }
  }, [socket, apiUrl, refetchVault, refetchRequests, fetchStaffStatuses]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(adjustAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      lordToast.error('خطأ في الإدخال', 'يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const currentGenBudget = vault?.generalBudget ?? 0;
    const currentTreasury = vault?.treasuryBalance ?? 0;

    if (activeTab === 'FUND_TREASURY' && amount > currentGenBudget) {
      lordToast.error(
        'رصيد غير كافٍ',
        `المبلغ المطلوب (${amount.toLocaleString()} USDT) يتجاوز رصيد الميزانية العامة المتاحة (${currentGenBudget.toLocaleString()} USDT)! يرجى إيداع رصيد أولاً.`
      );
      return;
    }

    if (activeTab === 'RETURN_BUDGET' && amount > currentTreasury) {
      lordToast.error(
        'رصيد غير كافٍ',
        `المبلغ المطلوب (${amount.toLocaleString()} USDT) يتجاوز رصيد الصندوق المتاح (${currentTreasury.toLocaleString()} USDT)!`
      );
      return;
    }

    try {
      let actionType: 'DEPOSIT_GENERAL_BUDGET' | 'FUND_TREASURY' | 'RETURN_TO_BUDGET' = 'FUND_TREASURY';
      if (activeTab === 'DEPOSIT_BUDGET') actionType = 'DEPOSIT_GENERAL_BUDGET';
      else if (activeTab === 'RETURN_BUDGET') actionType = 'RETURN_TO_BUDGET';

      await adjustVault({
        actionType,
        targetSegment: activeTab === 'FUND_TREASURY' ? targetSegment : undefined,
        amount,
        reason: adjustReason.trim() || 'إدارة سيولة الخزينة'
      }).unwrap();

      lordToast.financial(amount, 'USDT');
      setIsAdjustModalOpen(false);
      refetchVault();
    } catch (err: any) {
      lordToast.error('فشل العملية', err?.data?.error || 'فشل في تنفيذ العملية');
    }
  };

  const handleDecision = async (
    requestId: string,
    decision: 'APPROVE' | 'REJECT' | 'NOTE',
    targetVaultSegment?: 'salaries' | 'marketing' | 'operationalReserve',
    customNotes?: string
  ) => {
    try {
      await decideRequest({
        id: requestId,
        data: {
          decision,
          targetVaultSegment,
          adminNotes: customNotes || (decision === 'APPROVE' ? 'معتمد للصرف عبر الصندوق' : 'تمت المراجعة من المسؤول')
        }
      }).unwrap();

      if (decision === 'APPROVE') {
        const segNames: Record<string, string> = {
          salaries: 'صندوق الرواتب والأجور',
          marketing: 'صندوق التسويق والإعلانات',
          operationalReserve: 'صندوق الاحتياطي التشغيلي'
        };
        const vaultLabel = targetVaultSegment ? ` (${segNames[targetVaultSegment] || targetVaultSegment})` : '';
        lordToast.success('تم اعتماد الميزانية', `تمت إحالة الطلب لشاشة الصندوق فوراً للصرف${vaultLabel}!`);
      } else {
        lordToast.gold('تحديث الطلب', 'تم تحديث حالة الطلب المالي بنجاح');
      }
      refetchRequests();
      refetchVault();
    } catch (err: any) {
      lordToast.error('خطأ', err?.data?.error || 'حدث خطأ أثناء اتخاذ القرار');
    }
  };

  // Quick stats calculations for topic boxes
  const onlineStaffCount = staffList.filter(s => s.workStatus === 'WORKING' || s.presenceStatus === 'ONLINE').length;
  const breakStaffCount = staffList.filter(s => s.workStatus === 'ON_BREAK').length;
  const totalStaffCount = staffList.length;

  const totalRequestedAmount = requests.reduce((sum: number, r: any) => sum + (r.financialRequirement?.amount || 0), 0);

  const totalVaultLiquidity = (vault?.generalBudget ?? 0) + (vault?.treasuryBalance ?? 0);
  const totalSpent =
    (vault?.totalSpentByCategory?.salaries ?? 0) +
    (vault?.totalSpentByCategory?.bonuses ?? 0) +
    (vault?.totalSpentByCategory?.advances ?? 0) +
    (vault?.totalSpentByCategory?.telegramOfficialAds ?? 0) +
    (vault?.totalSpentByCategory?.telegramChannelPromos ?? 0) +
    (vault?.totalSpentByCategory?.softwareSubscriptions ?? 0) +
    (vault?.totalSpentByCategory?.otherExpenses ?? 0);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 text-right">
      {/* 1. Executive Clean Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-obsidian-card border border-lord-gold/30 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <span className="text-xs font-bold text-lord-gold tracking-widest uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-lord-gold" />
            <span>THE LORD OF CRYPTO — EXECUTIVE HUB</span>
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-1">
            لوحة قيادة العمليات والخزينة المركزية
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            نظام مبسط وموحد: انقر على أي صندوق أدناه لفتح نافذة التفاصيل والتحكم المباشر.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <Button
            variant="gold"
            size="md"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 text-xs font-bold rounded-2xl"
          >
            <UserPlus className="w-4 h-4 ml-1" />
            <span>إرسال دعوة انضمام</span>
          </Button>

          <Button
            variant="surface"
            size="md"
            onClick={() => {
              setActiveTab('FUND_TREASURY');
              setAdjustAmount(1000);
              setAdjustReason('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');
              setIsAdjustModalOpen(true);
            }}
            className="flex items-center gap-2 border border-lord-gold/40 text-lord-gold hover:bg-lord-gold/10 text-xs font-bold rounded-2xl"
          >
            <ArrowLeftRight className="w-4 h-4 ml-1" />
            <span>إدارة السيولة وتغذية الصندوق</span>
          </Button>
        </div>
      </div>

      {/* 2. Quick Executive Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1 */}
        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-bold">إجمالي السيولة</div>
            <div className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
              {isPrivacyMasked ? '••••••••' : `$${totalVaultLiquidity.toLocaleString()} USDT`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
            className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-lord-gold transition-colors"
            title={isPrivacyMasked ? 'كشف الأرقام' : 'حجب الأرقام'}
          >
            {isPrivacyMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-red-400" />}
          </button>
        </div>

        {/* KPI 2 */}
        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-bold">الكادر المتصل اللحظي</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>{onlineStaffCount} متصل</span>
              <span className="text-xs text-gray-400 font-normal">من {totalStaffCount}</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Radio className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-bold">الطلبات المالية المعلقة</div>
            <div className="text-base sm:text-lg font-black font-mono mt-0.5">
              {requests.length > 0 ? (
                <span className="text-amber-400 animate-pulse">{requests.length} طلبات</span>
              ) : (
                <span className="text-gray-400">0 معلقة</span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <FileCheck className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-obsidian-surface border border-gray-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-bold">حالة التدقيق والرقابة</div>
            <div className="text-base sm:text-lg font-black text-lord-gold mt-0.5 flex items-center gap-1">
              <span>نشط ومؤمّن</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-lord-gold" />
            </div>
          </div>
          <div className="p-2 rounded-xl bg-lord-gold/10 text-lord-gold">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. The 4 Core Topic Boxes Grid - Unified Executive Obsidian & Imperial Gold */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* BOX 1: الخزينة والمؤشرات المالية */}
        <div
          onClick={() => setIsVaultModalOpen(true)}
          className="bg-[#0a0d16] hover:bg-[#0e1322] border border-lord-gold/30 hover:border-lord-gold/60 rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.1)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-lord-gold/10 border border-lord-gold/30 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-lord-gold/10 border border-lord-gold/25 text-lord-gold flex items-center gap-1">
                <span>3 صناديق فرعية معتمدة</span>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors flex items-center gap-2">
                <span>الخزينة والمؤشرات المالية المركزية</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                الميزانية العامة للأصل الأساسي، رصيد الصندوق المتاح للصرف، وإجمالي المصروفات وحوكمة دورة السيولة.
              </p>
            </div>

            {/* Quick Metrics Inside the Box */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800/80">
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">الميزانية العامة</span>
                <span className="text-xs font-black text-lord-gold font-mono">
                  {isPrivacyMasked ? '••••' : `$${(vault?.generalBudget ?? 0).toLocaleString()}`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">رصيد الصندوق</span>
                <span className="text-xs font-black text-white font-mono">
                  {isPrivacyMasked ? '••••' : `$${(vault?.treasuryBalance ?? 0).toLocaleString()}`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">المصروفات</span>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {isPrivacyMasked ? '••••' : `$${totalSpent.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-lord-gold pt-2 border-t border-gray-800/60 group-hover:translate-x-[-4px] transition-transform">
            <span>انقر لفتح نافذة الخزينة وإدارة السيولة</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* BOX 2: مراقبة الحضور والعمل اللحظي للكادر */}
        <div
          onClick={() => setIsStaffModalOpen(true)}
          className="bg-[#0a0d16] hover:bg-[#0e1322] border border-gray-800/80 hover:border-lord-gold/50 rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.08)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-lord-gold/10 border border-lord-gold/30 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                <Radio className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>رادار المراقبة اللحظية نشط</span>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors flex items-center gap-2">
                <span>مراقبة الحضور والعمل اللحظي للكادر</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                متابعة حية لحالات كافة الموظفين: تسجيل الدخول، قيد العمل، الاستراحة، وتسجيل الخروج مع توقيت النشاط.
              </p>
            </div>

            {/* Quick Metrics Inside the Box */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800/80">
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">قيد العمل ⚡</span>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {onlineStaffCount} موظف
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">في استراحة ☕</span>
                <span className="text-xs font-black text-amber-400/90 font-mono">
                  {breakStaffCount} موظف
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">إجمالي الكادر 👥</span>
                <span className="text-xs font-black text-white font-mono">
                  {totalStaffCount} عضو
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-lord-gold pt-2 border-t border-gray-800/60 group-hover:translate-x-[-4px] transition-transform">
            <span>انقر لفتح جدول الحضور والمراقبة الكاملة</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* BOX 3: الطلبات المالية بانتظار الاعتماد */}
        <div
          onClick={() => setIsRequestsModalOpen(true)}
          className="bg-[#0a0d16] hover:bg-[#0e1322] border border-gray-800/80 hover:border-lord-gold/50 rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.08)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-lord-gold/10 border border-lord-gold/30 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                <FileCheck className="w-6 h-6" />
              </div>
              <span
                className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                  requests.length > 0
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    : 'bg-gray-900 text-gray-400 border-gray-800'
                }`}
              >
                {requests.length > 0 ? `${requests.length} طلبات تنتظر قرارك ⚠️` : 'لا توجد طلبات معلقة ✅'}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors flex items-center gap-2">
                <span>الطلبات المالية واعتماد الميزانيات</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                طلبات ميزانيات المهام، الإعلانات، ومصاريف الكادر. يتطلب الاعتماد تحديد الصندوق المخصص للخصم.
              </p>
            </div>

            {/* Quick Metrics Inside the Box */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">الطلبات المعلقة</span>
                <span className="text-xs font-black text-amber-400 font-mono">
                  {requests.length} طلب بانتظار المراجعة
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">إجمالي المبالغ المطلوبة</span>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {totalRequestedAmount} USDT
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-lord-gold pt-2 border-t border-gray-800/60 group-hover:translate-x-[-4px] transition-transform">
            <span>انقر لمراجعة واعتماد الطلبات وتحديد الصندوق</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* BOX 4: سجل التدقيق الأمني والرقابة المحاسبية */}
        <div
          onClick={() => setIsAuditModalOpen(true)}
          className="bg-[#0a0d16] hover:bg-[#0e1322] border border-gray-800/80 hover:border-lord-gold/50 rounded-3xl p-6 shadow-xl hover:shadow-[0_10px_35px_rgba(212,175,55,0.08)] transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-lord-gold/10 border border-lord-gold/30 flex items-center justify-center text-lord-gold shadow-md group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-lord-gold" />
                <span>سجل غير قابل للتعديل 🔒</span>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white group-hover:text-lord-gold transition-colors flex items-center gap-2">
                <span>سجل التدقيق والأمان الرقابي المحاسبي</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                توثيق فوري لكافة عمليات الصرف المالي من الصناديق، التحويلات، تغييرات الصلاحيات، وإجراءات الأمان.
              </p>
            </div>

            {/* Quick Metrics Inside the Box */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">العمليات المراقبة</span>
                <span className="text-xs font-bold text-gray-200">
                  صرف مالي، حظر، وتعديل
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/70">
                <span className="text-[10px] text-gray-400 block font-bold">التوثيق الجنائي</span>
                <span className="text-xs font-bold text-lord-gold font-mono">
                  TxHash + رقم الحوالة
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-lord-gold pt-2 border-t border-gray-800/60 group-hover:translate-x-[-4px] transition-transform">
            <span>انقر لفتح سجل التدقيق الكامل والبحث</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: نافذة تفاصيل الخزينة والسيولة المركزية */}
      {/* ======================================================== */}
      <AppModalPortal isOpen={isVaultModalOpen} onClose={() => setIsVaultModalOpen(false)} maxWidthClassName="max-w-5xl">
        <div className="bg-[#090c15] border-2 border-lord-gold/60 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-lord-gold/20 border border-lord-gold/50 flex items-center justify-center text-lord-gold">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">تفاصيل الخزينة وحوكمة السيولة المركزية</h3>
                <p className="text-xs text-gray-400">إدارة الميزانية العامة ورصيد الصندوق وحركات التغذية المحاسبية</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsVaultModalOpen(false)}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complete Financial Metrics Grid */}
          <FinancialMetricsGrid
            vault={vault}
            onOpenFundTreasury={() => {
              setActiveTab('FUND_TREASURY');
              setAdjustAmount(1000);
              setAdjustReason('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');
              setIsAdjustModalOpen(true);
            }}
            onOpenDepositBudget={() => {
              setActiveTab('DEPOSIT_BUDGET');
              setAdjustAmount(5000);
              setAdjustReason('إيداع رأس مال / أرباح جديدة في الميزانية العامة');
              setIsAdjustModalOpen(true);
            }}
          />

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <Button
              variant="surface"
              size="sm"
              onClick={() => {
                setActiveTab('FUND_TREASURY');
                setIsAdjustModalOpen(true);
              }}
              className="text-xs font-bold text-lord-gold border border-lord-gold/30"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 ml-1.5" />
              <span>إدارة وتغذية الصناديق الفرعية</span>
            </Button>

            <button
              type="button"
              onClick={() => setIsVaultModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </AppModalPortal>

      {/* ======================================================== */}
      {/* MODAL 2: نافذة مراقبة الحضور والعمل اللحظي للكادر */}
      {/* ======================================================== */}
      <AppModalPortal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} maxWidthClassName="max-w-5xl">
        <div className="bg-[#090c15] border-2 border-cyber-blue/60 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyber-blue/20 border border-cyber-blue/50 flex items-center justify-center text-cyber-blue">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">مراقبة الحضور والعمل اللحظي للكادر (Live Monitor)</h3>
                <p className="text-xs text-gray-400">متابعة دقيقة وفورية لحالات دوام الموظفين وتحديثات السوكيت</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Staff Monitor Component */}
          <LiveStaffStatusMonitor
            staffList={staffList}
            loadingStaff={loadingStaff}
            onRefresh={fetchStaffStatuses}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
          />

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <Button
              variant="gold"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
              className="text-xs font-bold"
            >
              <UserPlus className="w-3.5 h-3.5 ml-1.5" />
              <span>إرسال دعوة انضمام لكادر جديد</span>
            </Button>

            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </AppModalPortal>

      {/* ======================================================== */}
      {/* MODAL 3: نافذة الطلبات المالية واعتماد الميزانيات */}
      {/* ======================================================== */}
      <AppModalPortal isOpen={isRequestsModalOpen} onClose={() => setIsRequestsModalOpen(false)} maxWidthClassName="max-w-4xl">
        <div className="bg-[#090c15] border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">الطلبات المالية بانتظار الاعتماد وتحديد الصندوق</h3>
                <p className="text-xs text-gray-400">راجع متطلبات المهام وحدد الصندوق المالي المخصص للصرف</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRequestsModalOpen(false)}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pending Financial Requests Component */}
          <PendingFinancialRequests
            requests={requests}
            vault={vault}
            isDeciding={isDeciding}
            onDecision={handleDecision}
          />

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setIsRequestsModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </AppModalPortal>

      {/* ======================================================== */}
      {/* MODAL 4: نافذة سجل التدقيق الأمني والرقابي الشامل */}
      {/* ======================================================== */}
      <AppModalPortal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} maxWidthClassName="max-w-6xl">
        <div className="bg-[#090c15] border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[92vh] overflow-y-auto scroll-touch">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">سجل التدقيق والأمان الرقابي المحاسبي الشامل</h3>
                <p className="text-xs text-gray-400">توثيق رقابي مشفر وغير قابل للتعديل لكافة حركات الصرف والإجراءات الإدارية</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAuditModalOpen(false)}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Full Audit Logs Viewer Component */}
          <AuditLogsViewer />

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setIsAuditModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </AppModalPortal>

      {/* ======================================================== */}
      {/* Sub-modals for liquidity actions and staff invitations */}
      {/* ======================================================== */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        apiUrl={apiUrl}
      />

      <VaultLiquidityModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        vault={vault}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adjustAmount={adjustAmount}
        setAdjustAmount={setAdjustAmount}
        adjustReason={adjustReason}
        setAdjustReason={setAdjustReason}
        targetSegment={targetSegment}
        setTargetSegment={setTargetSegment}
        isAdjusting={isAdjusting}
        onSubmit={handleAdjustSubmit}
      />
    </div>
  );
}
