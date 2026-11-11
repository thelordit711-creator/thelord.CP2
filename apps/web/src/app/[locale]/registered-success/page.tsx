'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Briefcase,
  Coins,
  Layers,
  Zap,
  Phone,
  Wallet
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function RegisteredSuccessPage() {
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleStartWorking = async () => {
    try {
      const { apiFetch } = await import('../../../lib/apiClient');
      const res = await apiFetch('/auth/work-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workStatus: 'WORKING' })
      });
      if (res.ok && user) {
        const updated = { ...user, workStatus: 'WORKING' };
        localStorage.setItem('lord_current_user', JSON.stringify(updated));
      }
    } catch (_err) {}

    // Route to destination
    if (user?.accessRole === 'TREASURY') {
      router.push(`/${locale}/payout-desk`);
    } else {
      router.push(`/${locale}/workspace`);
    }
  };

  const getDestinationUrl = () => {
    if (user?.accessRole === 'TREASURY') return `/${locale}/payout-desk`;
    if (user?.accessRole === 'SUPER_ADMIN') return `/${locale}/dashboard`;
    return `/${locale}/workspace`;
  };

  return (
    <div className="min-h-screen bg-[#07090E] relative flex items-center justify-center p-4 overflow-hidden">
      {/* Golden glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lord-gold/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-xl z-10">
        <div className="bg-[#0F141C] p-8 md:p-12 rounded-3xl border border-lord-gold/40 shadow-2xl relative overflow-hidden backdrop-blur-2xl text-center">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-lord-gold/30 via-lord-gold to-lord-gold/30" />

          {/* Golden Badge Logo */}
          <div className="relative mx-auto w-28 h-28 mb-6 rounded-full p-1.5 bg-gradient-to-b from-lord-gold via-amber-400 to-transparent shadow-gold-glow">
            <div className="w-full h-full rounded-full bg-lord-dark flex items-center justify-center overflow-hidden border border-lord-gold/70">
              <Image
                src="/logo.png"
                alt="THE LORD OF CRYPTO"
                width={112}
                height={112}
                className="object-cover scale-110"
                priority
              />
            </div>
            <div className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-lord-dark">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تم تفعيل الحساب وتوثيق العضوية بنجاح</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
            مرحباً بك في أسرة THE LORD OF CRYPTO
          </h1>
          <p className="text-xs text-gray-300 max-w-md mx-auto mb-6 leading-relaxed">
            تم تسجيل بياناتك رسمياً في المنظومة، وحالتك التشغيلية اللحظية الآن لدى الإدارة هي:
            <span className="block mt-1 font-bold text-emerald-400 text-sm">
              🟢 تم تسجيل الدخول (جاهز لاستلام المهام)
            </span>
          </p>

          {/* Account Overview Card */}
          <div className="p-5 rounded-2xl bg-lord-slate/50 border border-gray-800 text-xs text-right space-y-3 mb-8">
            <div className="flex items-center justify-between text-gray-300">
              <span className="text-gray-500">الاسم المعتمد:</span>
              <span className="font-bold text-white text-sm">{user?.fullName || 'عضو الكادر الجديد'}</span>
            </div>

            <div className="flex items-center justify-between text-gray-300 border-t border-gray-800/80 pt-2.5">
              <span className="text-gray-500">البريد الإلكتروني:</span>
              <span className="font-mono text-lord-gold" dir="ltr">{user?.email || '—'}</span>
            </div>

            <div className="flex items-center justify-between text-gray-300 border-t border-gray-800/80 pt-2.5">
              <span className="text-gray-500">الدور والصلاحيات:</span>
              <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                user?.accessRole === 'TREASURY' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyber-blue/20 text-cyber-blue'
              }`}>
                {user?.accessRole === 'TREASURY' ? 'أمين الصندوق (شاشة صرف معزولة 🪙)' : 'كادر الموظفين (EMPLOYEE 💼)'}
              </span>
            </div>

            {user?.primaryDepartment && (
              <div className="flex items-center justify-between text-gray-300 border-t border-gray-800/80 pt-2.5">
                <span className="text-gray-500">القسم:</span>
                <span className="text-gray-200">{user.primaryDepartment}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="gold"
              size="lg"
              onClick={handleStartWorking}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold shadow-gold-glow"
            >
              <Zap className="w-4 h-4 text-lord-dark" />
              <span>بدء العمل الفعلي وتفعيل الحالة اللحظية (⚡ قيد العمل)</span>
              {isRtl ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>

            <Link href={getDestinationUrl()} className="w-full block">
              <Button
                variant="surface"
                size="md"
                className="w-full py-3 text-xs text-gray-300 hover:text-white"
              >
                الانتقال مباشرة لمساحة العمل
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

