'use client';

import React, { useState } from 'react';
import { IPayoutOrder } from '@lord/shared-types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Copy, Check, QrCode, Smartphone, Coins, CheckCircle, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface IsolatedPayoutCardProps {
  order: IPayoutOrder;
  onStartProcessing: (orderId: string) => Promise<void>;
  onConfirmDisbursed: (orderId: string, proofData: { txHashOrReferenceNumber: string }) => Promise<void>;
}

export const IsolatedPayoutCard: React.FC<IsolatedPayoutCardProps> = ({
  order,
  onStartProcessing,
  onConfirmDisbursed
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [referenceInput, setReferenceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBEP20 = order.payoutMethod === 'BEP20_USDT';
  const isJeeb = order.payoutMethod === 'JEEB_WALLET';
  const isJawali = order.payoutMethod === 'JAWALI_WALLET';

  const beneficiaryName = typeof order.beneficiaryId === 'object'
    ? (order.beneficiaryId as any)?.fullName
    : 'عضو الفريق';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`تم نسخ ${label} بنجاح!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartProcessing = async () => {
    try {
      setIsSubmitting(true);
      await onStartProcessing(order._id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceInput.trim()) {
      toast.error('يرجى إدخال رقم العملية (TxHash أو رقم الحوالة) للاعتماد');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmDisbursed(order._id, {
        txHashOrReferenceNumber: referenceInput.trim()
      });
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-obsidian-card border border-obsidian-border hover:border-lord-gold/30 transition-all rounded-2xl p-5 shadow-lg relative flex flex-col justify-between">
      {/* Header: Status and Amount */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {order.executionStatus === 'WAITING_TREASURY' && (
              <Badge variant="gold" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>جديد بانتظار الصرف</span>
              </Badge>
            )}
            {order.executionStatus === 'IN_PROGRESS' && (
              <Badge variant="processing" className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>قيد التنفيذ الآن</span>
              </Badge>
            )}
            {order.executionStatus === 'DISBURSED' && (
              <Badge variant="disbursed" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>تم الصرف بالكامل</span>
              </Badge>
            )}
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-lord-gold tracking-tight">
              {order.amount.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 font-semibold mr-1">{order.currency}</span>
          </div>
        </div>

        {/* Beneficiary Details */}
        <div className="mb-4">
          <p className="text-xs text-gray-400">المستفيد:</p>
          <h4 className="text-base font-bold text-white">{beneficiaryName}</h4>
          <p className="text-xs text-gray-400 mt-1">{order.summaryForTreasury}</p>
        </div>

        {/* Payout Details (Isolated View) */}
        <div className="p-3.5 bg-obsidian-surface rounded-xl border border-obsidian-border mb-4">
          {isBEP20 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-lord-gold">
                  <Coins className="w-4 h-4 text-lord-gold" />
                  <span>شبكة BEP20 (USDT)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQR(!showQR)}
                  className="text-xs text-cyber-blue hover:underline flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQR ? 'إخفاء QR' : 'عرض QR'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-obsidian-primary p-2 rounded-lg border border-gray-800">
                <code className="text-xs text-gray-200 font-mono truncate max-w-[200px]">
                  {order.destinationDetails.bep20Address || 'لم يحدد عنوان'}
                </code>
                {order.destinationDetails.bep20Address && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.destinationDetails.bep20Address!, 'عنوان المحفظة')}
                    className="p-1 hover:text-lord-gold text-gray-400 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-status-disbursed" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {showQR && order.destinationDetails.bep20Address && (
                <div className="flex justify-center p-3 bg-white rounded-lg mt-3">
                  <QRCodeSVG value={order.destinationDetails.bep20Address} size={130} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                <Smartphone className="w-4 h-4" />
                <span>{isJeeb ? '📱 محفظة جيب (Jeeb)' : '📱 محفظة جوالي (Jawali)'}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-obsidian-primary p-2 rounded-lg border border-gray-800">
                  <div className="text-xs">
                    <span className="text-gray-400 ml-1">رقم الهاتف:</span>
                    <strong className="text-white font-mono text-sm">
                      {order.destinationDetails.walletPhoneNumber || 'غير مسجل'}
                    </strong>
                  </div>
                  {order.destinationDetails.walletPhoneNumber && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.destinationDetails.walletPhoneNumber!, 'رقم الهاتف')}
                      className="p-1 hover:text-emerald-400 text-gray-400 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-status-disbursed" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                <div className="text-xs text-gray-300 px-1">
                  <span className="text-gray-400">اسم صاحب الحساب للمطابقة: </span>
                  <span className="text-lord-gold font-semibold">
                    {order.destinationDetails.accountHolderName || beneficiaryName}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons for Treasury Operator */}
      <div className="pt-2 border-t border-obsidian-border">
        {order.executionStatus === 'WAITING_TREASURY' && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleStartProcessing}
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            >
              <span>[قيد التنفيذ 🔄]</span>
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => setIsModalOpen(true)}
            >
              <span>[تم الصرف ✅]</span>
            </Button>
          </div>
        )}

        {order.executionStatus === 'IN_PROGRESS' && (
          <Button
            variant="gold"
            size="md"
            className="w-full"
            onClick={() => setIsModalOpen(true)}
          >
            <span>[تأكيد تم الصرف مع المرجع ✅]</span>
          </Button>
        )}

        {order.executionStatus === 'DISBURSED' && (
          <div className="text-xs text-gray-400 bg-obsidian-surface p-2 rounded-lg border border-gray-800">
            <span className="text-gray-400">المرجع: </span>
            <code className="text-emerald-400 font-mono">
              {order.transferProof?.txHashOrReferenceNumber || 'مكتمل'}
            </code>
          </div>
        )}
      </div>

      {/* Modal for Disbursement Reference Confirmation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian-surface border border-lord-gold/40 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">إثبات تحويل المبلغ</h3>
            <p className="text-xs text-gray-400 mb-4">
              أدخل رقم العملية المرجعي لتأكيد الصرف وتسوية الرصيد تلقائياً من الصندوق والميزانية العامة.
            </p>

            <form onSubmit={handleDisburseSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {isBEP20 ? 'هاش العملية (TxHash):' : 'رقم الحوالة أو رقم الإشعار المرجعي:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isBEP20 ? '0x...' : 'مثال: 88721934'}
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value)}
                  className="w-full bg-obsidian-primary border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lord-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  تأكيد وخصم فوري
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

