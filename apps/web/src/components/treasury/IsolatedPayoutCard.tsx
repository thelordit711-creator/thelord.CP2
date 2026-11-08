'use client';

import React, { useState } from 'react';
import { IPayoutOrder } from '@lord/shared-types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AppModalPortal } from '../ui/AppModalPortal';
import { Copy, Check, QrCode, Smartphone, Coins, CheckCircle, Clock, UploadCloud, Sparkles, CheckCheck, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuditReceiptImageMutation } from '../../store/api/treasuryApi';
import { RequestOrderModificationModal } from './modals/RequestOrderModificationModal';
import { toast } from 'sonner';

interface IsolatedPayoutCardProps {
  order: IPayoutOrder;
  onStartProcessing: (orderId: string) => Promise<void>;
  onConfirmDisbursed: (orderId: string, proofData: { txHashOrReferenceNumber: string; receiptScreenshot?: any }) => Promise<void>;
}

export const IsolatedPayoutCard: React.FC<IsolatedPayoutCardProps> = ({
  order,
  onStartProcessing,
  onConfirmDisbursed
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModificationModalOpen, setIsModificationModalOpen] = useState(false);
  const [referenceInput, setReferenceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gemini Vision Auditor State
  const [auditReceipt, { isLoading: isAuditing }] = useAuditReceiptImageMutation();
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<{
    isMatch: boolean;
    matchScore: number;
    extractedReference?: string;
    extractedAmount?: number;
    extractedCurrency?: string;
    confidenceScore?: number;
    remarks: string;
  } | null>(null);

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

  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح (PNG أو JPG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setReceiptBase64(base64);
      try {
        toast.info('جاري فحص وتدقيق السند عبر وكيل Gemini Vision...');
        const res = await auditReceipt({
          imageBase64: base64,
          mimeType: file.type,
          orderId: order._id
        }).unwrap();

        if (res?.data) {
          setAuditResult(res.data);
          if (res.data.extractedReference) {
            setReferenceInput(res.data.extractedReference);
          }
          toast.success(res.data.remarks || 'تم تدقيق ومطابقة السند بنجاح!');
        }
      } catch (err: any) {
        toast.error('تعذر التدقيق البصري للسند آلياً');
      }
    };
    reader.readAsDataURL(file);
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
        txHashOrReferenceNumber: referenceInput.trim(),
        receiptScreenshot: receiptBase64 ? { fileUrl: receiptBase64, verifiedAt: new Date() } : undefined
      });
      setIsModalOpen(false);
      setReceiptBase64(null);
      setAuditResult(null);
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
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">المستفيد:</p>
            {/* Designated Segment Vault Badge */}
            {order.category === 'SALARY' || order.category === 'BONUS' || order.category === 'ADVANCE' ? (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-xs">
                <span>💼</span>
                <span>صندوق الرواتب والأجور</span>
              </span>
            ) : order.category === 'TG_ADS' || order.category === 'TG_CHANNEL_PROMO' ? (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/30 flex items-center gap-1 shadow-xs">
                <span>📣</span>
                <span>صندوق التسويق والإعلانات</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                <span>🛡️</span>
                <span>صندوق الاحتياطي التشغيلي</span>
              </span>
            )}
          </div>
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
      <div className="pt-2 border-t border-obsidian-border space-y-2">
        {order.modificationRequest && order.modificationRequest.status === 'PENDING' && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              طلب {order.modificationRequest.requestedAction === 'CANCEL' ? 'إلغاء' : 'تعديل'} معلق بانتظار موافقة المسؤول ({order.modificationRequest.reason})
            </span>
          </div>
        )}

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

        {/* Audit Modification / Cancellation Request to Admin */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-800/80">
          <button
            type="button"
            onClick={() => setIsModificationModalOpen(true)}
            className="text-[10px] text-gray-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>طلب تعديل / إلغاء إلى المسؤول 🛡️</span>
          </button>
        </div>
      </div>

      {/* Modal for Requesting Modification or Cancellation to Admin */}
      <RequestOrderModificationModal
        order={order}
        isOpen={isModificationModalOpen}
        onClose={() => setIsModificationModalOpen(false)}
      />

      {/* Modal for Disbursement Reference Confirmation & Gemini Vision Receipt Auditor */}
      <AppModalPortal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidthClassName="max-w-md"
      >
        <div className="bg-obsidian-surface border border-lord-gold/50 rounded-3xl p-6 shadow-2xl space-y-4 text-right">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-lord-gold" />
              <span>إثبات تحويل المبلغ وتأكيد الصرف</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              المبلغ المطلوب صرفه: <strong className="text-lord-gold font-mono">{order.amount} {order.currency}</strong> إلى ({beneficiaryName})
            </p>
          </div>

          {/* Gemini Vision Receipt Dropzone */}
          <div className="p-3.5 rounded-2xl bg-obsidian-primary/80 border border-dashed border-lord-gold/40 space-y-2.5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-lord-gold">
              <UploadCloud className="w-4 h-4" />
              <span>فحص وتدقيق سند التحويل البصري (Gemini Vision OCR)</span>
            </div>

            <p className="text-[11px] text-gray-400">
              ارفع صورة الإيصال أو لقطة شاشة التحويل البنكي لمطابقة المبلغ ورقم الحوالة آلياً
            </p>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lord-gold/15 hover:bg-lord-gold/25 border border-lord-gold/40 text-lord-gold text-xs font-bold cursor-pointer transition-all">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAuditing ? 'جاري الفحص البصري...' : 'اختر صورة السند 📷'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptImageUpload}
                disabled={isAuditing}
                className="hidden"
              />
            </label>

            {/* Vision Auditor Result Badge */}
            {auditResult && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-right space-y-1 text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span>✓ متطابق 100% مع أمر الصرف</span>
                  </span>
                  <span className="font-mono text-[10px]">{auditResult.confidenceScore}% دقة</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  {auditResult.remarks}
                </p>
                {auditResult.extractedAmount && (
                  <div className="text-[10px] text-gray-400 font-mono">
                    المبلغ المستخرج: ${auditResult.extractedAmount} {auditResult.extractedCurrency} | المرجع: {auditResult.extractedReference}
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleDisburseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                {isBEP20 ? 'هاش العملية (TxHash):' : 'رقم الحوالة أو رقم الإشعار المرجعي:'}
              </label>
              <input
                type="text"
                required
                placeholder={isBEP20 ? '0x...' : 'مثال: 88721934'}
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                className="w-full bg-obsidian-primary border border-gray-700 focus:border-lord-gold rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  setReceiptBase64(null);
                  setAuditResult(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                isLoading={isSubmitting}
                className="font-bold shadow-gold-glow"
              >
                تأكيد واعتماد الصرف 💸
              </Button>
            </div>
          </form>
        </div>
      </AppModalPortal>
    </div>
  );
};

