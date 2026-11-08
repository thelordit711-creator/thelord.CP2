'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import {
  User,
  DollarSign,
  Calendar,
  Wallet,
  Shield,
  FileText,
  Key,
  Ban,
  UserCheck,
  Trash2,
  X,
  Coins,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Badge } from '../../ui/Badge';

interface EmployeeManagementDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  onOpenSalaryAction: (emp: any) => void;
  onOpenPayslip: (emp: any) => void;
  onOpenSchedule: (emp: any) => void;
  onOpenReport: (emp: any) => void;
  onChangePassword: (emp: any) => void;
  onSuspend: (emp: any) => void;
  onDirectUnsuspend: (emp: any) => void;
  onDeleteUser: (emp: any) => void;
}

type Tab = 'COMPENSATION' | 'ALLOWANCES' | 'WALLETS' | 'SECURITY';

export const EmployeeManagementDossierModal: React.FC<EmployeeManagementDossierModalProps> = ({
  isOpen,
  onClose,
  employee,
  onOpenSalaryAction,
  onOpenPayslip,
  onOpenSchedule,
  onOpenReport,
  onChangePassword,
  onSuspend,
  onDirectUnsuspend,
  onDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('COMPENSATION');

  if (!isOpen || !employee) return null;

  const comp = employee.compensation || {};
  const baseSalary = comp.baseSalary || 0;
  const currency = comp.salaryCurrency || 'USDT';
  const bonus = comp.activeBonuses || 0;
  const ded = comp.activeDeductions || 0;
  const adv = comp.activeAdvances || 0;
  const netSalary = baseSalary + bonus - ded - adv;

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl bg-[#0a0d16] border border-amber-500/40 rounded-3xl shadow-2xl p-5 sm:p-6 text-white text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xl">
              {employee.fullName?.charAt(0) || '👤'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{employee.fullName}</h3>
                <Badge variant="gold">{employee.primaryDepartment || 'كادر معتمد'}</Badge>
              </div>
              <p className="text-xs text-gray-400 font-mono">{employee.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-gray-800 pb-3 mb-4 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('COMPENSATION')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'COMPENSATION'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>الراتب وصرف الـ 10 أيام</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALLOWANCES')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ALLOWANCES'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>البدلات والمكافآت</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WALLETS')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'WALLETS'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>المحافظ والتحويل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SECURITY')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'SECURITY'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>الأمان والإجراءات</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="min-h-[220px]">
          {/* TAB 1: COMPENSATION */}
          {activeTab === 'COMPENSATION' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-gray-900/80 border border-gray-800">
                  <div className="text-[10px] text-gray-400">الراتب الأساسي</div>
                  <div className="text-sm font-black text-amber-400 font-mono mt-0.5">
                    {baseSalary} {currency}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-900/80 border border-gray-800">
                  <div className="text-[10px] text-gray-400">المكافآت النشطة</div>
                  <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                    +{bonus} {currency}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-900/80 border border-gray-800">
                  <div className="text-[10px] text-gray-400">الخصومات / السلف</div>
                  <div className="text-sm font-black text-rose-400 font-mono mt-0.5">
                    -{ded + adv} {currency}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="text-[10px] text-amber-300">صافي الاستحقاق</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">
                    {netSalary} {currency}
                  </div>
                </div>
              </div>

              {/* Tranche Info */}
              <div className="p-3 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">نظام تجزئة الراتب (كل 10 أيام)</div>
                  <div className="text-[10px] text-gray-400">
                    دفعة كل 10 أيام في الشهر • {(netSalary / 3).toFixed(1)} {currency} لكل دفعة
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSchedule(employee);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-all"
                >
                  جدول وتجزئة الصرف ⚡
                </button>
              </div>

              {/* Payslip & Monthly Report Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPayslip(employee);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>عرض مسير الراتب (Payslip)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReport(employee);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>التقرير المالي الشهري</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ALLOWANCES & LEDGER ACTIONS */}
          {activeTab === 'ALLOWANCES' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-gray-900/60 border border-gray-800">
                <div className="text-xs font-bold text-white mb-1">المصروفات الدورية والبدلات الثابتة</div>
                <div className="text-[11px] text-gray-400 leading-relaxed">
                  بدل إنترنت شهري، بدل نقل، أو بدلات إضافية محددة التاريخ تصرف تلقائياً من الصندوق كل شهر.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSalaryAction(employee);
                  }}
                  className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>إضافة مكافأة أو بدل ⚡</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSalaryAction(employee);
                  }}
                  className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <DollarSign className="w-4 h-4 text-rose-400" />
                  <span>تسجيل خصم أو سلفة</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: WALLETS */}
          {activeTab === 'WALLETS' && (
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-gray-900/60 border border-gray-800">
                <div className="text-xs font-bold text-white mb-0.5">محفظة USDT (شبكة BEP20)</div>
                <div className="text-[11px] text-gray-300 font-mono break-all">
                  {employee.payoutMethods?.bep20Address || 'لم يتم تسجيل عنوان محفظة مشفرة'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-900/60 border border-gray-800">
                <div className="text-xs font-bold text-white mb-0.5">محفظة جيب (Jeeb Wallet)</div>
                <div className="text-[11px] text-gray-300 font-mono">
                  {employee.payoutMethods?.jeebWallet?.registeredPhone
                    ? `رقم: ${employee.payoutMethods.jeebWallet.registeredPhone} • ${employee.payoutMethods.jeebWallet.accountHolderName}`
                    : 'غير مفعلة'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-900/60 border border-gray-800">
                <div className="text-xs font-bold text-white mb-0.5">محفظة جوالي (Jawali Wallet)</div>
                <div className="text-[11px] text-gray-300 font-mono">
                  {employee.payoutMethods?.jawaliWallet?.registeredPhone
                    ? `رقم: ${employee.payoutMethods.jawaliWallet.registeredPhone} • ${employee.payoutMethods.jawaliWallet.accountHolderName}`
                    : 'غير مفعلة'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & ACTIONS */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChangePassword(employee);
                }}
                className="w-full p-3 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-bold text-white flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>تغيير كلمة المرور الخاصة بالموظف</span>
                </div>
                <span className="text-[10px] text-gray-400">إعادة تعيين</span>
              </button>

              {employee.isSuspended ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDirectUnsuspend(employee);
                  }}
                  className="w-full p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>فك حظر الموظف وإعادة تفعيل حسابه</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">تفعيل فوري</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSuspend(employee);
                  }}
                  className="w-full p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-amber-400" />
                    <span>تعليق أو حظر حساب الموظف مؤقتاً</span>
                  </div>
                  <span className="text-[10px] text-amber-400">إيقاف الجلسة</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteUser(employee);
                }}
                className="w-full p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>حذف حساب الموظف نهائياً من المنظومة</span>
                </div>
                <span className="text-[10px] text-rose-400">حذف نهائي</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all"
          >
            إغلاق الملف
          </button>
        </div>
      </div>
    </AppModalPortal>
  );
};

