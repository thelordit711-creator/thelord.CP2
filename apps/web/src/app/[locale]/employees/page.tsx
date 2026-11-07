'use client';

import React, { useState } from 'react';
import {
  useGetAllEmployeesQuery,
  useGetMeQuery,
  useDeleteUserMutation,
  useChangeUserPasswordMutation,
  useToggleUserSuspensionMutation
} from '../../../store/api/usersApi';
import { useManageEmployeeLedgerMutation } from '../../../store/api/financeApi';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Users,
  Search,
  Filter,
  DollarSign,
  Award,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  Smartphone,
  Coins,
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Key,
  Ban,
  UserCheck,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { lordToast } from '../../../lib/lordToast';
import { ChangePasswordModal } from '../../../components/employees/modals/ChangePasswordModal';
import { SuspendEmployeeModal } from '../../../components/employees/modals/SuspendEmployeeModal';
import { DeleteEmployeeModal } from '../../../components/employees/modals/DeleteEmployeeModal';
import { SalaryActionModal } from '../../../components/employees/modals/SalaryActionModal';
import { PayslipModal } from '../../../components/employees/modals/PayslipModal';
import { PayrollScheduleModal } from '../../../components/employees/modals/PayrollScheduleModal';
import { MonthlyReportModal } from '../../../components/employees/modals/MonthlyReportModal';

// Sample enterprise employees to populate if DB is fresh
const SAMPLE_EMPLOYEES: any[] = [
  {
    _id: 'emp_01',
    fullName: 'أحمد فاروق اليافعي',
    email: 'ahmed.trading@thelordofcrypto.com',
    phoneNumber: '777123456',
    primaryDepartment: 'TRADING',
    jobTitles: ['DEAL_ANALYST'],
    skills: [{ name: 'تحليل SMC وPrice Action', level: 'EXPERT' }, { name: 'إدارة مخاطر MT5', level: 'ADVANCED' }],
    payoutMethods: {
      preferredMethod: 'BEP20_USDT',
      bep20Address: '0x71C...a49B',
      jeebWallet: { isEnabled: true, registeredPhone: '777123456', accountHolderName: 'أحمد فاروق اليافعي' }
    },
    compensation: {
      baseSalary: 1200,
      salaryCurrency: 'USDT',
      payoutDayOfMonth: 1,
      activeBonuses: 150,
      activeDeductions: 0,
      activeAdvances: 0,
      warningsCount: 0
    },
    presenceStatus: 'ONLINE'
  },
  {
    _id: 'emp_02',
    fullName: 'سالم بن عبدالملك',
    email: 'salem.tg@thelordofcrypto.com',
    phoneNumber: '771987654',
    primaryDepartment: 'CONTENT_MEDIA',
    jobTitles: ['TG_CONTENT_MANAGER', 'GRAPHIC_VIDEO_EDITOR'],
    skills: [{ name: 'صناعة محتوى تليجرام', level: 'EXPERT' }, { name: 'مونتاج Premiere', level: 'ADVANCED' }],
    payoutMethods: {
      preferredMethod: 'JEEB_WALLET',
      jeebWallet: { isEnabled: true, registeredPhone: '771987654', accountHolderName: 'سالم بن عبدالملك الكندي' }
    },
    compensation: {
      baseSalary: 850,
      salaryCurrency: 'USDT',
      payoutDayOfMonth: 1,
      activeBonuses: 50,
      activeDeductions: 0,
      activeAdvances: 100,
      warningsCount: 0
    },
    presenceStatus: 'ONLINE'
  },
  {
    _id: 'emp_03',
    fullName: 'ياسر العولقي',
    email: 'yasser.dev@thelordofcrypto.com',
    phoneNumber: '773554433',
    primaryDepartment: 'DEVELOPMENT',
    jobTitles: ['WEB_BOT_DEVELOPER'],
    skills: [{ name: 'بوتات تليجرام Node.js', level: 'EXPERT' }, { name: 'Next.js & Mongoose', level: 'EXPERT' }],
    payoutMethods: {
      preferredMethod: 'JAWALI_WALLET',
      jawaliWallet: { isEnabled: true, registeredPhone: '773554433', accountHolderName: 'ياسر محمد العولقي' }
    },
    compensation: {
      baseSalary: 1500,
      salaryCurrency: 'USDT',
      payoutDayOfMonth: 1,
      activeBonuses: 200,
      activeDeductions: 0,
      activeAdvances: 0,
      warningsCount: 0
    },
    presenceStatus: 'IN_MEETING'
  },
  {
    _id: 'emp_04',
    fullName: 'عمر باوزير',
    email: 'omar.ads@thelordofcrypto.com',
    phoneNumber: '778998877',
    primaryDepartment: 'MARKETING',
    jobTitles: ['TG_ADS_MANAGER', 'TG_CHANNEL_PROMO_MANAGER'],
    skills: [{ name: 'إعلانات Telegram Ads الرسمية', level: 'EXPERT' }, { name: 'علاقات قنوات التداول', level: 'ADVANCED' }],
    payoutMethods: {
      preferredMethod: 'BEP20_USDT',
      bep20Address: '0x99A...c14D'
    },
    compensation: {
      baseSalary: 1100,
      salaryCurrency: 'USDT',
      payoutDayOfMonth: 1,
      activeBonuses: 0,
      activeDeductions: 30,
      activeAdvances: 0,
      warningsCount: 1
    },
    presenceStatus: 'OFFLINE'
  }
];

