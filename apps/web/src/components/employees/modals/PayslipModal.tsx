'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Printer, X } from 'lucide-react';

interface PayslipModalProps {
  employee: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  employee,
  isOpen,
  onClose
}) => {
  if (!employee) return null;

  const calculateNetSalary = (compensation: any) => {
    if (!compensation) return 0;
    const base = Number(compensation.baseSalary || 0);
    const bonuses = Number(compensation.activeBonuses || 0);
    const deductions = Number(compensation.activeDeductions || 0);
    const advances = Number(compensation.activeAdvances || 0);
    return Math.max(0, base + bonuses - deductions - advances);
  };

  const netSalary = calculateNetSalary(employee.compensation);

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
        {/* Header with Lion Crown Brand */}
        <div className="flex items-center justify-between border-b border-lord-gold/30 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-lord-gold shadow-gold-glow shrink-0 flex items-center justify-center bg-obsidian-card">
              <img
                src="/logo.png"
                alt="THE LORD SYSTEM"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wider">
                THE LORD SYSTEM
              </h2>
              <p className="text-xs text-lord-gold font-mono">OFFICIAL SALARY PAYSLIP & LEDGER</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400 font-mono">
            <div>التاريخ: {new Date().toLocaleDateString('ar-YE')}</div>
            <div className="text-emerald-400 font-bold">الحالة: معتمد رسمي</div>
          </div>
        </div>

        {/* Employee Info */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-obsidian-card p-4 rounded-2xl border border-gray-800">
          <div>
            <span className="text-gray-400">اسم الموظف: </span>
            <strong className="text-white text-sm">{employee.fullName}</strong>
          </div>
          <div>
            <span className="text-gray-400">القسم: </span>
            <strong className="text-lord-gold">{employee.primaryDepartment}</strong>
          </div>
          <div>
            <span className="text-gray-400">وسيلة الصرف: </span>
            <strong className="text-sky-400 font-mono">{employee.payoutMethods?.preferredMethod || 'BEP20_USDT'}</strong>
          </div>
          <div>
            <span className="text-gray-400">يوم الصرف الشهري: </span>
            <strong className="text-white">يوم {employee.compensation?.payoutDayOfMonth || 1} من كل شهر</strong>
          </div>
        </div>

        {/* Calculation Table */}
        <div className="border border-gray-800 rounded-2xl overflow-hidden text-xs">
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
                <td className="py-2.5 px-4 text-left font-mono">${employee.compensation?.baseSalary || 0}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-emerald-400">+ المكافآت والحوافز</td>
                <td className="py-2.5 px-4 text-gray-400">إنجاز المهام والمراحل المعتمدة</td>
                <td className="py-2.5 px-4 text-left font-mono text-emerald-400">+${employee.compensation?.activeBonuses || 0}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-red-400">- الخصومات الإدارية</td>
                <td className="py-2.5 px-4 text-gray-400">تأخيرات أو جزاءات مسجلة</td>
                <td className="py-2.5 px-4 text-left font-mono text-red-400">-${employee.compensation?.activeDeductions || 0}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-amber-400">- السلف المستلمة</td>
                <td className="py-2.5 px-4 text-gray-400">سلف مخصومة من الراتب</td>
                <td className="py-2.5 px-4 text-left font-mono text-amber-400">-${employee.compensation?.activeAdvances || 0}</td>
              </tr>
            </tbody>
            <tfoot className="bg-lord-gold/15 border-t border-lord-gold/30">
              <tr>
                <td colSpan={2} className="py-3 px-4 font-black text-white text-sm">
                  صافي المستحق النهائي القابل للصرف:
                </td>
                <td className="py-3 px-4 text-left font-mono text-base font-black text-lord-gold">
                  ${netSalary.toLocaleString()} USDT
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
              onClick={onClose}
            >
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </AppModalPortal>
  );
};
