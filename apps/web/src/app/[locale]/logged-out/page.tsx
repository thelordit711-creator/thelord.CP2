'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { LogOut, ShieldCheck, Clock, ArrowRight, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function LoggedOutPage() {
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const [logoutTime, setLogoutTime] = useState<string>('');

  useEffect(() => {
    // Clear any remaining session state & legacy token keys
    localStorage.removeItem('lord_auth_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('lord_current_user');
    setLogoutTime(new Date().toLocaleTimeString(isRtl ? 'ar-YE' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }));
  }, [isRtl]);

  return (
    <div className="min-h-screen bg-[#07090E] relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        <div className="bg-[#0F141C] p-8 md:p-10 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden backdrop-blur-2xl text-center">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/20 via-red-500 to-red-500/20" />

          {/* Logo & Logout Badge */}
          <div className="relative mx-auto w-24 h-24 mb-6 rounded-full p-1 bg-gradient-to-b from-gray-700 via-gray-800 to-transparent shadow-xl">
            <div className="w-full h-full rounded-full bg-lord-dark flex items-center justify-center overflow-hidden border border-gray-700">
              <Image
                src="/logo.png"
                alt="THE LORD OF CRYPTO"
                width={96}
                height={96}
                className="object-cover scale-110 grayscale-[30%]"
                priority
              />
            </div>
            <div className="absolute bottom-0 right-0 p-2 rounded-full bg-red-500 text-white shadow-lg">
              <LogOut className="w-4 h-4" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>تم تسجيل الخروج بنجاح 🔴</span>
          </div>

          <h1 className="text-2xl font-black text-white mb-2">
            تم إنهاء جلسة العمل بأمان
          </h1>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
            تم حفظ وقت مغادرتك وتحديث حالتك اللحظية لدى الإدارة التنفيذية إلى <strong className="text-red-400">«تم تسجيل الخروج»</strong>.
          </p>

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-lord-slate/50 border border-gray-800 text-xs text-right space-y-2.5 mb-8">
            <div className="flex items-center justify-between text-gray-300">
              <span className="text-gray-500">وقت التوثيق الرسمي:</span>
              <span className="font-mono text-white flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-lord-gold" />
                <span>{logoutTime || '—'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-300 border-t border-gray-800/80 pt-2">
              <span className="text-gray-500">حالة الجلسة:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>مقفلة ومشفرة (End-to-End)</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-300 border-t border-gray-800/80 pt-2">
              <span className="text-gray-500">البيانات المحفوظة:</span>
              <span className="text-gray-200">المهام والمراحل مسجلة بالسيرفر</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href={`/${locale}/login`} className="w-full block">
              <Button
                variant="gold"
                size="lg"
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold shadow-gold-glow"
              >
                <KeyRound className="w-4 h-4" />
                <span>تسجيل الدخول من جديد</span>
                {isRtl ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>
            </Link>

            <Link href={`/${locale}/login`} className="w-full block">
              <button
                type="button"
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                العودة للواجهة الرئيسية للمنظومة
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

