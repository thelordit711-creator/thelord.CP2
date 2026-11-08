'use client';

import React, { useState } from 'react';
import {
  useGetAllEmployeesQuery,
  useToggleUserSuspensionMutation
} from '../../../store/api/usersApi';
import { Users, Search } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';

// Modular Subcomponents & Modals
import { EmployeeCard } from '../../../components/employees/cards/EmployeeCard';
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
  const [toggleSuspension] = useToggleUserSuspensionMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  // Modals state
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  // Direct Unsuspend (Restore)
  const handleDirectUnsuspend = async (emp: any) => {
    try {
      const res = await toggleSuspension({
        id: emp._id,
        isSuspended: false
      }).unwrap();

      lordToast.success('تم فك الحظر', res?.message || 'تم رفع الحظر والسماح للموظف بدخول المنظومة 🟢');
      refetch();
    } catch (err: any) {
      lordToast.error('فشل رفع الحظر', err?.data?.error || 'فشل رفع الحظر');
    }
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
        {filtered.map(emp => (
          <EmployeeCard
            key={emp._id}
            emp={emp}
            onManageLedger={(selected) => {
              setSelectedEmployee(selected);
              setIsActionModalOpen(true);
            }}
            onViewPayslip={(selected) => {
              setSelectedEmployee(selected);
              setIsPayslipOpen(true);
            }}
            onOpenSchedule={(selected) => {
              setSelectedEmployee(selected);
              setIsScheduleModalOpen(true);
            }}
            onOpenReport={(selected) => {
              setSelectedEmployee(selected);
              setIsReportModalOpen(true);
            }}
            onChangePassword={(selected) => {
              setSelectedEmployee(selected);
              setIsPasswordModalOpen(true);
            }}
            onSuspend={(selected) => {
              setSelectedEmployee(selected);
              setIsSuspendModalOpen(true);
            }}
            onDirectUnsuspend={handleDirectUnsuspend}
            onDeleteUser={(selected) => {
              setSelectedEmployee(selected);
              setIsDeleteModalOpen(true);
            }}
          />
        ))}
      </div>

      {/* Modal 1: Salary Action Modal */}
      <SalaryActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />

      {/* Modal 2: Payslip Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        employee={selectedEmployee}
      />

      {/* Modal 3: Payroll Schedule & 10-day Tranches */}
      <PayrollScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />

      {/* Modal 4: Monthly Report */}
      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        employee={selectedEmployee}
      />

      {/* Modal 5: Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />

      {/* Modal 6: Suspend Modal */}
      <SuspendEmployeeModal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />

      {/* Modal 7: Delete Modal */}
      <DeleteEmployeeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />
    </div>
  );
}
