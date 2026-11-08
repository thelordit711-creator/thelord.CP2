'use client';

import React from 'react';
import {
  DollarSign,
  FileText,
  Calendar,
  Coins,
  Key,
  Ban,
  UserCheck,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';

interface EmployeeCardProps {
  emp: any;
  onManageLedger: (emp: any) => void;
  onViewPayslip: (emp: any) => void;
  onOpenSchedule: (emp: any) => void;
  onOpenReport: (emp: any) => void;
  onChangePassword: (emp: any) => void;
  onSuspend: (emp: any) => void;
  onDirectUnsuspend: (emp: any) => void;
  onDeleteUser: (emp: any) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  emp,
  onManageLedger,
  onViewPayslip,
  onOpenSchedule,
  onOpenReport,
  onChangePassword,
  onSuspend,
  onDirectUnsuspend,
  onDeleteUser
}) => {
  const calculateNetSalary = (comp: any) => {
    const base = comp?.baseSalary || 0;
    const bonus = comp?.activeBonuses || 0;
    const ded = comp?.activeDeductions || 0;
    const adv = comp?.activeAdvances || 0;
    return base + bonus - ded - adv;
  };

  const net = calculateNetSalary(emp.compensation);

  return (
    <div className="bg-obsidian-card border border-obsidian-border hover:border-lord-gold/40 rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between text-right">
      <div>
        {/* Employee Header */}
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lord-gold/20 to-amber-700/20 border border-lord-gold/40 flex items-center justify-center font-bold text-lord-gold text-lg shrink-0">
              {emp.fullName?.charAt(0) || '👤'}
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
            <Badge variant="gold">{emp.primaryDepartment || 'عام'}</Badge>
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
            onClick={() => onManageLedger(emp)}
            className="flex items-center justify-center gap-1 rounded-xl text-xs"
          >
            <DollarSign className="w-3.5 h-3.5 ml-1" />
            <span>إدارة المستحقات</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewPayslip(emp)}
            className="flex items-center justify-center gap-1 text-gray-300 border-gray-700 hover:border-gray-600 rounded-xl text-xs"
          >
            <FileText className="w-3.5 h-3.5 ml-1" />
            <span>كشف الراتب</span>
          </Button>
          <button
            type="button"
            onClick={() => onOpenSchedule(emp)}
            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-lord-gold/15 hover:bg-lord-gold text-lord-gold hover:text-obsidian-primary border border-lord-gold/40 text-xs font-bold transition-all"
          >
            <Calendar className="w-3.5 h-3.5 ml-0.5" />
            <span>تجزئة الراتب والبدلات 📅</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenReport(emp)}
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
              onClick={() => onChangePassword(emp)}
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
                if (emp.isSuspended) {
                  onDirectUnsuspend(emp);
                } else {
                  onSuspend(emp);
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
                  <span>فك الحظر وإتاحة الدخول 🟢</span>
                </>
              ) : (
                <>
                  <Ban className="w-3 h-3 text-red-400" />
                  <span>إيقاف وحظر ⛔</span>
                </>
              )}
            </button>

            {/* Delete Account Permanently */}
            <button
              type="button"
              onClick={() => onDeleteUser(emp)}
              className="p-1.5 rounded-xl bg-red-950/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 transition-all shadow-xs"
              title="حذف هذا الموظف نهائياً من المنظومة"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

