'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, ShieldCheck, ShieldAlert, QrCode, Copy, CheckCircle2, Lock, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { AppModalPortal } from '../ui/AppModalPortal';
import {
  useGet2FAStatusQuery,
  useGenerate2FASetupMutation,
  useEnable2FAMutation,
  useDisable2FAMutation
} from '../../store/api/usersApi';
import { toast } from 'sonner';

export const TwoFactorAuthCard: React.FC = () => {
  const { data: statusRes, refetch: refetchStatus, isLoading } = useGet2FAStatusQuery();
  const [generateSetup, { isLoading: isGenerating }] = useGenerate2FASetupMutation();
  const [enable2FA, { isLoading: isEnabling }] = useEnable2FAMutation();
  const [disable2FA, { isLoading: isDisabling }] = useDisable2FAMutation();

  const isEnabled = statusRes?.data?.isTwoFactorEnabled ?? false;

  // Modal Setup State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string; otpauth: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Disable Modal State
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const handleStartSetup = async () => {
    try {
      const res = await generateSetup().unwrap();
      if (res.data) {
        setSetupData(res.data);
        setRecoveryCodes([]);
        setVerificationCode('');
        setIsSetupModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل توليد رمز إعداد التحقق الثنائي');
    }
  };

  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 6) {
      toast.error('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    try {
      const res = await enable2FA({ code: verificationCode }).unwrap();
      if (res.data?.recoveryCodes) {
        setRecoveryCodes(res.data.recoveryCodes);
        toast.success('تم تفعيل التحقق الثنائي (2FA) بنجاح!');
        refetchStatus();
      }
    } catch (err: any) {
      toast.error(err?.data?.error || 'رمز التحقق غير صحيح، حاول ثانية');
    }
  };

  const handleConfirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await disable2FA({
        password: disablePassword,
        code: disableCode
      }).unwrap();

      toast.success('تم تعطيل التحقق الثنائي بنجاح');
      setIsDisableModalOpen(false);
      setDisablePassword('');
      setDisableCode('');
      refetchStatus();
    } catch (err: any) {
      toast.error(err?.data?.error || 'فشل تعطيل التحقق الثنائي');
    }
  };

  return (
    <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            isEnabled
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
              : 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
          }`}>
            {isEnabled ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-2">
              <span>الأمن المتقدم والتحقق الثنائي (2FA / TOTP)</span>
              {isEnabled ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  مفعل ومحمي ✓
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  غير مفعل ⚠️
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              حماية جلسة الحساب برمز متجدد كل 30 ثانية متوافق مع Google Authenticator و Authy.
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full sm:w-auto flex justify-end">
          {isEnabled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDisableModalOpen(true)}
              className="text-xs text-red-400 border-red-500/40 hover:bg-red-500/10 rounded-xl w-full sm:w-auto"
            >
              تعطيل التحقق الثنائي
            </Button>
          ) : (
            <Button
              type="button"
              variant="gold"
              size="sm"
              disabled={isGenerating}
              onClick={handleStartSetup}
              className="text-xs font-bold rounded-xl shadow-gold-glow flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <QrCode className="w-4 h-4 text-obsidian-primary" />
              <span>{isGenerating ? 'جاري التجهيز...' : 'تفعيل التحقق الثنائي الآن ⚡'}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 leading-relaxed">
        {isEnabled ? (
          <p className="text-emerald-300/90 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>حسابك الآن مؤمن بالكامل. عند تسجيل الدخول، سيُطلب منك إدخال رمز التحقق الديناميكي أو كود استرداد احتياطي.</span>
          </p>
        ) : (
          <p className="text-gray-400">
            يوصى بشدة بتفعيل التحقق الثنائي لحماية حسابك من الاختراق وضمان أعلى مستويات الأمان (Zero-Trust Security).
          </p>
        )}
      </div>

      {/* 2FA Setup Modal */}
      <AppModalPortal
        isOpen={isSetupModalOpen}
        onClose={() => {
          setIsSetupModalOpen(false);
          setRecoveryCodes([]);
        }}
        maxWidthClassName="max-w-md"
      >
        <div className="bg-[#0F141C] border-2 border-lord-gold/60 rounded-3xl p-6 shadow-2xl space-y-5 text-right">
          <div className="text-center space-y-1.5 border-b border-gray-800 pb-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-lord-gold">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">إعداد التحقق الثنائي (2FA)</h3>
            <p className="text-xs text-gray-400">امسح رمز الاستجابة السريعة (QR) باستخدام تطبيق التحقق</p>
          </div>

          {recoveryCodes.length > 0 ? (
            /* Backup Recovery Codes View */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">تم تفعيل التحقق الثنائي بنجاح!</h4>
                <p className="text-xs text-gray-300">
                  احفظ أكواد الاسترداد الاحتياطية التالية في مكان آمن. تُستخدم لمرة واحدة في حال فقدت هاتفك:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-obsidian-surface border border-gray-800 font-mono text-center text-xs text-lord-gold font-bold select-all">
                {recoveryCodes.map((c, i) => (
                  <div key={i} className="p-2 rounded-xl bg-obsidian-primary border border-gray-700/60">
                    {c}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="gold"
                className="w-full font-bold text-xs rounded-xl"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join('\n'));
                  toast.success('تم نسخ أكواد الاسترداد بنجاح! 📋');
                  setIsSetupModalOpen(false);
                }}
              >
                نسخ الأكواد وإغلاق
              </Button>
            </div>
          ) : (
            /* Scanning & Code Entry View */
            <div className="space-y-4">
              {setupData?.qrCodeDataUrl && (
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setupData.qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="w-48 h-48 rounded-xl shadow-lg border border-lord-gold/30 bg-white p-2"
                  />
                  <div className="mt-3 flex items-center justify-between w-full p-2 rounded-xl bg-obsidian-primary border border-gray-800 text-[11px] font-mono">
                    <span className="text-gray-400 truncate max-w-[200px] select-all">{setupData.secret}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(setupData.secret);
                        setCopiedSecret(true);
                        toast.success('تم نسخ المفتاح السري 📋');
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-lord-gold font-bold flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedSecret ? 'تم النسخ' : 'نسخ المفتاح'}</span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleConfirmEnable} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    أدخل الرمز المكون من 6 أرقام من التطبيق للتأكيد:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-obsidian-surface border-2 border-lord-gold/50 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-lord-gold"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="gold"
                    disabled={isEnabling || verificationCode.length < 6}
                    className="flex-1 font-bold text-xs rounded-xl shadow-gold-glow"
                  >
                    {isEnabling ? 'جاري التحقق...' : 'تأكيد وحفظ 🛡️'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSetupModalOpen(false)}
                    className="text-xs text-gray-400 border-gray-700 rounded-xl"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </AppModalPortal>

      {/* Disable 2FA Modal */}
      <AppModalPortal
        isOpen={isDisableModalOpen}
        onClose={() => setIsDisableModalOpen(false)}
        maxWidthClassName="max-w-md"
      >
        <div className="bg-[#0F141C] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-right">
          <div className="flex items-center gap-3 text-red-400 border-b border-gray-800 pb-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">تعطيل التحقق الثنائي</h3>
              <p className="text-[11px] text-gray-400">ستفقد الحماية المشددة لحسابك</p>
            </div>
          </div>

          <form onSubmit={handleConfirmDisable} className="space-y-3">
            <div>
              <label className="text-xs text-gray-300 block mb-1">كلمة المرور لتأكيد الهوية:</label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-obsidian-surface border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">أو رمز التحقق من التطبيق (6 أرقام):</label>
              <input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="000000"
                className="w-full bg-obsidian-surface border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center tracking-widest focus:outline-none focus:border-red-400"
                dir="ltr"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="submit"
                variant="danger"
                disabled={isDisabling || (!disablePassword && !disableCode)}
                className="flex-1 text-xs font-bold rounded-xl"
              >
                {isDisabling ? 'جاري التعطيل...' : 'تأكيد التعطيل'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDisableModalOpen(false)}
                className="text-xs text-gray-400 border-gray-700 rounded-xl"
              >
                تراجع
              </Button>
            </div>
          </form>
        </div>
      </AppModalPortal>
    </div>
  );
};

