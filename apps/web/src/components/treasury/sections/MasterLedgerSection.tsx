'use client';

import React, { useState } from 'react';
import {
  useGetAllTransactionsQuery,
  useRecalculateVaultMutation
} from '../../../store/api/treasuryApi';
import {
  Table,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Edit3,
  Trash2,
  Calendar,
  Layers,
  Coins,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { ConfirmDeleteTransactionModal } from '../modals/ConfirmDeleteTransactionModal';
import { lordToast } from '../../../lib/lordToast';

export const MasterLedgerSection: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: response, isLoading, refetch } = useGetAllTransactionsQuery({
    type: filterType === 'ALL' ? undefined : filterType,
    category: filterCategory === 'ALL' ? undefined : filterCategory,
    search: searchQuery.trim() || undefined
  });

  const [recalculateVault, { isLoading: isRecalculating }] = useRecalculateVaultMutation();

  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<any | null>(null);

  const transactions = response?.data || [];

  const handleRecalculate = async () => {
    try {
      await recalculateVault().unwrap();
      lordToast.success(
        'تم تدقيق واحتساب الأرصدة بنجاح',
        'تمت إعادة احتساب كافة أرصدة الميزانية والصناديق من العمليات الحقيقية الفعلية ⚡'
      );
      refetch();
    } catch (err: any) {
      lordToast.error('فشل التدقيق', err?.data?.error || 'حدث خطأ أثناء إعادة الاحتساب');
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header & Sync Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-obsidian-card border border-lord-gold/30 rounded-3xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-lord-gold" />
            <h3 className="text-base sm:text-lg font-black text-white">
              دفتر الأستاذ والعمليات الشاملة (سجل التدقيق والحذف المتسلسل)
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            كشف محاسبي موحد لكافة عمليات الإيداع، الصرف، وتغذية الصناديق مع ميزة التعديل والحذف المتسلسل للأثر المالي.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="surface"
            size="sm"
            onClick={handleRecalculate}
            isLoading={isRecalculating}
            className="border border-lord-gold/40 text-lord-gold hover:bg-lord-gold/10 text-xs font-bold rounded-2xl flex items-center gap-1.5"
            title="إعادة احتساب الأرصدة تلقائياً من العمليات"
          >
            <RefreshCw className="w-3.5 h-3.5 ml-1" />
            <span>تدقيق واحتساب الأرصدة الحقيقية ⚡</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-obsidian-card border border-gray-800 rounded-2xl p-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالبيان، المستفيد، أو المرجع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1222] border border-gray-700 focus:border-lord-gold rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'كافة العمليات' },
            { id: 'PAYOUT', label: 'سندات صرف 💸' },
            { id: 'DEPOSIT', label: 'إيداعات رأس مال 📥' },
            { id: 'TRANSFER', label: 'تغذية وتحويل داخلي 🔄' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                filterType === tab.id
                  ? 'bg-lord-gold text-black shadow-md'
                  : 'bg-obsidian-surface text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-400 font-mono">
          جاري استخراج دفتر العمليات وتدقيق الحسابات...
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 text-center text-xs text-gray-400 border border-gray-800 rounded-3xl bg-obsidian-card">
          لا توجد عمليات تطابق معايير الفلترة المحددة
        </div>
      ) : (
        <div className="bg-obsidian-card border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-gray-900/70 border-b border-gray-800 text-gray-400 font-bold">
                  <th className="p-3.5">نوع العملية</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5">المبلغ</th>
                  <th className="p-3.5">الصندوق المتأثر</th>
                  <th className="p-3.5">المستفيد / المنفذ</th>
                  <th className="p-3.5">البيان والمرجع</th>
                  <th className="p-3.5 text-center">إجراءات المدير (تعديل / حذف)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {transactions.map((tx: any) => {
                  const isPayout = tx.type === 'PAYOUT';
                  const isDeposit = tx.type === 'DEPOSIT';
                  const isTransfer = tx.type === 'TRANSFER';

                  return (
                    <tr key={tx._id} className="hover:bg-gray-800/30 transition-colors">
                      {/* Type Badge */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isPayout
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : isDeposit
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-lord-gold/10 text-lord-gold border-lord-gold/30'
                          }`}
                        >
                          {isPayout ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>سند صرف</span>
                            </>
                          ) : isDeposit ? (
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              <span>إيداع ميزانية</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              <span>تغذية وتحويل</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 font-mono text-gray-400 text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 font-mono font-black text-sm">
                        <span
                          className={
                            isPayout
                              ? 'text-amber-400'
                              : isDeposit
                              ? 'text-emerald-400'
                              : 'text-lord-gold'
                          }
                        >
                          {isPayout ? '-' : '+'}${tx.amount.toLocaleString()} {tx.currency}
                        </span>
                      </td>

                      {/* Target Vault */}
                      <td className="p-3.5 text-gray-300 font-bold text-[11px]">
                        {tx.targetVault}
                      </td>

                      {/* Beneficiary */}
                      <td className="p-3.5">
                        <div className="font-bold text-white text-[11px]">{tx.beneficiaryName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          بواسطة: {tx.executedBy}
                        </div>
                      </td>

                      {/* Description & Reference */}
                      <td className="p-3.5 max-w-xs">
                        <div className="text-gray-300 font-bold truncate text-[11px]" title={tx.description}>
                          {tx.description}
                        </div>
                        {tx.referenceNumber && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[180px]">
                            مرجع: {tx.referenceNumber}
                          </div>
                        )}
                        {tx.modificationRequest?.status === 'PENDING' && (
                          <div className="text-[10px] text-amber-400 font-bold animate-pulse mt-0.5">
                            ⚠️ طلب تعديل من المحاسب: {tx.modificationRequest.reason}
                          </div>
                        )}
                      </td>

                      {/* Admin Actions: Edit & Delete */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(tx)}
                            className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-lord-gold hover:bg-gray-700 transition-colors"
                            title="تعديل القيد وضبط الأرصدة المتسلسلة"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTransaction(tx)}
                            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                            title="حذف القيد وعكس الأثر المالي"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteTransactionModal
        transaction={deletingTransaction}
        isOpen={Boolean(deletingTransaction)}
        onClose={() => setDeletingTransaction(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

