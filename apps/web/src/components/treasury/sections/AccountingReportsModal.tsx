'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { useGetAccountingReportsQuery } from '../../../store/api/treasuryApi';
import {
  BarChart3,
  X,
  Printer,
  Download,
  Wallet,
  TrendingUp,
  FileSpreadsheet,
  Coins,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../../ui/Button';

interface AccountingReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountingReportsModal: React.FC<AccountingReportsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { data: reportsRes, isLoading } = useGetAccountingReportsQuery(undefined, {
    skip: !isOpen
  });

  const report = reportsRes?.data;
  const overview = report?.vaultOverview;
  const categories = report?.categoryBreakdown;
  const customVaults = report?.customSubVaults || [];

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-4xl">
      <div className="bg-[#090c15] border-2 border-lord-gold/30 rounded-3xl p-6 sm:p-8 text-white text-right space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">التقرير المالي والمحاسبي الشامل</h3>
              <p className="text-xs text-gray-400">كشوفات المصروفات لكل فئة وتوزيع سيولة الصناديق</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="طباعة التقرير"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 font-mono">
            جاري استخراج البيانات والحسابات الدفترية...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Quick Figures */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-gray-800">
                <span className="text-[11px] text-gray-400 block font-bold">رصيد الميزانية العامة</span>
                <span className="text-base font-black text-lord-gold font-mono mt-0.5">
                  ${(overview?.generalBudget ?? 0).toLocaleString()} USDT
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-gray-800">
                <span className="text-[11px] text-gray-400 block font-bold">رصيد صندوق الصرف</span>
                <span className="text-base font-black text-lord-gold font-mono mt-0.5">
                  ${(overview?.treasuryBalance ?? 0).toLocaleString()} USDT
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-gray-800">
                <span className="text-[11px] text-gray-400 block font-bold">إجمالي المصروفات المنفذة</span>
                <span className="text-base font-black text-emerald-400 font-mono mt-0.5">
                  ${(overview?.totalDisbursedAllTime ?? 0).toLocaleString()} USDT
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-obsidian-surface border border-gray-800">
                <span className="text-[11px] text-gray-400 block font-bold">الرواتب الشهرية الملتزم بها</span>
                <span className="text-base font-black text-amber-400 font-mono mt-0.5">
                  ${(overview?.monthlyCommittedPayroll ?? 0).toLocaleString()} USDT
                </span>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-lord-gold" />
                <span>كشف إجمالي المصروفات المصنفة حسب الفئة المحاسبية:</span>
              </h4>

              <div className="bg-obsidian-card border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-gray-900/60 border-b border-gray-800 text-gray-400 font-bold">
                      <th className="p-3.5">الفئة المحاسبية</th>
                      <th className="p-3.5">الصندوق المرتبط</th>
                      <th className="p-3.5">إجمالي المنصرف الفعلي</th>
                      <th className="p-3.5">النسبة من إجمالي الصرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {[
                      {
                        title: 'الرواتب والأجور الشهرية (SALARY)',
                        vault: 'صندوق الرواتب',
                        amount: categories?.salaries ?? 0,
                        color: 'text-amber-400'
                      },
                      {
                        title: 'المكافآت وحوافز الإنجاز (BONUS)',
                        vault: 'صندوق الرواتب',
                        amount: categories?.bonuses ?? 0,
                        color: 'text-emerald-400'
                      },
                      {
                        title: 'السلفيات والقروض المؤقتة (ADVANCE)',
                        vault: 'صندوق الرواتب',
                        amount: categories?.advances ?? 0,
                        color: 'text-blue-400'
                      },
                      {
                        title: 'الإعلانات وترويج قنوات التليجرام (ADS)',
                        vault: 'صندوق التسويق',
                        amount: categories?.ads ?? 0,
                        color: 'text-lord-gold'
                      },
                      {
                        title: 'الاشتراكات البرمجية والتطبيقات (SOFTWARE)',
                        vault: 'صندوق الاحتياطي',
                        amount: categories?.software ?? 0,
                        color: 'text-gray-300'
                      },
                      {
                        title: 'المصروفات التشغيلية والبدلات (OTHER)',
                        vault: 'صندوق الاحتياطي',
                        amount: categories?.other ?? 0,
                        color: 'text-gray-300'
                      }
                    ].map((cat, idx) => {
                      const totalDisbursed = overview?.totalDisbursedAllTime || 1;
                      const percentage = Math.round((cat.amount / totalDisbursed) * 100);

                      return (
                        <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                          <td className="p-3.5 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-lord-gold" />
                            <span>{cat.title}</span>
                          </td>
                          <td className="p-3.5 text-gray-400">{cat.vault}</td>
                          <td className={`p-3.5 font-black font-mono ${cat.color}`}>
                            ${cat.amount.toLocaleString()} USDT
                          </td>
                          <td className="p-3.5 font-mono text-gray-400">
                            {cat.amount > 0 ? `${percentage}%` : '0%'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Vaults Overview if any */}
            {customVaults.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-white">الصناديق الفرعية المخصصة المنشأة:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customVaults.map((v: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-gray-900/50 border border-gray-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">{v.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">الكود: {v.code}</span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-gray-400 block">الرصيد</span>
                        <span className="text-xs font-bold text-lord-gold">${(v.balance || 0).toLocaleString()} USDT</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white"
          >
            إغلاق التقرير
          </button>
        </div>
      </div>
    </AppModalPortal>
  );
};

