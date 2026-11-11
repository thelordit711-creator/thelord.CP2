'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Shield,
  Lock,
  User as UserIcon,
  Phone,
  Briefcase,
  Layers,
  Coins,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building,
  Key,
  Wallet
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { AccessRole, PrimaryDepartment, JobTitle, PayoutMethod } from '@lord/shared-types';

const JOB_TITLES_LIST: { id: JobTitle; labelAr: string; dept: PrimaryDepartment }[] = [
  { id: 'DEAL_ANALYST', labelAr: 'محلل صفقات وتداول كمي', dept: 'TRADING' },
  { id: 'TG_CONTENT_MANAGER', labelAr: 'مدير محتوى قنوات تيليجرام', dept: 'CONTENT_MEDIA' },
  { id: 'SUPPORT_AGENT', labelAr: 'أخصائي خدمة عملاء ودعم فني', dept: 'SUPPORT' },
  { id: 'WEB_BOT_DEVELOPER', labelAr: 'مطور برمجيات وبوتات تداول', dept: 'DEVELOPMENT' },
  { id: 'TG_ADS_MANAGER', labelAr: 'مدير حملات إعلانات تيليجرام', dept: 'MARKETING' },
  { id: 'TG_CHANNEL_PROMO_MANAGER', labelAr: 'مدير تبادلات وترويج القنوات', dept: 'MARKETING' },
  { id: 'GRAPHIC_VIDEO_EDITOR', labelAr: 'مصمم جرافيك ومونتير فيديو احترافي', dept: 'CONTENT_MEDIA' },
  { id: 'YOUTUBE_MANAGER', labelAr: 'مدير ومطور قناة يوتيوب', dept: 'CONTENT_MEDIA' },
  { id: 'X_PLATFORM_MANAGER', labelAr: 'مدير حساب منصة X (تويتر)', dept: 'MARKETING' },
  { id: 'FB_IG_MANAGER', labelAr: 'مدير حسابات فيسبوك وإنستغرام', dept: 'MARKETING' },
  { id: 'MARKETING_DEV_LEAD', labelAr: 'رئيس قسم التسويق والتطوير', dept: 'MANAGEMENT' }
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const token = searchParams.get('token') || '';
  const initialRole = (searchParams.get('role') as AccessRole) || 'EMPLOYEE';

  const [verifying, setVerifying] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccessRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Employee specific fields
  const [primaryDept, setPrimaryDept] = useState<PrimaryDepartment>('TRADING');
  const [selectedJobTitles, setSelectedJobTitles] = useState<JobTitle[]>(['DEAL_ANALYST']);
  const [skillText, setSkillText] = useState('تحليل فني، SMC، إدارة مخاطر، تداول كمي');
  const [preferredPayout, setPreferredPayout] = useState<PayoutMethod>('BEP20_USDT');
  const [bep20Address, setBep20Address] = useState('');
  const [jeebPhone, setJeebPhone] = useState('');
  const [jawaliPhone, setJawaliPhone] = useState('');

  // Treasury specific fields
  const [vaultKey, setVaultKey] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  // Verify invitation token on mount
  useEffect(() => {
    async function verify() {
      if (!token) {
        setInviteError('رابط الدعوة غير متوفر أو غير مكتمل');
        setVerifying(false);
        return;
      }

      try {
        const { apiFetch } = await import('../../../lib/apiClient');
        const res = await apiFetch(`/auth/verify-invite/${token}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'رابط الدعوة غير صالح أو منتهي الصلاحية');
        }

        setEmail(data.email);
        setRole(data.role);
        setInviteValid(true);
      } catch (err) {
        setInviteError((err as Error).message);
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, [token, apiUrl]);

  const toggleJobTitle = (title: JobTitle) => {
    setSelectedJobTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const skillsArray = skillText
        .split('،')
        .join(',')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, level: 'ADVANCED' as const }));

      const payload = {
        token,
        fullName,
        password,
        phoneNumber,
        primaryDepartment: role === 'TREASURY' ? 'MANAGEMENT' : primaryDept,
        jobTitles: selectedJobTitles,
        skills: skillsArray,
        toolsUsed: ['Telegram', 'TradingView', 'Figma', 'Antigravity'],
        payoutMethods: {
          preferredMethod: preferredPayout,
          bep20Address: bep20Address || undefined,
          jeebWallet: {
            isEnabled: !!jeebPhone,
            registeredPhone: jeebPhone || phoneNumber,
            accountHolderName: fullName
          },
          jawaliWallet: {
            isEnabled: !!jawaliPhone,
            registeredPhone: jawaliPhone || phoneNumber,
            accountHolderName: fullName
          }
        }
      };

      const { apiFetch, clearClientAuthTokens } = await import('../../../lib/apiClient');
      const res = await apiFetch('/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر إتمام التسجيل، يرجى المحاولة لاحقاً');
      }

      // Save non-sensitive UI profile only; JWT lives in HttpOnly cookie
      clearClientAuthTokens();
      localStorage.setItem('lord_current_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('lord:session-changed'));

      // Route to Celebration & Post-Registration Page
      router.push(`/${locale}/registered-success`);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-lord-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">جاري التحقق من صلاحية رابط الدعوة...</span>
        </div>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-4">
        <div className="bg-[#0F141C] max-w-md w-full p-8 rounded-3xl border border-red-500/30 text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">رابط الدعوة غير صالح</h2>
          <p className="text-sm text-gray-400 mb-6">{inviteError}</p>
          <Button
            variant="gold"
            onClick={() => router.push(`/${locale}/login`)}
            className="w-full"
          >
            الانتقال لصفحة تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] py-12 px-4 flex items-center justify-center relative overflow-hidden">
      {/* Subtle gold aura */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-lord-gold/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-[#0F141C] p-8 md:p-12 rounded-3xl border border-lord-gold/40 shadow-2xl relative z-10">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-lord-gold/30 via-lord-gold to-lord-gold/30" />

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-gray-800/80 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[#07090E] border-2 border-lord-gold/60 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-gold-glow">
            <Image src="/logo.png" alt="Logo" width={80} height={80} className="object-cover scale-110" priority />
          </div>
          <div className="text-center md:text-right flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>دعوة انضمام رسمية معتمدة C.P ERP</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              {role === 'TREASURY' ? 'تفعيل حساب أمين الصندوق والخزينة' : 'إكمال تسجيل بيانات الكادر الوظيفي'}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              البريد المدعو: <span className="text-lord-gold font-mono font-bold">{email}</span> • الدور المخصص:{' '}
              <span className="text-white font-bold">{role === 'TREASURY' ? 'أمين الصندوق (TREASURY 🪙)' : 'كادر الموظفين (EMPLOYEE 💼)'}</span>
            </p>
          </div>
        </div>

        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-lord-gold uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span>1. البيانات الشخصية وبيانات الدخول:</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">الاسم الثلاثي أو الرباعي الكامل *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أحمد محمد خالد"
                    className="w-full bg-[#131A24] border border-gray-700/80 focus:border-lord-gold rounded-xl px-4 py-3 pl-10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lord-gold transition-all"
                  />
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">كلمة المرور الجديدة للحساب *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#131A24] border border-gray-700/80 focus:border-lord-gold rounded-xl px-4 py-3 pl-10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lord-gold transition-all font-mono"
                    dir="ltr"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">رقم الهاتف النشط (واتساب / اتصالات) *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+967 770 000 000"
                    className="w-full bg-[#131A24] border border-gray-700/80 focus:border-lord-gold rounded-xl px-4 py-3 pl-10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lord-gold transition-all font-mono"
                    dir="ltr"
                  />
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">القسم الرئيسي المعتمد</label>
                <select
                  value={primaryDept}
                  onChange={(e) => setPrimaryDept(e.target.value as PrimaryDepartment)}
                  className="w-full bg-[#131A24] border border-gray-700/80 focus:border-lord-gold rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lord-gold transition-all cursor-pointer"
                >
                  <option value="TRADING" className="bg-[#131A24] text-white py-2">قسم التداول والتحليل (Trading)</option>
                  <option value="MARKETING" className="bg-[#131A24] text-white py-2">قسم التسويق والإعلانات (Marketing)</option>
                  <option value="CONTENT_MEDIA" className="bg-[#131A24] text-white py-2">قسم المحتوى والميديا (Content & Media)</option>
                  <option value="DEVELOPMENT" className="bg-[#131A24] text-white py-2">قسم البرمجة والذكاء الاصطناعي (Development)</option>
                  <option value="SUPPORT" className="bg-[#131A24] text-white py-2">قسم الدعم الفني وخدمة العملاء (Support)</option>
                  <option value="MANAGEMENT" className="bg-[#131A24] text-white py-2">قسم الإدارة والرقابة (Management)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Roles & Permissions */}
          {role === 'TREASURY' ? (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Shield className="w-5 h-5" />
                <span>إقرار عزل صلاحيات أمين الصندوق (Zero-Access Isolation)</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                بصفتك أمين الصندوق، تقتصر صلاحياتك حصراً على استلام أوامر الصرف المعتمدة من المسؤول التنفيذي، وتنفيذها عبر المحافظ المركزية، وتوثيق أرقام العمليات (TxID). لا يمكنك الاطلاع على مهام الموظفين الأخرى أو خطط الشركة لضمان السرية التامة.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">رمز حماية تأكيد الصرف (PIN السري للمحفظة)</label>
                <input
                  type="password"
                  value={vaultKey}
                  onChange={(e) => setVaultKey(e.target.value)}
                  placeholder="أدخل رمز سري من 6 أرقام لتأكيد الحوالات"
                  className="w-full bg-[#131A24] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-lord-gold uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>2. الأدوار الوظيفية المكلف بها والمهارات:</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  اختر المسميات الوظيفية المكلف بها (يمكنك اختيار أكثر من مسمى):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {JOB_TITLES_LIST.map((job) => {
                    const isSelected = selectedJobTitles.includes(job.id);
                    return (
                      <button
                        type="button"
                        key={job.id}
                        onClick={() => toggleJobTitle(job.id)}
                        className={`p-3 rounded-xl border text-xs text-right transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-lord-gold/20 border-lord-gold text-lord-gold font-bold shadow-gold-glow'
                            : 'bg-[#131A24] border-gray-800 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <span className="truncate">{job.labelAr}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-lord-gold" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  المهارات التقنية وأدوات العمل (مفصولة بفاصلة)
                </label>
                <input
                  type="text"
                  value={skillText}
                  onChange={(e) => setSkillText(e.target.value)}
                  placeholder="تحليل فني، SMC، Adobe Premiere، Python، إعلانات تليجرام، Canva..."
                  className="w-full bg-[#131A24] border border-gray-700/80 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-lord-gold"
                />
              </div>

              {/* Payout Channels Setup */}
              <div className="p-5 rounded-2xl bg-[#0B0F17] border border-lord-gold/30 space-y-4">
                <div className="flex items-center gap-2 text-lord-gold font-bold text-sm">
                  <Coins className="w-4 h-4" />
                  <span>3. إعدادات استلام المستحقات والرواتب (Payout Configuration)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">طريقة الصرف المفضلة</label>
                    <select
                      value={preferredPayout}
                      onChange={(e) => setPreferredPayout(e.target.value as PayoutMethod)}
                      className="w-full bg-[#131A24] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="BEP20_USDT" className="bg-[#131A24]">محفظة كريبتو (USDT BEP20)</option>
                      <option value="JEEB_WALLET" className="bg-[#131A24]">محفظة جيب الإلكترونية (Jeeb)</option>
                      <option value="JAWALI_WALLET" className="bg-[#131A24]">محفظة جوالي (Jawali)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">عنوان محفظة USDT (BEP20 - BSC)</label>
                    <input
                      type="text"
                      value={bep20Address}
                      onChange={(e) => setBep20Address(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-[#131A24] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">رقم محفظة جيب / جوالي المحلية</label>
                    <input
                      type="text"
                      value={jeebPhone}
                      onChange={(e) => {
                        setJeebPhone(e.target.value);
                        setJawaliPhone(e.target.value);
                      }}
                      placeholder="77XXXXXXX"
                      className="w-full bg-[#131A24] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="gold"
            size="lg"
            disabled={submitting}
            className="w-full py-4 text-base font-bold shadow-gold-glow flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-lord-dark border-t-transparent rounded-full animate-spin" />
                جاري إتمام التسجيل وتفعيل الحساب...
              </span>
            ) : (
              <>
                <span>تأكيد البيانات والدخول الفوري للمنظومة</span>
                {isRtl ? <ArrowLeft className="w-5 h-5 mr-1" /> : <ArrowRight className="w-5 h-5 ml-1" />}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
