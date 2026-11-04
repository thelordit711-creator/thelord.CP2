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
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '../../../../providers/SocketProvider';
import { AccessRole, WorkStatus } from '@lord/shared-types';

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

  // Vault modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<'GENERAL_BUDGET' | 'TREASURY_BALANCE'>('GENERAL_BUDGET');
  const [adjustOp, setAdjustOp] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [adjustAmount, setAdjustAmount] = useState<number>(1000);
  const [adjustReason, setAdjustReason] = useState<string>('تغذية الرصيد من الأرباح');

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
    }

    return () => {
      socket?.off('STAFF_STATUS_CHANGED');
    };
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
    try {
      await adjustVault({
        targetBalance: adjustTarget,
        operation: adjustOp,
        amount: Number(adjustAmount),
        reason: adjustReason
      }).unwrap();
      toast.success('تم تعديل الرصيد بنجاح!');
      setIsAdjustModalOpen(false);
      refetchVault();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل في تعديل الرصيد');
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
              setAdjustTarget('GENERAL_BUDGET');
              setIsAdjustModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 ml-1.5" />
            <span>تعديل الأرصدة يدوياً</span>
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* General Budget */}
        <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 font-semibold">الميزانية العامة للشركة</span>
            <div className="p-2 rounded-xl bg-lord-gold/15 text-lord-gold">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            ${(vault?.generalBudget ?? 50000).toLocaleString()}{' '}
            <span className="text-xs text-lord-gold font-normal">USDT</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">تتحكم بالميزانية التشغيلية وحملات النمو</p>
        </div>

        {/* Treasury Balance */}
        <div className="bg-obsidian-card border border-cyber-blue/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 font-semibold">رصيد الصندوق المتاح للصرف</span>
            <div className="p-2 rounded-xl bg-cyber-blue/15 text-cyber-blue">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            ${(vault?.treasuryBalance ?? 15000).toLocaleString()}{' '}
            <span className="text-xs text-cyber-blue font-normal">USDT</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">الرصيد الفعلي الجاهز للتحويلات الفورية للموظفين</p>
        </div>

        {/* Total Spent */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 font-semibold">إجمالي المصروفات المصروفة</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            $
            {(
              (vault?.totalSpentByCategory?.salaries ?? 0) +
              (vault?.totalSpentByCategory?.telegramOfficialAds ?? 0) +
              (vault?.totalSpentByCategory?.telegramChannelPromos ?? 0) +
              (vault?.totalSpentByCategory?.bonuses ?? 0)
            ).toLocaleString()}{' '}
            <span className="text-xs text-emerald-400 font-normal">USDT</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">تراكمي الرواتب والإعلانات والمكافآت</p>
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

      {/* Adjust Vault Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian-surface border border-lord-gold/40 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">تعديل الأرصدة يدوياً</h3>
            <p className="text-xs text-gray-400 mb-4">
              يمكنك زيادة أو إنقاص الميزانية العامة أو رصيد الصندوق مع تسجيل السبب في السجل التدقيقي.
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">الرصيد المستهدف:</label>
                <select
                  value={adjustTarget}
                  onChange={(e) => setAdjustTarget(e.target.value as any)}
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="GENERAL_BUDGET">الميزانية العامة (General Budget)</option>
                  <option value="TREASURY_BALANCE">رصيد الصندوق المتاح (Treasury Balance)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">نوع العملية:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustOp('INCREASE')}
                    className={`py-2 rounded-xl text-xs font-bold ${
                      adjustOp === 'INCREASE'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-obsidian-primary text-gray-400'
                    }`}
                  >
                    + زيادة الرصيد
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustOp('DECREASE')}
                    className={`py-2 rounded-xl text-xs font-bold ${
                      adjustOp === 'DECREASE'
                        ? 'bg-red-500 text-white'
                        : 'bg-obsidian-primary text-gray-400'
                    }`}
                  >
                    - إنقاص الرصيد
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">المبلغ (USDT):</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">سبب التعديل:</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
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
                  variant="gold"
                  size="sm"
                  isLoading={isAdjusting}
                >
                  حفظ التعديل
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