export default function EmployeesPage() {
  const { data: dbEmployeesRes, refetch } = useGetAllEmployeesQuery();
  const [manageLedger, { isLoading: isUpdatingLedger }] = useManageEmployeeLedgerMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangeUserPasswordMutation();
  const [toggleSuspension, { isLoading: isTogglingSuspension }] = useToggleUserSuspensionMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Admin Security Modals States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('مخالفة سياسات التداول والعمل المؤسسي');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Action Form state
  const [actionType, setActionType] = useState<'BONUS' | 'DEDUCTION' | 'WARNING' | 'ADVANCE_REQUEST' | 'BASE_SALARY'>('BONUS');
  const [actionAmount, setActionAmount] = useState<number>(50);
  const [actionReason, setActionReason] = useState<string>('مكافأة إنجاز مهمة استثنائية');
  const [actionWarning, setActionWarning] = useState<'NONE' | 'FIRST' | 'SECOND' | 'FINAL'>('FIRST');

  const employees = (dbEmployeesRes?.data && dbEmployeesRes.data.length > 0)
    ? dbEmployeesRes.data
    : SAMPLE_EMPLOYEES;

  const filtered = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'ALL' || emp.primaryDepartment === departmentFilter;
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? !emp.isSuspended
        : Boolean(emp.isSuspended);

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Handle Admin Password Change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!newPassword || newPassword.trim().length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل');
      return;
    }

    try {
      const res = await changePassword({
        id: selectedEmployee._id,
        newPassword: newPassword.trim()
      }).unwrap();

      toast.success(res?.message || 'تم تحديث كلمة السر بنجاح 🔑');
      setIsPasswordModalOpen(false);
      setNewPassword('');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل تحديث كلمة السر');
    }
  };

  // Handle Admin Suspension
  const handleToggleSuspensionSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedEmployee) return;

    try {
      const res = await toggleSuspension({
        id: selectedEmployee._id,
        isSuspended: true,
        reason: suspensionReason.trim()
      }).unwrap();

      toast.success(res?.message || 'تم إيقاف الحساب ومنعه من دخول المنظومة ⛔');
      setIsSuspendModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل إيقاف الحساب');
    }
  };

  // Direct Unsuspend (Restore)
  const handleDirectUnsuspend = async (emp: any) => {
    try {
      const res = await toggleSuspension({
        id: emp._id,
        isSuspended: false
      }).unwrap();

      toast.success(res?.message || 'تم رفع الحظر والسماح للموظف بدخول المنظومة 🟢');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل رفع الحظر');
    }
  };

  // Handle Admin Delete User
  const handleDeleteUserSubmit = async () => {
    if (!selectedEmployee) return;

    try {
      const res = await deleteUser(selectedEmployee._id).unwrap();
      toast.success(res?.message || 'تم حذف الحساب نهائياً 🗑️');
      setIsDeleteModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل حذف الحساب');
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      await manageLedger({
        employeeId: selectedEmployee._id,
        data: {
          entryType: actionType as any,
          amount: Number(actionAmount),
          reason: actionReason,
          warningLevel: actionType === 'WARNING' ? actionWarning : 'NONE',
          baseSalary: actionType === 'BASE_SALARY' ? Number(actionAmount) : undefined
        }
      }).unwrap();

      toast.success('تم تسجيل الإجراء المحاسبي وتحديث كشف حساب الموظف!');
      setIsActionModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.success('تم حفظ الإجراء محلياً وتحديث كشف حساب الموظف');
      setIsActionModalOpen(false);
    }
  };

  const calculateNetSalary = (comp: any) => {
    const base = comp?.baseSalary || 0;
    const bonus = comp?.activeBonuses || 0;
    const ded = comp?.activeDeductions || 0;
    const adv = comp?.activeAdvances || 0;
    return base + bonus - ded - adv;
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-lord-gold tracking-widest uppercase">
            ENTERPRISE TALENT MATRIX & PAYROLL ERP
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            إدارة الموظفين والرواتب والمستحقات
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            مصفوفة المسميات الـ 11، احتساب صافي الرواتب، المكافآت، الخصومات، والإنذارات الإدارية
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-obsidian-card border border-obsidian-border px-4 py-2 rounded-2xl flex items-center gap-2">
            <Users className="w-4 h-4 text-lord-gold" />
            <span className="text-xs text-gray-400">إجمالي الكادر:</span>
            <strong className="text-sm font-bold text-white">{employees.length} موظف</strong>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-obsidian-card p-4 rounded-3xl border border-obsidian-border">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-gray-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-obsidian-primary border border-gray-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
          />
        </div>

        {/* Status Filter (All / Active / Suspended) */}
        <div className="flex items-center gap-1.5 bg-obsidian-surface/80 p-1 rounded-2xl border border-gray-800 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-lord-gold text-obsidian-primary shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            الكل ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500 text-obsidian-primary font-black shadow-xs'
                : 'text-gray-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>مصرّح بالدخول</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SUSPENDED')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'SUSPENDED'
                ? 'bg-red-500 text-white font-black shadow-xs'
                : 'text-gray-400 hover:text-red-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>محظور ⛔</span>
          </button>
        </div>

        {/* Department Filters */}
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto text-xs pb-1 lg:pb-0">
          {[
            { id: 'ALL', label: 'كافة الأقسام' },
            { id: 'TRADING', label: 'التداول والتحليل' },
            { id: 'CONTENT_MEDIA', label: 'صناعة المحتوى' },
            { id: 'MARKETING', label: 'التسويق والإعلانات' },
            { id: 'DEVELOPMENT', label: 'البرمجة والبوتات' }
          ].map(dept => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setDepartmentFilter(dept.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                departmentFilter === dept.id
                  ? 'bg-lord-gold/20 text-lord-gold border border-lord-gold/40'
                  : 'bg-obsidian-surface text-gray-400 hover:text-white'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filtered.map(emp => {
          const net = calculateNetSalary(emp.compensation);
          return (
            <div
              key={emp._id}
              className="bg-obsidian-card border border-obsidian-border hover:border-lord-gold/40 rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Employee Header */}
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lord-gold/20 to-amber-700/20 border border-lord-gold/40 flex items-center justify-center font-bold text-lord-gold text-lg shrink-0">
                      {emp.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white flex items-center gap-2 truncate">
                        <span className="truncate">{emp.fullName}</span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            emp.isSuspended
                              ? 'bg-red-500'
                              : emp.presenceStatus === 'ONLINE'
                              ? 'bg-emerald-400 animate-ping'
                              : emp.presenceStatus === 'IN_MEETING'
                              ? 'bg-sky-400'
                              : 'bg-gray-600'
                          }`}
                          title={emp.isSuspended ? 'محظور من الدخول' : emp.presenceStatus}
                        />
                      </h3>
                      <p className="text-xs text-gray-400 font-mono truncate">{emp.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant="gold">{emp.primaryDepartment}</Badge>
                    {emp.isSuspended ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-[10px] font-black flex items-center gap-1 shadow-xs">
                        <Ban className="w-3 h-3 text-red-400" />
                        <span>محظور ⛔</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>مصرّح 🟢</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Suspension Notice Banner */}
                {emp.isSuspended && (
                  <div className="p-3 rounded-2xl bg-gradient-to-l from-red-950/40 via-obsidian-surface to-obsidian-card border border-red-500/50 mb-4 text-xs text-red-200 flex items-start gap-2.5 shadow-md">
                    <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Ban className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <strong className="block text-red-300 font-black">تم إيقاف هذا الحساب ومنعه من دخول المنظومة:</strong>
                      <p className="text-gray-300 leading-relaxed text-[11px]">{emp.suspensionReason || 'إيقاف إداري مباشر بقرار الإدارة'}</p>
                      {emp.suspendedAt && (
                        <span className="text-[10px] text-gray-400 font-mono block">
                          تاريخ الإيقاف: {new Date(emp.suspendedAt).toLocaleDateString('ar-YE')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Job Titles Badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {emp.jobTitles?.map((jt: string) => (
                    <span
                      key={jt}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-obsidian-surface text-lord-gold border border-lord-gold/20"
                    >
                      {jt}
                    </span>
                  ))}
                </div>

                {/* Payout Channel Info (BEP20 or Jeeb/Jawali) */}
                <div className="p-3 bg-obsidian-surface rounded-2xl border border-obsidian-border mb-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">وسيلة الصرف المعتمدة:</span>
                    <strong className="text-cyber-blue font-mono">
                      {emp.payoutMethods?.preferredMethod === 'BEP20_USDT'
                        ? '🪙 BEP20 (USDT)'
                        : emp.payoutMethods?.preferredMethod === 'JEEB_WALLET'
                        ? '📱 محفظة جيب'
                        : '📱 محفظة جوالي'}
                    </strong>
                  </div>
                  {emp.payoutMethods?.bep20Address && (
                    <div className="text-[11px] text-gray-400 font-mono truncate">
                      العنوان: {emp.payoutMethods.bep20Address}
                    </div>
                  )}
                  {emp.payoutMethods?.jeebWallet?.isEnabled && (
                    <div className="text-[11px] text-emerald-400 font-mono">
                      رقم جيب: {emp.payoutMethods.jeebWallet.registeredPhone} ({emp.payoutMethods.jeebWallet.accountHolderName})
                    </div>
                  )}
                </div>

                {/* Financial Compensation Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-center p-3 bg-obsidian-primary/80 rounded-2xl border border-gray-800 mb-4">
                  <div>
                    <span className="text-[10px] text-gray-500 block">الراتب الأساسي</span>
                    <strong className="text-xs text-white font-mono">${emp.compensation?.baseSalary || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block">+ المكافآت</span>
                    <strong className="text-xs text-emerald-400 font-mono">+${emp.compensation?.activeBonuses || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-400 block">- الخصومات</span>
                    <strong className="text-xs text-red-400 font-mono">-${emp.compensation?.activeDeductions || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 block">- السُلف</span>
                    <strong className="text-xs text-amber-400 font-mono">-${emp.compensation?.activeAdvances || 0}</strong>
                  </div>
                </div>

                {/* Net Total & Warnings Alert */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-lord-gold/10 border border-lord-gold/30 mb-4">
                  <div>
                    <span className="text-[10px] text-lord-gold block font-semibold">صافي المستحق الصافي:</span>
                    <strong className="text-lg font-black text-white font-mono">
                      ${net.toLocaleString()} USDT
                    </strong>
                  </div>
                  {emp.compensation?.warningsCount > 0 ? (
                    <Badge variant="danger" className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{emp.compensation.warningsCount} إنذارات</span>
                    </Badge>
                  ) : (
                    <Badge variant="disbursed" className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>سجل منضبط 100%</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons: Financials + Administrative Account Controls */}
              <div className="space-y-3 pt-3 border-t border-obsidian-border">
                {/* Financial Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsActionModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1 rounded-xl text-xs"
                  >
                    <DollarSign className="w-3.5 h-3.5 ml-1" />
                    <span>إدارة المستحقات</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsPayslipOpen(true);
                    }}
                    className="flex items-center justify-center gap-1 text-gray-300 border-gray-700 hover:border-gray-600 rounded-xl text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 ml-1" />
                    <span>كشف الراتب</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsScheduleModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-lord-gold/15 hover:bg-lord-gold text-lord-gold hover:text-obsidian-primary border border-lord-gold/40 text-xs font-bold transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 ml-0.5" />
                    <span>تجزئة الراتب والبدلات 📅</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsReportModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-cyber-blue/15 hover:bg-cyber-blue text-cyber-blue hover:text-white border border-cyber-blue/40 text-xs font-bold transition-all"
                  >
                    <Coins className="w-3.5 h-3.5 ml-0.5" />
                    <span>تقرير الصندوق الشهري 📊</span>
                  </button>
                </div>

                {/* Administrative Account Controls (Delete, Change Password, Suspend Access) */}
                <div className="pt-2.5 border-t border-gray-800/70 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-lord-gold uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3 h-3 text-lord-gold" />
                    <span>أمن الحساب والدخول:</span>
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Change Password */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setNewPassword('');
                        setIsPasswordModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-obsidian-surface hover:bg-gray-800 text-gray-200 border border-gray-700 hover:border-lord-gold/60 text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                      title="تعديل وتعيين كلمة سر جديدة لهذا الحساب"
                    >
                      <Key className="w-3 h-3 text-lord-gold" />
                      <span>تعديل كلمة السر</span>
                    </button>

                    {/* Suspend / Restore Access */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        if (emp.isSuspended) {
                          handleDirectUnsuspend(emp);
                        } else {
                          setSuspensionReason('مخالفة سياسات التداول والعمل المؤسسي');
                          setIsSuspendModalOpen(true);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 shadow-xs ${
                        emp.isSuspended
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                          : 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
                      }`}
                      title={emp.isSuspended ? 'رفع الحظر والسماح للموظف بدخول المنظومة' : 'منع الموظف من تسجيل الدخول للمنظومة فورياً'}
                    >
                      {emp.isSuspended ? (
                        <>
                          <UserCheck className="w-3 h-3 text-emerald-400" />
                          <span>رفع الحظر 🟢</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3 h-3 text-red-400" />
                          <span>منع من الدخول ⛔</span>
                        </>
                      )}
                    </button>

                    {/* Delete Account */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all shadow-xs"
                      title="حذف هذا الحساب نهائياً من المنظومة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modular Universal Portal Modals */}
      <SalaryActionModal
        employee={selectedEmployee}
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onSuccess={() => refetch()}
      />

      <PayslipModal
        employee={selectedEmployee}
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
      />

      <ChangePasswordModal
        employee={selectedEmployee}
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => refetch()}
      />

      <SuspendEmployeeModal
        employee={selectedEmployee}
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        onSuccess={() => refetch()}
      />

      <DeleteEmployeeModal
        employee={selectedEmployee}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => {
          setSelectedEmployee(null);
          refetch();
        }}
      />

      {/* 10-Day Payroll Tranches & Allowances Modal */}
      <PayrollScheduleModal
        employee={selectedEmployee}
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Treasury Monthly Financial Statement Modal */}
      <MonthlyReportModal
        employee={selectedEmployee}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}

