'use client';

import React, { useState } from 'react';
import { useGetAllEmployeesQuery, useGetMeQuery } from '../../../store/api/usersApi';
import {
  Users,
  Coins,
  Search,
  Wallet,
  Smartphone,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { SetEmployeeSalaryModal } from '../modals/SetEmployeeSalaryModal';

export const EmployeeLedgerSection: React.FC = () => {
  const { data: employeesRes, isLoading, refetch } = useGetAllEmployeesQuery();
  const { data: meRes } = useGetMeQuery();
  const employees = employeesRes?.data || [];

  const currentUserRole = meRes?.data?.accessRole || 'TREASURY';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  const filteredEmployees = employees.filter((emp: any) => {
    const matchesSearch =
      emp.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || emp.primaryDepartment === selectedDept;
    return matchesSearch && matchesDept;
  });

  const totalCommittedPayroll = employees.reduce(
    (sum: number, emp: any) => sum + (emp.compensation?.baseSalary || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-obsidian-card border border-lord-gold/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">إجمالي مسير الرواتب الشهري الملتزم به</span>
            <span className="text-xl font-black text-lord-gold font-mono mt-0.5">
              ${totalCommittedPayroll.toLocaleString()} USDT
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-lord-gold/15 text-lord-gold border border-lord-gold/30">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-obsidian-card border border-lord-gold/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">عدد الكادر المعتمد بالمنظومة</span>
            <span className="text-xl font-black text-lord-gold font-mono mt-0.5">
              {employees.length} موظف
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-lord-gold/15 text-lord-gold border border-lord-gold/30">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-obsidian-card border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-bold block">دورية استحقاق الرواتب المعتمدة</span>
            <span className="text-sm font-black text-gray-300 font-bold mt-0.5">
              يوم 1 من كل شهر ميلادي
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-gray-800 text-gray-300 border border-gray-700">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Department Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-obsidian-card border border-gray-800 rounded-2xl p-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="البحث بالاسم أو البريد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['ALL', 'TRADING', 'MARKETING', 'CONTENT', 'DEVELOPMENT', 'MANAGEMENT'].map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedDept === dept
                  ? 'bg-lord-gold text-black shadow-md'
                  : 'bg-obsidian-surface text-gray-400 hover:text-white'
              }`}
            >
              {dept === 'ALL'
                ? 'كافة الأقسام'
                : dept === 'TRADING'
                ? 'التداول'
                : dept === 'MARKETING'
                ? 'التسويق'
                : dept === 'CONTENT'
                ? 'المحتوى'
                : dept === 'DEVELOPMENT'
                ? 'البرمجة'
                : 'الإدارة'}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Table / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-400 font-mono">جاري تحميل سجل الموظفين المالي...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-12 text-center text-xs text-gray-400 border border-gray-800 rounded-3xl bg-obsidian-card">
          لا يوجد موظفون يطابقون معايير البحث
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp: any) => {
            const base = emp.compensation?.baseSalary || 0;
            const currency = emp.compensation?.salaryCurrency || 'USDT';
            const bonuses = emp.compensation?.activeBonuses || 0;
            const deductions = emp.compensation?.activeDeductions || 0;
            const advances = emp.compensation?.activeAdvances || 0;
            const netPayable = Math.max(0, base + bonuses - (deductions + advances));

            const prefMethod = emp.payoutMethods?.preferredMethod;
            const bep20 = emp.payoutMethods?.bep20Address;
            const phone =
              emp.payoutMethods?.jeebWallet?.registeredPhone ||
              emp.payoutMethods?.jawaliWallet?.registeredPhone ||
              emp.phoneNumber;

            return (
              <div
                key={emp._id}
                className="bg-obsidian-card border border-gray-800 hover:border-lord-gold/40 rounded-3xl p-5 shadow-lg space-y-4 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center font-bold text-xs text-lord-gold">
                      {emp.fullName ? emp.fullName.charAt(0) : 'U'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{emp.fullName}</h4>
                      <span className="text-[10px] text-gray-400 block">{emp.primaryDepartment || 'كادر معتمد'}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lord-gold/10 text-lord-gold border border-lord-gold/30">
                    يوم {emp.compensation?.payoutDayOfMonth || 1}
                  </span>
                </div>

                {/* Compensation Numbers */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-black/40 border border-gray-800/80">
                  <div>
                    <span className="text-[10px] text-gray-400 block">الراتب الشهري الأساسي</span>
                    <span className="text-sm font-black text-lord-gold font-mono">
                      ${base.toLocaleString()} {currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">صافي المستحق التقديري</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      ${netPayable.toLocaleString()} {currency}
                    </span>
                  </div>
                </div>

                {/* Sub-Ledger Indicators */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 rounded-xl bg-gray-900/60 border border-gray-800">
                    <span className="text-gray-400 block">مكافآت</span>
                    <span className="font-bold text-emerald-400 font-mono">+${bonuses}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-gray-900/60 border border-gray-800">
                    <span className="text-gray-400 block">سلف</span>
                    <span className="font-bold text-gray-300 font-mono">-${advances}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-gray-900/60 border border-gray-800">
                    <span className="text-gray-400 block">خصومات</span>
                    <span className="font-bold text-red-400 font-mono">-${deductions}</span>
                  </div>
                </div>

                {/* Payout Details */}
                <div className="p-2.5 rounded-xl bg-gray-900/40 border border-gray-800 text-[10px] text-gray-400 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1.5">
                    {prefMethod === 'BEP20_USDT' ? (
                      <Wallet className="w-3.5 h-3.5 text-lord-gold" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 text-lord-gold" />
                    )}
                    <span>{prefMethod === 'BEP20_USDT' ? 'BEP20 USDT' : 'محفظة محلية'}</span>
                  </span>
                  <span className="truncate max-w-[140px] text-white">
                    {prefMethod === 'BEP20_USDT' ? (bep20 ? `${bep20.slice(0, 6)}...${bep20.slice(-4)}` : 'غير محدد') : (phone || 'غير مسجل')}
                  </span>
                </div>

                {/* Action Button: Set Salary (Only visible & permitted for SUPER_ADMIN) */}
                <div className="pt-2 border-t border-gray-800/80">
                  {currentUserRole === 'SUPER_ADMIN' ? (
                    <Button
                      variant="surface"
                      size="sm"
                      onClick={() => setEditingEmployee(emp)}
                      className="w-full border border-lord-gold/40 text-lord-gold hover:bg-lord-gold/10 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5"
                    >
                      <Coins className="w-3.5 h-3.5 ml-1" />
                      <span>تحديد / تعديل الراتب 💵 (صلاحية المسؤول)</span>
                    </Button>
                  ) : (
                    <div className="py-2 px-3 rounded-xl bg-gray-900/60 border border-gray-800/60 text-center text-[10px] text-gray-500 font-mono">
                      🔒 صلاحية تعديل الراتب محصورة بالمدير العام فقط (لأمين الصندوق حق الصرف فقط)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Salary Modal */}
      <SetEmployeeSalaryModal
        employee={editingEmployee}
        isOpen={Boolean(editingEmployee)}
        onClose={() => setEditingEmployee(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

