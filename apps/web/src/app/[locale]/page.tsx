'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Coins,
  Sparkles,
  Users,
  CheckSquare,
  MessageSquare,
  Bot,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Activity,
  Layers,
  Video
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface ExecutiveModule {
  title: string;
  titleEn: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  color: string;
  stat: string;
  statLabel: string;
}

export default function HomePage() {
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === 'ar';

  // Automatically direct user to Login page or their designated workspace
  useEffect(() => {
    const token = localStorage.getItem('lord_auth_token');
    const userStr = localStorage.getItem('lord_current_user');

    if (!token || !userStr) {
      router.replace(`/${locale}/login`);
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.accessRole === 'SUPER_ADMIN') {
        router.replace(`/${locale}/dashboard`);
      } else if (user.accessRole === 'TREASURY') {
        router.replace(`/${locale}/payout-desk`);
      } else {
        router.replace(`/${locale}/workspace`);
      }
    } catch (_err) {
      router.replace(`/${locale}/login`);
    }
  }, [locale, router]);

  const executiveModules: ExecutiveModule[] = [
    {
      title: 'لوحة القيادة والخزينة المركزية',
      titleEn: 'Executive Dashboard & Vault',
      desc: 'متابعة الميزانية العامة ورصيد الصندوق اللحظي وحسابات الإيرادات والمصروفات.',
      href: `/${locale}/dashboard`,
      icon: TrendingUp,
      badge: 'ERP Vault',
      color: 'border-lord-gold/40 hover:border-lord-gold bg-lord-gold/5',
      stat: '$65,000 USDT',
      statLabel: 'إجمالي السيولة'
    },
    {
      title: 'إدارة الموظفين وكشوفات الرواتب (HR)',
      titleEn: 'Talent Matrix & Payroll',
      desc: 'مصفوفة الـ 11 مسمى وظيفي، كشوفات الحسابات، المكافآت، الخصومات، والإنذارات.',
      href: `/${locale}/employees`,
      icon: Users,
      badge: '11 مسمى',
      color: 'border-cyber-blue/40 hover:border-cyber-blue bg-cyber-blue/5',
      stat: '11 دور معتمد',
      statLabel: 'الكادر الإداري'
    },
    {
      title: 'محرك المهام والمراحل المتسلسلة',
      titleEn: 'Agile Kanban & Dynamic Stages',
      desc: 'إسناد المهام، باني المراحل، الحقول الإلزامية (صور، فيديو، صوت 🎙️)، واعتماد المراحل.',
      href: `/${locale}/tasks`,
      icon: CheckSquare,
      badge: 'Kanban',
      color: 'border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5',
      stat: 'مراحل ذكية',
      statLabel: 'تدقيق فوري'
    },
    {
      title: 'شاشة الصندوق المعزولة (Treasury Desk)',
      titleEn: 'Zero-Access Payout Desk',
      desc: 'تنفيذ أوامر الصرف المعتمدة عبر شبكة BEP20 USDT ومحافظ جيب وجوالي بضغطتي زر.',
      href: `/${locale}/payout-desk`,
      icon: Coins,
      badge: 'Zero-Access',
      color: 'border-amber-500/40 hover:border-amber-500 bg-amber-500/5',
      stat: 'BEP20 + جيب',
      statLabel: 'دفع مزدوج'
    },
    {
      title: 'مركز الدردشة والتواصل المؤسسي',
      titleEn: 'Enterprise Live Chat',
      desc: 'قنوات الأقسام (#تداول، #تسويق، #برمجة) والرسائل المباشرة والملاحظات الصوتية.',
      href: `/${locale}/chat`,
      icon: MessageSquare,
      badge: 'WebSockets',
      color: 'border-purple-500/40 hover:border-purple-500 bg-purple-500/5',
      stat: '5 قنوات',
      statLabel: 'تواصل مشفر'
    },
    {
      title: 'غرف الاجتماعات والبث المباشر (Video)',
      titleEn: 'Live Video Meetings',
      desc: 'غرف اجتماعات مرئية ومسموعة مع مشاركة الشاشة ومراجعة الفيديو بثوانٍ محددة.',
      href: `/${locale}/meeting`,
      icon: Video,
      badge: 'WebRTC',
      color: 'border-rose-500/40 hover:border-rose-500 bg-rose-500/5',
      stat: 'بث حي',
      statLabel: 'مشاركة الشاشة'
    },
    {
      title: 'مركز ذكاء TheLordAI الاستراتيجي',
      titleEn: 'TheLordAI Command Suite',
      desc: 'المساعد الذكي (Gemini Flash) المزود بجدار ناري مالي عازل لتحليل العمليات وصياغة المحتوى.',
      href: `/${locale}/ai-hub`,
      icon: Bot,
      badge: 'AI Engine',
      color: 'border-sky-500/40 hover:border-sky-500 bg-sky-500/5',
      stat: 'Gemini Flash',
      statLabel: 'ذكاء تشغيلي'
    }
  ];

  return (
    <div className="max-w-7xl w-full mx-auto space-y-10 py-6">
      {/* Brand Hero Showcase */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-obsidian-card via-obsidian-surface to-obsidian-primary border-2 border-lord-gold/30 p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lord-gold/15 border border-lord-gold/30 text-lord-gold text-xs font-bold tracking-wider">
            <Sparkles className="w-4 h-4 animate-spin text-lord-gold" />
            <span>THE LORD OF CRYPTO — ENTERPRISE WORKSPACE & SIMPLE FINANCIAL ERP</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            النظام المؤسسي الشامل لإدارة <span className="text-lord-gold">الموارد والعمليات</span>
          </h1>

          <p className="text-xs md:text-sm text-gray-300 leading-relaxed max-w-xl">
            منظومة متكاملة لفرق التداول، صناعة المحتوى، التسويق، والبرمجة، تجمع بين إدارة الحسابات والرواتب،
            محرك المراحل الإلزامية، شاشة الصندوق المعزولة أمنياً لدعم <strong>شبكة BEP20 ومحفظتي جيب وجوالي</strong>،
            مع قنوات تواصل لحظية، غرف اجتماعات فيديو، ومساعد ذكي مدعوم بـ <strong>Gemini Flash</strong>.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href={`/${locale}/dashboard`}>
              <Button variant="gold" size="lg" className="rounded-2xl">
                <span>فتح لوحة القيادة التنفيذية</span>
                {isRtl ? <ArrowLeft className="w-4 h-4 mr-1.5" /> : <ArrowRight className="w-4 h-4 ml-1.5" />}
              </Button>
            </Link>
            <Link href={`/${locale}/payout-desk`}>
              <Button variant="outline" size="lg" className="rounded-2xl border-gray-700 text-gray-300">
                <Coins className="w-4 h-4 ml-1.5 text-lord-gold" />
                <span>شاشة الصندوق المعزولة</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Official Brand Logo Showcase */}
        <div className="relative z-10 shrink-0">
          <div className="relative p-2 rounded-full bg-gradient-to-tr from-lord-gold/40 via-yellow-500/20 to-transparent">
            <img
              src="/logo.png"
              alt="THE LORD OF CRYPTO - TRADING & LEARNING"
              className="w-44 h-44 md:w-56 md:h-56 rounded-full object-cover shadow-gold-glow border-2 border-lord-gold/60 hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      {/* Enterprise Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'الميزانية العامة المعتمدة', val: '$50,000 USDT', change: '+12% شهرياً', icon: DollarSign, color: 'text-lord-gold' },
          { label: 'رصيد الصندوق المتاح للصرف', val: '$15,000 USDT', change: 'جاهز للحوالات', icon: Coins, color: 'text-cyber-blue' },
          { label: 'الكادر الإداري النشط', val: '11 مسلماً وظيفياً', change: '100% Onboarded', icon: Users, color: 'text-emerald-400' },
          { label: 'سرعة التنفيذ اللحظي', val: '< 2 ثانية', change: 'WebSockets Live', icon: Activity, color: 'text-purple-400' }
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="p-5 rounded-3xl bg-obsidian-card border border-obsidian-border shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-semibold">{m.label}</span>
                <Icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <div className="text-xl md:text-2xl font-black text-white font-mono">{m.val}</div>
              <span className="text-[10px] text-gray-500 font-mono mt-1 block">{m.change}</span>
            </div>
          );
        })}
      </div>

      {/* Enterprise Modules Navigation Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-lord-gold" />
            <span>وحدات النظام المتكاملة</span>
          </h2>
          <span className="text-xs text-gray-400">كافة الوحدات متصلة بقاعدة البيانات والمحاسبة الآلية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {executiveModules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Link
                key={idx}
                href={mod.href}
                className={`p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between group shadow-xl ${mod.color}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-obsidian-card flex items-center justify-center border border-gray-800 group-hover:border-lord-gold/40 transition-colors">
                      <Icon className="w-6 h-6 text-lord-gold" />
                    </div>
                    <Badge variant="gold">{mod.badge}</Badge>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-lord-gold transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">{mod.desc}</p>
                </div>

                <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block">{mod.statLabel}</span>
                    <strong className="text-xs text-white font-mono">{mod.stat}</strong>
                  </div>
                  <div className="flex items-center text-xs font-bold text-lord-gold gap-1">
                    <span>فتح الشاشة</span>
                    {isRtl ? (
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    ) : (
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
