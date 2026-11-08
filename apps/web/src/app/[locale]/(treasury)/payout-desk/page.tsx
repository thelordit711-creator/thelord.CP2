'use client';

import React, { useState } from 'react';
import {
  useGetTreasuryOrdersQuery,
  useStartPayoutProcessingMutation,
  useConfirmPayoutDisbursedMutation
} from '../../../../store/api/treasuryApi';
import { IsolatedPayoutCard } from '../../../../components/treasury/IsolatedPayoutCard';
import { SegmentedVaultsOverview } from '../../../../components/treasury/SegmentedVaultsOverview';
import { Coins, Filter, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function PayoutDeskPage() {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const { data: response, isLoading, refetch } = useGetTreasuryOrdersQuery({
    status: filterStatus === 'ALL' ? undefined : filterStatus
  });

  const [startProcessing] = useStartPayoutProcessingMutation();
  const [confirmDisbursed] = useConfirmPayoutDisbursedMutation();

  const orders = response?.data || [];

  const handleStartProcessing = async (orderId: string) => {
    try {
      await startProcessing(orderId).unwrap();
      toast.info('تم بدء المعالجة وإشعار المستفيد بنجاح');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل في تحديث حالة المعالجة');
    }
  };

  const handleConfirmDisbursed = async (orderId: string, proofData: { txHashOrReferenceNumber: string }) => {
    try {
      await confirmDisbursed({ id: orderId, data: proofData }).unwrap();
      toast.success('تم تأكيد الصرف وخصم المبلغ من أرصدة الشركة تلقائياً!');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل في اعتماد الصرف');
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
      {/* Top Banner: Zero-Access Isolation Notice */}
      <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              شاشة الصندوق المركزية — وضع العزل التام (Zero-Access Isolation)
            </h4>
            <p className="text-xs text-amber-200/70 mt-0.5">
              هذه الشاشة مخصصة فقط لتنفيذ الحوالات المعتمدة عبر BEP20 USDT ومحافظ جيب وجوالي. لا تتضمن أي بيانات للمهام أو الدردشات.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
          title="تحديث الأوامر"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Segmented Sub-Vaults Overview */}
      <SegmentedVaultsOverview />

      {/* Screen Title & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-lord-gold" />
            <span>أوامر الصرف المعتمدة (Payout Desk)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            إجمالي الأوامر الحالية: {orders.length} أمر
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 p-1.5 bg-obsidian-surface rounded-2xl border border-obsidian-border text-xs">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'WAITING_TREASURY', label: 'جديد (بانتظار الصرف)' },
            { id: 'IN_PROGRESS', label: 'قيد التنفيذ' },
            { id: 'DISBURSED', label: 'تم الصرف' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterStatus === tab.id
                  ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24 text-lord-gold">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="mr-3 font-bold text-sm">جاري جلب أوامر الصرف...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-obsidian-card border border-obsidian-border rounded-3xl p-8">
          <Coins className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-gray-300">لا توجد أوامر صرف ضمن هذا التصنيف</h4>
          <p className="text-xs text-gray-500 mt-1">
            عند قيام المسؤول باعتماد طلب مالي أو راتب، سيظهر هنا فوراً.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map(order => (
            <IsolatedPayoutCard
              key={order._id}
              order={order}
              onStartProcessing={handleStartProcessing}
              onConfirmDisbursed={handleConfirmDisbursed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

