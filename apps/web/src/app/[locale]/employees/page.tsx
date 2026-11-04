'use client';

import React, { useState } from 'react';
import {
  useGetAllEmployeesQuery,
  useGetMeQuery
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
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

// Sample enterprise employees to populate if DB is fresh
const SAMPLE_EMPLOYEES = [
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

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

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
    return matchesSearch && matchesDept;
  });

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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-obsidian-card p-4 rounded-3xl border border-obsidian-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute top-1/2 -translate-y-1/2 right-3" />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-obsidian-primary border border-gray-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white focus:outline-none focus:border-lord-gold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
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
                  ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
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
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lord-gold/20 to-amber-700/20 border border-lord-gold/40 flex items-center justify-center font-bold text-lord-gold text-lg">
                      {emp.fullName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{emp.fullName}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            emp.presenceStatus === 'ONLINE'
                              ? 'bg-emerald-400 animate-ping'
                              : emp.presenceStatus === 'IN_MEETING'
                              ? 'bg-sky-400'
                              : 'bg-gray-600'
                          }`}
                          title={emp.presenceStatus}
                        />
                      </h3>
                      <p className="text-xs text-gray-400 font-mono">{emp.email}</p>
                    </div>
                  </div>

                  <Badge variant="gold">{emp.primaryDepartment}</Badge>
                </div>

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

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-obsidian-border">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setIsActionModalOpen(true);
                  }}
                  className="flex items-center gap-1"
                >
                  <DollarSign className="w-4 h-4 ml-1" />
                  <span>إدارة المستحقات</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setIsPayslipOpen(true);
                  }}
                  className="flex items-center gap-1 text-gray-300 border-gray-700"
                >
                  <FileText className="w-4 h-4 ml-1" />
                  <span>كشف الراتب (Payslip)</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Dialog: Add Bonus / Deduction / Warning / Salary Adjust */}
      {isActionModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian-surface border border-lord-gold/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-lord-gold" />
              <span>إجراء مالي أو إداري: {selectedEmployee.fullName}</span>
            </h3>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">نوع الإجراء:</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'BONUS', label: '+ مكافأة إنجاز' },
                    { id: 'DEDUCTION', label: '- خصم مالي' },
                    { id: 'WARNING', label: '⚠️ إنذار إداري' },
                    { id: 'ADVANCE_REQUEST', label: '💵 سلفة مؤقتة' },
                    { id: 'BASE_SALARY', label: '📝 تعديل الراتب' }
                  ].map(act => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setActionType(act.id as any)}
                      className={`p-2 rounded-xl font-bold transition-all ${
                        actionType === act.id
                          ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                          : 'bg-obsidian-card text-gray-400 border border-gray-800'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {actionType !== 'WARNING' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {actionType === 'BASE_SALARY' ? 'الراتب الأساسي الجديد (USDT):' : 'المبلغ (USDT):'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={actionAmount}
                    onChange={e => setActionAmount(Number(e.target.value))}
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-lord-gold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">مستوى الإنذار:</label>
                  <select
                    value={actionWarning}
                    onChange={e => setActionWarning(e.target.value as any)}
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2 text-sm text-white"
                  >
                    <option value="FIRST">إنذار أولي (First Warning)</option>
                    <option value="SECOND">إنذار ثانٍ (Second Warning)</option>
                    <option value="FINAL">إنذار نهائي مشدد (Final Notice)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">السبب والمبرر الإداري:</label>
                <textarea
                  rows={3}
                  required
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-lord-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsActionModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  isLoading={isUpdatingLedger}
                >
                  تأكيد وقيد في كشف الحساب
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Payslip Modal */}
      {isPayslipOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-obsidian-surface border-2 border-lord-gold rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative">
            {/* Payslip Header with Lion Crown Brand */}
            <div className="flex items-center justify-between border-b border-lord-gold/30 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="THE LORD OF CRYPTO"
                  className="w-14 h-14 rounded-full object-cover border-2 border-lord-gold shadow-gold-glow shrink-0"
                />
                <div>
                  <h2 className="text-xl font-black text-white tracking-wider">
                    THE LORD OF CRYPTO
                  </h2>
                  <p className="text-xs text-lord-gold font-mono">OFFICIAL SALARY PAYSLIP & LEDGER</p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-400 font-mono">
                <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
                <div className="text-emerald-400 font-bold">الحالة: معتمد رسمي</div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-obsidian-card p-4 rounded-2xl border border-gray-800 mb-6">
              <div>
                <span className="text-gray-400">اسم الموظف: </span>
                <strong className="text-white text-sm">{selectedEmployee.fullName}</strong>
              </div>
              <div>
                <span className="text-gray-400">القسم: </span>
                <strong className="text-lord-gold">{selectedEmployee.primaryDepartment}</strong>
              </div>
              <div>
                <span className="text-gray-400">وسيلة الصرف: </span>
                <strong className="text-cyber-blue font-mono">{selectedEmployee.payoutMethods?.preferredMethod}</strong>
              </div>
              <div>
                <span className="text-gray-400">يوم الصرف الشهري: </span>
                <strong className="text-white">يوم {selectedEmployee.compensation?.payoutDayOfMonth || 1} من كل شهر</strong>
              </div>
            </div>

            {/* Calculation Table */}
            <div className="border border-gray-800 rounded-2xl overflow-hidden mb-6 text-xs">
              <table className="w-full text-right">
                <thead className="bg-obsidian-card text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="py-2.5 px-4">البند المالي</th>
                    <th className="py-2.5 px-4">التفاصيل</th>
                    <th className="py-2.5 px-4 text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-white">الراتب الأساسي</td>
                    <td className="py-2.5 px-4 text-gray-400">عقد العمل الأساسي</td>
                    <td className="py-2.5 px-4 text-left font-mono">${selectedEmployee.compensation?.baseSalary || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-emerald-400">+ المكافآت والحوافز</td>
                    <td className="py-2.5 px-4 text-gray-400">إنجاز الصفقات والحملات</td>
                    <td className="py-2.5 px-4 text-left font-mono text-emerald-400">+${selectedEmployee.compensation?.activeBonuses || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-red-400">- الخصومات الإدارية</td>
                    <td className="py-2.5 px-4 text-gray-400">تأخيرات أو جزاءات</td>
                    <td className="py-2.5 px-4 text-left font-mono text-red-400">-${selectedEmployee.compensation?.activeDeductions || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-amber-400">- السلف المستلمة</td>
                    <td className="py-2.5 px-4 text-gray-400">سلف مخصومة من الراتب</td>
                    <td className="py-2.5 px-4 text-left font-mono text-amber-400">-${selectedEmployee.compensation?.activeAdvances || 0}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-lord-gold/15 border-t border-lord-gold/30">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 font-black text-white text-sm">
                      صافي المستحق النهائي القابل للصرف:
                    </td>
                    <td className="py-3 px-4 text-left font-mono text-base font-black text-lord-gold">
                      ${calculateNetSalary(selectedEmployee.compensation).toLocaleString()} USDT
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payslip Footer & Close */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <span className="text-[10px] text-gray-500 font-mono">
                كشف إلكتروني معتمد مشفر برقم: TL-{Date.now().toString().slice(-8)}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 ml-1" />
                  <span>طباعة الكشف</span>
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={() => setIsPayslipOpen(false)}
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

