'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import {
  FileText,
  Printer,
  Calendar,
  DollarSign,
  Coins,
  CheckCircle,
  Clock,
  X,
  Receipt,
  Download
} from 'lucide-react';
import { useGetMonthlyReportQuery } from '../../../store/api/financeApi';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const { data: reportRes, isLoading, refetch } = useGetMonthlyReportQuery(
    {
      employeeId: employee?._id,
      year: selectedYear,
      month: selectedMonth
    },
    { skip: !isOpen || !employee?._id }
  );

  if (!employee) return null;

  const report = reportRes?.data;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    const rows: (string | number)[][] = [
      ['كشف الحساب المالي الرسمي للموظف', employee.fullName],
      ['الشهر / السنة', `${selectedMonth} / ${selectedYear}`],
      ['الراتب الأساسي المعتمد', report.baseSalary],
      ['إجمالي الدفعات المصروفة', report.totalDisbursed],
      ['إجمالي البدلات المصروفة', report.totalAllowances],
      ['إجمالي المكافآت والحوافز', report.totalBonuses],
      ['إجمالي الخصومات', report.totalDeductions],
      ['صافي المستحق النهائي', report.netPayable],
      [],
      ['التاريخ أو اليوم', 'البيان والنوع', 'المبلغ (USDT)', 'الحالة']
    ];

    report.tranches?.forEach((t: any) => {
      rows.push([
        `يوم ${t.day} في الشهر`,
        `الدفعة ${t.trancheNumber} من الراتب`,
        t.amount,
        t.status === 'DISBURSED' ? 'تم الصرف ✓' : 'بانتظار الصرف'
      ]);
    });

    report.allowances?.forEach((a: any) => {
      rows.push([
        `يوم ${a.disbursementDay} في الشهر`,
        a.title,
        a.amount,
        'بدل دوري'
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TheLord-Payroll-${employee.fullName.replace(/\s+/g, '_')}-${selectedYear}-${selectedMonth}.csv`;
    link.click();
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-3xl">
      <div className="bg-obsidian-surface border-2 border-lord-gold/60 rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[92dvh] overflow-y-auto space-y-6 print:bg-white print:text-black print:border-none">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lord-gold/15 text-lord-gold border border-lord-gold/30 flex items-center justify-center font-bold print:hidden">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white print:text-black">
                تقرير الصندوق المالي وكشف الحساب الشهري
              </h3>
              <p className="text-xs text-gray-400 print:text-gray-700">
                الموظف: <strong className="text-white print:text-black">{employee.fullName}</strong> ({employee.primaryDepartment || 'كادر TheLord'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs text-lord-gold border-lord-gold/40 hover:bg-lord-gold/10"
            >
              <Download className="w-3.5 h-3.5 ml-1" />
              <span>تصدير Excel/CSV</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs text-lord-gold border-lord-gold/40 hover:bg-lord-gold/10"
            >
              <Printer className="w-3.5 h-3.5 ml-1" />
              <span>طباعة الكشف</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Period Selector (Hidden when printing) */}
        <div className="flex items-center justify-between gap-3 bg-obsidian-card p-3 rounded-2xl border border-gray-800 print:hidden">
          <span className="text-xs font-bold text-gray-300">تحديد الفترة المحاسبية:</span>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  شهر {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  سنة {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Metric Cards */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-400">جاري تجميع بيانات الكشف الشهري...</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-obsidian-card border border-lord-gold/30 print:border-gray-300">
                <span className="text-[10px] text-gray-400 block print:text-gray-600">الراتب الشهري المعتمد</span>
                <span className="text-base sm:text-lg font-black text-lord-gold font-mono print:text-black">
                  ${report?.baseMonthlySalary ?? 0}
                </span>
                <span className="text-[9px] text-gray-500 block">
                  {report?.cycleType === 'EVERY_10_DAYS' ? 'نظام الـ 10 أيام (3 دفعات)' : 'دفعة شهرية'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-card border border-emerald-500/30 print:border-gray-300">
                <span className="text-[10px] text-gray-400 block print:text-gray-600">إجمالي المصروف فعلياً</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 font-mono print:text-black">
                  ${report?.totalDisbursed ?? 0}
                </span>
                <span className="text-[9px] text-emerald-500 block">تم تحويله بنجاح</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-card border border-gray-800 print:border-gray-300">
                <span className="text-[10px] text-gray-400 block print:text-gray-600">البدلات المقررة (نت/اتصالات)</span>
                <span className="text-base sm:text-lg font-black text-white font-mono print:text-black">
                  ${(report?.allowances || []).reduce((s: number, a: any) => s + (a.isActive ? a.amount : 0), 0)}
                </span>
                <span className="text-[9px] text-gray-500 block">بدلات دورية</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-card border border-amber-500/30 print:border-gray-300">
                <span className="text-[10px] text-gray-400 block print:text-gray-600">أوامر صرف معلقة</span>
                <span className="text-base sm:text-lg font-black text-amber-400 font-mono print:text-black">
                  ${report?.totalPending ?? 0}
                </span>
                <span className="text-[9px] text-amber-500 block">بانتظار الصندوق</span>
              </div>
            </div>

            {/* Payout Orders Detail Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 print:text-black">
                <Receipt className="w-4 h-4 text-lord-gold" />
                <span>سجل عمليات وأوامر الصرف المنفذة لهذا الشهر ({report?.payoutOrders?.length || 0}):</span>
              </h4>

              {(!report?.payoutOrders || report.payoutOrders.length === 0) ? (
                <div className="p-6 rounded-2xl bg-obsidian-card border border-gray-800 text-center text-xs text-gray-500 print:text-gray-700">
                  لا توجد عمليات صرف مسجلة لهذا الموظف خلال هذا الشهر.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-800 print:border-black">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-obsidian-card border-b border-gray-800 text-gray-400 print:bg-gray-100 print:text-black">
                        <th className="py-2.5 px-3">التاريخ</th>
                        <th className="py-2.5 px-3">البيان</th>
                        <th className="py-2.5 px-3">التصنيف</th>
                        <th className="py-2.5 px-3">المبلغ</th>
                        <th className="py-2.5 px-3">الوسيلة</th>
                        <th className="py-2.5 px-3">الحالة</th>
                        <th className="py-2.5 px-3">تأكيد الاستلام</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 print:divide-gray-300">
                      {report.payoutOrders.map((order: any) => (
                        <tr key={order._id} className="hover:bg-obsidian-card/40">
                          <td className="py-2.5 px-3 text-gray-400 font-mono text-[11px] print:text-black">
                            {new Date(order.createdAt).toLocaleDateString('ar-YE')}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white print:text-black">
                            {order.summaryForTreasury}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[10px] text-lord-gold">
                              {order.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-white print:text-black">
                            ${order.amount} {order.currency}
                          </td>
                          <td className="py-2.5 px-3 text-gray-300 font-mono text-[11px] print:text-black">
                            {order.payoutMethod}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                order.executionStatus === 'DISBURSED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {order.executionStatus === 'DISBURSED' ? 'تم الصرف ✓' : 'معلق للصرف'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {order.employeeConfirmation?.isConfirmed ? (
                              <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>مؤكد الاستلام</span>
                              </span>
                            ) : (
                              <span className="text-gray-500 text-[10px]">لم يؤكد بعد</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Official Footer for Print */}
            <div className="pt-4 border-t border-gray-800 text-[10px] text-gray-500 flex items-center justify-between print:text-black print:border-black">
              <span>تم استخراج هذا التقرير آلياً عبر الصندوق المالي لمنظومة TheLord ERP</span>
              <span className="font-mono">Date: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>
    </AppModalPortal>
  );
};

