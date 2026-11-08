'use client';

import React, { useState } from 'react';
import {
  useGetAllEmployeesQuery,
  useToggleUserSuspensionMutation
} from '../../../store/api/usersApi';
import { Users, Search, Filter } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';

// Modular Subcomponents & Modals
import { EmployeeCard } from '../../../components/employees/cards/EmployeeCard';
import { EmployeeTodayDetailsModal } from '../../../components/employees/modals/EmployeeTodayDetailsModal';
import { QuickContactModal } from '../../../components/employees/modals/QuickContactModal';
import { AssignQuickTaskModal } from '../../../components/employees/modals/AssignQuickTaskModal';
import { EmployeeManagementDossierModal } from '../../../components/employees/modals/EmployeeManagementDossierModal';

// Existing Sub-modals for HR & Ledger actions
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

  // 4 Core New Executive Modals
  const [isTodayDetailsOpen, setIsTodayDetailsOpen] = useState(false);
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Administrative Sub-modals triggered from Dossier
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
    <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 text-right">
      {/* Executive Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
        <div>
          <span className="text-[10px] font-bold text-lord-gold tracking-widest uppercase">
            ENTERPRISE TALENT ROSTER • الموارد البشرية
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            دليل الكادر الوظيفي والعمليات
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            متابعة حالة الكادر اللحظية، مهام وطلبات اليوم، والتواصل السريع وإسناد المهام
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو البريد..."
            className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-obsidian-card border border-obsidian-border text-xs text-white placeholder-gray-500 focus:border-lord-gold outline-none"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Department & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-obsidian-card/80 p-1 rounded-2xl border border-obsidian-border">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-xl font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-lord-gold text-black font-black shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            الكل ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500 text-black font-black shadow-xs'
                : 'text-gray-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>مصرّح</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SUSPENDED')}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'SUSPENDED'
                ? 'bg-red-500 text-white font-black shadow-xs'
                : 'text-gray-400 hover:text-red-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>محظور</span>
          </button>
        </div>

        {/* Department Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'كافة الأقسام' },
            { id: 'TRADING', label: 'التداول' },
            { id: 'CONTENT_MEDIA', label: 'المحتوى' },
            { id: 'MARKETING', label: 'التسويق' },
            { id: 'DEVELOPMENT', label: 'البرمجة' }
          ].map(dept => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setDepartmentFilter(dept.id)}
              className={`px-3 py-1 rounded-xl font-bold transition-all whitespace-nowrap ${
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

      {/* Clean Minimalist Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(emp => (
          <EmployeeCard
            key={emp._id}
            emp={emp}
            onOpenTodayDetails={(selected) => {
              setSelectedEmployee(selected);
              setIsTodayDetailsOpen(true);
            }}
            onOpenQuickContact={(selected) => {
              setSelectedEmployee(selected);
              setIsQuickContactOpen(true);
            }}
            onOpenAssignTask={(selected) => {
              setSelectedEmployee(selected);
              setIsAssignTaskOpen(true);
            }}
            onOpenDossier={(selected) => {
              setSelectedEmployee(selected);
              setIsDossierOpen(true);
            }}
          />
        ))}
      </div>

      {/* 1. Modal: Today's Details (Tasks & Requests) */}
      <EmployeeTodayDetailsModal
        isOpen={isTodayDetailsOpen}
        onClose={() => setIsTodayDetailsOpen(false)}
        employee={selectedEmployee}
      />

      {/* 2. Modal: Quick Contact (Chat / Video / Phone) */}
      <QuickContactModal
        isOpen={isQuickContactOpen}
        onClose={() => setIsQuickContactOpen(false)}
        employee={selectedEmployee}
      />

      {/* 3. Modal: Assign Quick Task */}
      <AssignQuickTaskModal
        isOpen={isAssignTaskOpen}
        onClose={() => setIsAssignTaskOpen(false)}
        employee={selectedEmployee}
      />

      {/* 4. Modal: Master Administrative & Financial Dossier */}
      <EmployeeManagementDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        employee={selectedEmployee}
        onOpenSalaryAction={(emp) => {
          setSelectedEmployee(emp);
          setIsActionModalOpen(true);
        }}
        onOpenPayslip={(emp) => {
          setSelectedEmployee(emp);
          setIsPayslipOpen(true);
        }}
        onOpenSchedule={(emp) => {
          setSelectedEmployee(emp);
          setIsScheduleModalOpen(true);
        }}
        onOpenReport={(emp) => {
          setSelectedEmployee(emp);
          setIsReportModalOpen(true);
        }}
        onChangePassword={(emp) => {
          setSelectedEmployee(emp);
          setIsPasswordModalOpen(true);
        }}
        onSuspend={(emp) => {
          setSelectedEmployee(emp);
          setIsSuspendModalOpen(true);
        }}
        onDirectUnsuspend={handleDirectUnsuspend}
        onDeleteUser={(emp) => {
          setSelectedEmployee(emp);
          setIsDeleteModalOpen(true);
        }}
      />

      {/* Nested Action Modals */}
      <SalaryActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />

      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        employee={selectedEmployee}
      />

      <PayrollScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />

      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        employee={selectedEmployee}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />

      <SuspendEmployeeModal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />

      <DeleteEmployeeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        employee={selectedEmployee}
        onSuccess={refetch}
      />
    </div>
  );
}
