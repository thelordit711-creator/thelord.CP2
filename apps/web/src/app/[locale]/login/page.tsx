'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { apiFetch, clearClientAuthTokens } = await import('../../../lib/apiClient');
      const payload: any = { email: email.trim(), password };
      if (requiresTwoFactor && twoFactorCode) {
        payload.twoFactorCode = twoFactorCode.trim();
      }

      const res = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تسجيل الدخول، يرجى التحقق من البيانات');
      }

      // Check if 2FA code is needed
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setLoading(false);
        return;
      }

      // Store non-sensitive UI profile only; JWT lives exclusively in HttpOnly cookie
      clearClientAuthTokens();
      localStorage.setItem('lord_current_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('lord:session-changed'));

      // Route based on role
      if (data.user.accessRole === 'SUPER_ADMIN') {
        router.push(`/${locale}/dashboard`);
      } else if (data.user.accessRole === 'TREASURY') {
        router.push(`/${locale}/payout-desk`);
      } else {
        router.push(`/${locale}/workspace`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lord-gold/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Card */}
        <div className="bg-[#0F141C] p-8 md:p-10 rounded-3xl border border-lord-gold/40 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lord-gold/30 via-lord-gold to-lord-gold/30" />

          {/* Logo & Emblem */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative w-28 h-28 mb-4 rounded-full p-1 bg-gradient-to-b from-lord-gold via-lord-gold/40 to-transparent shadow-gold-glow">
              <div className="w-full h-full rounded-full bg-[#07090E] flex items-center justify-center overflow-hidden border border-lord-gold/60">
                <Image
                  src="/logo.png"
                  alt="THE LORD OF CRYPTO"
                  width={112}
                  height={112}
                  className="object-cover scale-110"
                  priority
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold bg-gradient-to-r from-lord-gold via-amber-200 to-lord-gold bg-clip-text text-transparent">
              THE LORD OF CRYPTO
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              منظومة الرقابة المالية وإدارة الكوادر الذكية C.P ERP
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm animate-pulse">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {!requiresTwoFactor ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    البريد الإلكتروني المعتمد
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@thelordofcrypto.com"
                      className="w-full bg-[#131A24] border border-gray-700/80 focus:border-lord-gold rounded-xl px-4 py-3 pl-11 text-white placeholder-gray-500 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-lord-gold"
                      dir="ltr"
                    />
                    <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#131A24] border border-gray-700/80 focus:border-lord-gold rounded-xl px-4 py-3 pl-11 text-white placeholder-gray-500 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-lord-gold font-mono"
                      dir="ltr"
                    />
                    <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 rounded-2xl bg-lord-gold/10 border border-lord-gold/40 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-lord-gold/20 flex items-center justify-center text-lord-gold shadow-gold-glow">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">التحقق الثنائي المشدد (2FA)</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    حسابك مؤمن برمز التحقق الديناميكي. افتح تطبيق Google Authenticator وأدخل الرمز المكون من 6 أرقام:
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-lord-gold mb-2 text-center">
                    رمز التحقق أو كود الاسترداد
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={16}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="000 000"
                    className="w-full bg-[#131A24] border-2 border-lord-gold/60 focus:border-lord-gold rounded-xl px-4 py-3 text-center text-white placeholder-gray-600 text-xl font-mono tracking-widest transition-all focus:outline-none shadow-gold-glow"
                    dir="ltr"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRequiresTwoFactor(false);
                    setTwoFactorCode('');
                  }}
                  className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors"
                >
                  ← العودة لتسجيل الدخول بكلمة المرور
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (requiresTwoFactor && !twoFactorCode.trim())}
              className="w-full py-3.5 bg-gradient-to-r from-lord-gold via-amber-500 to-lord-gold text-lord-dark font-bold rounded-xl shadow-lg shadow-lord-gold/20 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-lord-dark border-t-transparent rounded-full animate-spin" />
                  جاري التحقق...
                </span>
              ) : requiresTwoFactor ? (
                <>
                  <Shield className="w-4 h-4" />
                  <span>تأكيد الرمز والدخول الآمن</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول للنظام</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[11px] text-gray-500 tracking-wider">أو عبر الدخول السحابي الموحد</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Kinde SSO Button */}
          <a
            href="/api/auth/login"
            className="w-full py-3 px-4 rounded-xl border border-gray-700 hover:border-lord-gold/60 bg-lord-slate/40 hover:bg-lord-slate/70 text-gray-300 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-4 h-4 text-lord-gold group-hover:scale-110 transition-transform" />
            <span>الدخول الآمن عبر Kinde Enterprise SSO</span>
          </a>

          {/* Footer note */}
          <div className="mt-8 text-center text-[11px] text-gray-500">
            للانضمام لكادر العمل، يرجى طلب رابط دعوة رسمي من إدارة النظام.
          </div>
        </div>
      </div>
    </div>
  );
}

