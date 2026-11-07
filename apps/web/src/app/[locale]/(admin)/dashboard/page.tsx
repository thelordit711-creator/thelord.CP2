'use client';

import React, { useState, useEffect } from 'react';
import {
  useGetVaultQuery,
  useAdjustVaultMutation,
  useGetFinancialRequestsQuery,
  useDecideFinancialRequestMutation
} from '../../../../store/api/financeApi';
import { useGetTasksQuery } from '../../../../store/api/tasksApi';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import {
  Wallet,
  Coins,
  TrendingUp,
  FileCheck,
  Check,
  X,
  MessageSquare,
  Sparkles,
  Plus,
  Minus,
  UserPlus,
  Copy,
  Clock,
  Radio,
  Coffee,
  CheckCircle2,
  Users,
  Shield,
  Briefcase,
  ArrowLeftRight,
  ShieldCheck,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '../../../../providers/SocketProvider';
import { AccessRole, WorkStatus } from '@lord/shared-types';
import { AuditLogsViewer } from '../../../../components/admin/AuditLogsViewer';

interface StaffStatusItem {
  _id: string;
  fullName: string;
  email: string;
  accessRole: AccessRole;
  primaryDepartment?: string;
  jobTitles?: string[];
  workStatus?: WorkStatus;
  workStatusUpdatedAt?: string;
  presenceStatus?: string;
  lastActiveAt?: string;
}

export default function AdminDashboardPage() {
  const { data: vaultRes, refetch: refetchVault } = useGetVaultQuery();
  const { data: requestsRes, refetch: refetchRequests } = useGetFinancialRequestsQuery();
  const { data: tasksRes } = useGetTasksQuery();
  const { socket } = useSocket();

  const [adjustVault, { isLoading: isAdjusting }] = useAdjustVaultMutation();
  const [decideRequest, { isLoading: isDeciding }] = useDecideFinancialRequestMutation();

  // Vault Liquidity & Governance modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'FUND_TREASURY' | 'DEPOSIT_BUDGET' | 'RETURN_BUDGET'>('FUND_TREASURY');
  const [adjustAmount, setAdjustAmount] = useState<number>(1000);
  const [adjustReason, setAdjustReason] = useState<string>('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');

  // Staff Monitoring State
  const [staffList, setStaffList] = useState<StaffStatusItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AccessRole>('EMPLOYEE');
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  const vault = vaultRes?.data;
  const requests = requestsRes?.data || [];
  const tasks = tasksRes?.data || [];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  // Fetch staff statuses
  const fetchStaffStatuses = async () => {
    try {
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/auth/staff-statuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStaffList(data.data);
      }
    } catch (e) {
      console.error('Failed to load staff statuses', e);
    } finally {
      setLoadingStaff(false);
    }
  };

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
        toast.info(`تحديث حالة الموظف: ${updatedStaff.fullName} -> ${updatedStaff.workStatus}`);
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
  }, [socket, apiUrl]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingInvite(true);
    try {
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في إنشاء رابط الدعوة');
      }

      setGeneratedInviteUrl(data.inviteUrl);
      toast.success('تم إنشاء رابط الدعوة بنجاح!');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSendingInvite(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الرابط بنجاح إلى الحافظة!');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(adjustAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const currentGenBudget = vault?.generalBudget ?? 0;
    const currentTreasury = vault?.treasuryBalance ?? 0;

    if (activeTab === 'FUND_TREASURY' && amount > currentGenBudget) {
      toast.error(`المبلغ المطلوب (${amount.toLocaleString()} USDT) يتجاوز رصيد الميزانية العامة المتاحة (${currentGenBudget.toLocaleString()} USDT)! يرجى إيداع رصيد أولاً.`);
      return;
    }

    if (activeTab === 'RETURN_BUDGET' && amount > currentTreasury) {
      toast.error(`المبلغ المطلوب (${amount.toLocaleString()} USDT) يتجاوز رصيد الصندوق المتاح (${currentTreasury.toLocaleString()} USDT)!`);
      return;
    }

    try {
      let actionType: 'DEPOSIT_GENERAL_BUDGET' | 'FUND_TREASURY' | 'RETURN_TO_BUDGET' = 'FUND_TREASURY';
      if (activeTab === 'DEPOSIT_BUDGET') actionType = 'DEPOSIT_GENERAL_BUDGET';
      else if (activeTab === 'RETURN_BUDGET') actionType = 'RETURN_TO_BUDGET';

      await adjustVault({
        actionType,
        amount,
        reason: adjustReason.trim() || 'إدارة سيولة الخزينة'
      }).unwrap();

      toast.success(
        activeTab === 'FUND_TREASURY'
          ? 'تمت تغذية الصندوق بنجاح بخصم المبلغ من الميزانية العامة للشركة!'
          : activeTab === 'DEPOSIT_BUDGET'
          ? 'تم إيداع الرصيد بنجاح في الميزانية العامة للشركة!'
          : 'تم استرجاع الرصيد بنجاح من الصندوق إلى الميزانية العامة!'
      );
      setIsAdjustModalOpen(false);
      refetchVault();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل في تنفيذ العملية');
    }
  };

  const handleDecision = async (requestId: string, decision: 'APPROVE' | 'REJECT' | 'NOTE') => {
    try {
      await decideRequest({
        id: requestId,
        data: {
          decision,
          adminNotes: decision === 'APPROVE' ? 'معتمد للصرف عبر الصندوق' : 'تمت المراجعة من المسؤول'
        }
      }).unwrap();

      toast.success(
        decision === 'APPROVE'
          ? 'تم اعتماد الميزانية وإحالتها لشاشة الصندوق فوراً!'
          : 'تم تحديث حالة الطلب بنجاح'
      );
      refetchRequests();
      refetchVault();
    } catch (err: any) {
      toast.error(err?.data?.error || 'حدث خطأ أثناء اتخاذ القرار');
    }
  };

  const renderWorkStatusBadge = (status?: WorkStatus) => {
    switch (status) {
      case 'WORKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>قيد العمل ⚡</span>
          </span>
        );
      case 'ON_BREAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Coffee className="w-3 h-3 text-blue-300" />
            <span>استراحة ☕</span>
          </span>
        );
      case 'LOGGED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>تم تسجيل الدخول 🟢</span>
          </span>
        );
      case 'LOGGED_OUT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>تم تسجيل الخروج 🔴</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-lord-gold tracking-widest uppercase">
            THE LORD OF CRYPTO — EXECUTIVE PANEL
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            لوحة قيادة العمليات والخزينة ومراقبة الكادر
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="gold"
            size="md"
            onClick={() => {
              setInviteEmail('');
              setGeneratedInviteUrl(null);
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 ml-1.5" />
            <span>إرسال دعوة انضمام لكادر جديد</span>
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
            className="flex items-center gap-2 border border-lord-gold/40 text-lord-gold hover:bg-lord-gold/10"
          >
            <ArrowLeftRight className="w-4 h-4 ml-1.5" />
            <span>إدارة السيولة وتغذية الصندوق</span>
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
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
            $
            {(
              (vault?.totalSpentByCategory?.salaries ?? 0) +
              (vault?.totalSpentByCategory?.bonuses ?? 0) +
              (vault?.totalSpentByCategory?.advances ?? 0) +
              (vault?.totalSpentByCategory?.telegramOfficialAds ?? 0) +
              (vault?.totalSpentByCategory?.telegramChannelPromos ?? 0) +
              (vault?.totalSpentByCategory?.softwareSubscriptions ?? 0) +
              (vault?.totalSpentByCategory?.otherExpenses ?? 0)
            ).toLocaleString()}{' '}
            <span className="text-xs text-emerald-400 font-normal">USDT</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            كافة المصروفات المعتمدة والمنفذة حصراً عبر الصندوق (رواتب، مهام، مكافآت، إعلانات)
          </p>
        </div>
      </div>

      {/* Financial Governance & Liquidity Flow Indicator */}
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
            onClick={() => {
              setActiveTab('FUND_TREASURY');
              setAdjustAmount(1000);
              setAdjustReason('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');
              setIsAdjustModalOpen(true);
            }}
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/30 hover:bg-cyber-blue/25 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>تغذية الصندوق من الميزانية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('DEPOSIT_BUDGET');
              setAdjustAmount(5000);
              setAdjustReason('إيداع رأس مال / أرباح جديدة في الميزانية العامة');
              setIsAdjustModalOpen(true);
            }}
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-lord-gold/15 text-lord-gold border border-lord-gold/30 hover:bg-lord-gold/25 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إيداع في الميزانية العامة</span>
          </button>
        </div>
      </div>

      {/* Real-Time Staff Work Status Monitor */}
      <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-lord-gold/15 text-lord-gold">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>مراقبة الحضور والعمل اللحظي للكادر (Live Staff Monitor)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h3>
              <p className="text-xs text-gray-400">
                متابعة مباشرة لحالات الموظفين: تسجيل الدخول، قيد العمل، الاستراحة، وتسجيل الخروج
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={fetchStaffStatuses} className="text-xs text-lord-gold">
            تحديث القائمة
          </Button>
        </div>

        {loadingStaff ? (
          <div className="py-8 text-center text-xs text-gray-400">جاري تحميل حالات الكادر...</div>
        ) : staffList.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            لم يتم تسجيل موظفين بعد. انقر على "إرسال دعوة انضمام لكادر جديد" لدعوة أول موظف أو أمين صندوق!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 pb-3">
                  <th className="pb-3 font-semibold">الموظف</th>
                  <th className="pb-3 font-semibold">الدور المعتمد</th>
                  <th className="pb-3 font-semibold">القسم</th>
                  <th className="pb-3 font-semibold">حالة العمل اللحظية</th>
                  <th className="pb-3 font-semibold">آخر نشاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {staffList.map((emp) => (
                  <tr key={emp._id} className="hover:bg-obsidian-surface/60 transition-colors">
                    <td className="py-3.5 pr-1">
                      <div className="font-bold text-white">{emp.fullName}</div>
                      <div className="text-[11px] text-gray-500 font-mono" dir="ltr">{emp.email}</div>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        emp.accessRole === 'TREASURY' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyber-blue/20 text-cyber-blue'
                      }`}>
                        {emp.accessRole === 'TREASURY' ? 'أمين الصندوق' : 'موظف'}
                      </span>
                    </td>
                    <td className="py-3.5 text-gray-300">
                      {emp.primaryDepartment || 'عام'}
                    </td>
                    <td className="py-3.5">
                      {renderWorkStatusBadge(emp.workStatus)}
                    </td>
                    <td className="py-3.5 text-gray-400 text-[11px]">
                      {emp.workStatusUpdatedAt ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span>{new Date(emp.workStatusUpdatedAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Financial Requests Section */}
      <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-lord-gold" />
            <h3 className="text-lg font-bold text-white">الطلبات المالية بانتظار اعتماد المسؤول</h3>
          </div>
          <Badge variant="gold">{requests.length} طلبات</Badge>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-500">
            لا توجد طلبات مالية معلقة حالياً.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req: any) => (
              <div
                key={req._id}
                className="p-4 rounded-2xl bg-obsidian-surface border border-obsidian-border flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{req.title}</span>
                    <Badge variant="processing">طلب ميزانية</Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    المقدم: <strong className="text-gray-200">{req.createdBy?.fullName || 'عضو'}</strong> |
                    المبلغ: <strong className="text-lord-gold">{req.financialRequirement?.amount} USDT</strong> |
                    الوسيلة: <strong className="text-cyber-blue">{req.financialRequirement?.payoutMethodRequested}</strong>
                  </p>
                  {req.financialRequirement?.justification && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      "{req.financialRequirement.justification}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="gold"
                    size="sm"
                    disabled={isDeciding}
                    onClick={() => handleDecision(req._id, 'APPROVE')}
                    className="flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>موافقة وتحويل للصندوق</span>
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isDeciding}
                    onClick={() => handleDecision(req._id, 'REJECT')}
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
      </div>

      {/* Centralized Security Audit Trail Section */}
      <AuditLogsViewer />

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian-surface border border-lord-gold/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-lord-gold" />
              <span>إرسال دعوة انضمام لكادر جديد</span>
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              أدخل البريد الإلكتروني للموظف وحدد نوع الدور (موظف عادي أو أمين الصندوق). سيتم إنشاء رابط تسجيلي مخصص له ليقوم بملء بياناته ومهاراته وحسابات استلام الأرباح.
            </p>

            {!generatedInviteUrl ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    البريد الإلكتروني للموظف:
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="employee@domain.com"
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lord-gold focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    نوع الكادر وصلاحيات الوصول:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setInviteRole('EMPLOYEE')}
                      className={`p-3 rounded-xl border text-right transition-all ${
                        inviteRole === 'EMPLOYEE'
                          ? 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue font-bold'
                          : 'bg-obsidian-primary border-gray-700 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span>موظف (EMPLOYEE)</span>
                      </div>
                      <p className="text-[10px] text-gray-400">مهام، كشوفات رواتب، غرف اجتماعات، وطلب ميزانيات.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInviteRole('TREASURY')}
                      className={`p-3 rounded-xl border text-right transition-all ${
                        inviteRole === 'TREASURY'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                          : 'bg-obsidian-primary border-gray-700 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Coins className="w-4 h-4" />
                        <span>أمين الصندوق (TREASURY)</span>
                      </div>
                      <p className="text-[10px] text-gray-400">صلاحيات معزولة حصراً على شاشة الصرف المالي.</p>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsInviteModalOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="gold" size="sm" isLoading={sendingInvite}>
                    إنشاء رابط الدعوة
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-5 h-5 mb-2" />
                  <span>تم إنشاء رابط الدعوة بنجاح! انسخ الرابط وأرسله للموظف ليبدأ التسجيل فوراً:</span>
                </div>

                <div className="p-3 bg-obsidian-primary rounded-xl border border-gray-700 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-lord-gold truncate" dir="ltr">
                    {generatedInviteUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedInviteUrl)}
                    className="p-2 rounded-lg bg-lord-gold/20 text-lord-gold hover:bg-lord-gold/30 transition-all flex items-center gap-1 text-xs font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setGeneratedInviteUrl(null);
                    }}
                  >
                    تم
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vault Liquidity & Governance Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-obsidian-card border border-lord-gold/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-obsidian-border mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-lord-gold/15 text-lord-gold">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">إدارة سيولة الخزينة والميزانية العامة</h3>
                  <p className="text-xs text-gray-400 mt-0.5">الحوكمة المالية: أي تغذية للصندوق تُخصم من الميزانية العامة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-obsidian-surface transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Selectors */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-obsidian-primary rounded-2xl border border-obsidian-border mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('FUND_TREASURY');
                  setAdjustAmount(Math.min(1000, vault?.generalBudget || 1000));
                  setAdjustReason('تغذية رصيد الصندوق بالخصم من الميزانية العامة');
                }}
                className={`py-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'FUND_TREASURY'
                    ? 'bg-cyber-blue text-obsidian-primary shadow-lg shadow-cyber-blue/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🔄 تغذية الصندوق</span>
                <span className="text-[10px] opacity-80">(خصم من الميزانية)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('DEPOSIT_BUDGET');
                  setAdjustAmount(5000);
                  setAdjustReason('إيداع رأس مال / أرباح جديدة في الميزانية العامة للشركة');
                }}
                className={`py-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'DEPOSIT_BUDGET'
                    ? 'bg-lord-gold text-obsidian-primary shadow-lg shadow-gold-glow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>💰 إيداع رأس مال</span>
                <span className="text-[10px] opacity-80">(الميزانية العامة)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('RETURN_BUDGET');
                  setAdjustAmount(Math.min(500, vault?.treasuryBalance || 500));
                  setAdjustReason('استرجاع فائض سيولة من الصندوق إلى الميزانية العامة');
                }}
                className={`py-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'RETURN_BUDGET'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>↩️ استرجاع فائض</span>
                <span className="text-[10px] opacity-80">(من الصندوق للأصل)</span>
              </button>
            </div>

            {/* Current Balances Context Banner */}
            <div className="grid grid-cols-2 gap-3 mb-5 p-3.5 rounded-2xl bg-obsidian-surface border border-obsidian-border text-xs">
              <div className="border-r border-obsidian-border pr-2">
                <span className="text-gray-400 block mb-0.5">الميزانية العامة للشركة (الأصل):</span>
                <span className="text-sm font-black text-lord-gold">
                  ${(vault?.generalBudget ?? 0).toLocaleString()} <span className="text-[10px] font-normal">USDT</span>
                </span>
              </div>
              <div className="pl-2">
                <span className="text-gray-400 block mb-0.5">رصيد الصندوق المتاح للصرف:</span>
                <span className="text-sm font-black text-cyber-blue">
                  ${(vault?.treasuryBalance ?? 0).toLocaleString()} <span className="text-[10px] font-normal">USDT</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Amount input & Quick buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300">
                    {activeTab === 'FUND_TREASURY' && 'المبلغ المراد تحويله وتغذية الصندوق به (USDT):'}
                    {activeTab === 'DEPOSIT_BUDGET' && 'مبلغ رأس المال المودع في الميزانية العامة (USDT):'}
                    {activeTab === 'RETURN_BUDGET' && 'المبلغ المراد استرجاعه للميزانية العامة (USDT):'}
                  </label>

                  {/* Max quick helper */}
                  {activeTab === 'FUND_TREASURY' && (vault?.generalBudget ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setAdjustAmount(vault?.generalBudget ?? 0)}
                      className="text-[11px] text-cyber-blue hover:underline font-bold"
                    >
                      الحد الأقصى المتاح (${(vault?.generalBudget ?? 0).toLocaleString()})
                    </button>
                  )}
                  {activeTab === 'RETURN_BUDGET' && (vault?.treasuryBalance ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setAdjustAmount(vault?.treasuryBalance ?? 0)}
                      className="text-[11px] text-emerald-400 hover:underline font-bold"
                    >
                      كامل رصيد الصندوق (${(vault?.treasuryBalance ?? 0).toLocaleString()})
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    value={adjustAmount || ''}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="w-full bg-obsidian-primary border border-gray-700 focus:border-lord-gold rounded-xl px-4 py-2.5 text-base font-bold text-white pl-16 focus:outline-none"
                    placeholder="1000"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    USDT
                  </span>
                </div>

                {/* Validation Warnings */}
                {activeTab === 'FUND_TREASURY' && adjustAmount > (vault?.generalBudget ?? 0) && (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>
                      المبلغ المطلوب يتجاوز رصيد الميزانية العامة (${(vault?.generalBudget ?? 0).toLocaleString()} USDT)! يرجى إيداع رصيد أولاً في الميزانية العامة.
                    </span>
                  </div>
                )}

                {activeTab === 'RETURN_BUDGET' && adjustAmount > (vault?.treasuryBalance ?? 0) && (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>
                      المبلغ المطلوب يتجاوز رصيد الصندوق (${(vault?.treasuryBalance ?? 0).toLocaleString()} USDT)!
                    </span>
                  </div>
                )}
              </div>

              {/* Reason input */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  سبب العملية (للتوثيق في السجل التدقيقي للمنظومة):
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-obsidian-primary border border-gray-700 focus:border-lord-gold rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  placeholder="سبب التحويل أو الإيداع..."
                />
              </div>

              {/* Explanatory Rule Footer */}
              <div className="p-3 rounded-xl bg-obsidian-surface border border-obsidian-border text-[11px] text-gray-400 leading-relaxed">
                {activeTab === 'FUND_TREASURY' && (
                  <p>
                    ⚡ <strong className="text-white">القاعدة المالية:</strong> سيتم خصم{' '}
                    <span className="text-cyber-blue font-bold">${adjustAmount.toLocaleString()} USDT</span> من الميزانية العامة للشركة وإضافتها تلقائياً إلى رصيد الصندوق المخصص للصرف الفعلي.
                  </p>
                )}
                {activeTab === 'DEPOSIT_BUDGET' && (
                  <p>
                    💰 <strong className="text-white">القاعدة المالية:</strong> سيتم إضافة{' '}
                    <span className="text-lord-gold font-bold">${adjustAmount.toLocaleString()} USDT</span> مباشرة إلى الميزانية العامة الأساسية للشركة لزيادة الطاقة الاستيعابية للتغذية.
                  </p>
                )}
                {activeTab === 'RETURN_BUDGET' && (
                  <p>
                    ↩️ <strong className="text-white">القاعدة المالية:</strong> سيتم خصم المبلغ من رصيد الصندوق وإعادته إلى الميزانية العامة كفائض غير مصروف.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-obsidian-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdjustModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant={activeTab === 'FUND_TREASURY' ? 'cyber' : 'gold'}
                  size="sm"
                  isLoading={isAdjusting}
                  disabled={
                    (activeTab === 'FUND_TREASURY' && adjustAmount > (vault?.generalBudget ?? 0)) ||
                    (activeTab === 'RETURN_BUDGET' && adjustAmount > (vault?.treasuryBalance ?? 0))
                  }
                  className="font-bold px-5"
                >
                  {activeTab === 'FUND_TREASURY' && 'تأكيد خصم الميزانية وتغذية الصندوق'}
                  {activeTab === 'DEPOSIT_BUDGET' && 'تأكيد إيداع رأس المال في الميزانية'}
                  {activeTab === 'RETURN_BUDGET' && 'تأكيد إعادة الفائض للميزانية العامة'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
