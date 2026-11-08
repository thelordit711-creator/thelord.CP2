'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface PersonalStatementTabProps {
  statement: any[];
}

export const PersonalStatementTab: React.FC<PersonalStatementTabProps> = ({ statement }) => {
  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 space-y-4 text-right">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <span>كشف حساب المستحقات والعمليات المالية</span>
        </h3>
        <span className="text-xs text-gray-400">سجل شفاف لكل الحركات المالية</span>
      </div>

      {statement.length === 0 ? (
        <div className="text-center py-12 text-xs text-gray-500">
          لا توجد قيود مسجلة في كشف حسابك حتى الآن.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">وسيلة الدفع</th>
                <th className="py-3 px-4">البيان والسبب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {statement.map((entry: any) => (
                <tr key={entry._id} className="hover:bg-obsidian-surface/50">
                  <td className="py-3 px-4 text-gray-400 font-mono">
                    {new Date(entry.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        entry.entryType === 'BONUS' || entry.entryType === 'BASE_SALARY'
                          ? 'disbursed'
                          : entry.entryType === 'WARNING'
                          ? 'danger'
                          : 'processing'
                      }
                    >
                      {entry.entryType}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    {entry.amount ? `${entry.amount} USDT` : '—'}
                  </td>
                  <td className="py-3 px-4 text-cyber-blue font-mono">
                    {entry.payoutMethodUsed}
                  </td>
                  <td className="py-3 px-4 text-gray-300">{entry.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
