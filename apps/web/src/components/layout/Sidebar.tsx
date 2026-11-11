'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Coins,
  MessageSquare,
  Bot,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Video,
  FolderKanban,
  Trophy,
  User,
  Settings,
  X,
  Sun,
  Moon,
  Globe,
  SlidersHorizontal,
  LogOut
} from 'lucide-react';
import { useSocket } from '../../providers/SocketProvider';
import { AccessRole } from '@lord/shared-types';
import { lordToast } from '../../lib/lordToast';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { isConnected } = useSocket();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<AccessRole>('SUPER_ADMIN');
  const [userName, setUserName] = useState<string>('The Lord Admin');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user.accessRole) setUserRole(user.accessRole);
          if (user.fullName) setUserName(user.fullName);
        } catch (e) {
          console.error(e);
        }
      }

      const savedTheme = (localStorage.getItem('lord_theme') as 'dark' | 'light') || 'dark';
      setTheme(savedTheme);

      const handleToggleMobile = () => {
        setMobileOpen((prev) => !prev);
      };
      window.addEventListener('lord_toggle_mobile_sidebar', handleToggleMobile);
      return () => {
        window.removeEventListener('lord_toggle_mobile_sidebar', handleToggleMobile);
      };
    }
  }, []);

  const switchLanguage = () => {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
    router.push(newPath);
  };

  const handleLogout = () => {
    localStorage.removeItem('lord_auth_token');
    localStorage.removeItem('lord_current_user');
    lordToast.gold('تم تسجيل الخروج بنجاح');
    setMobileOpen(false);
    router.push(`/${locale}/logged-out`);
  };

  const allNavItems = [
    {
      title: 'لوحة القيادة التنفيذية',
      titleEn: 'Executive Dashboard',
      href: `/${locale}/dashboard`,
      icon: LayoutDashboard,
      badge: 'ERP',
      allowedRoles: ['SUPER_ADMIN']
    },
    {
      title: 'الموظفون والرواتب (HR)',
      titleEn: 'Talent & Salaries',
      href: `/${locale}/employees`,
      icon: Users,
      badge: '11 دور',
      allowedRoles: ['SUPER_ADMIN']
    },
    {
      title: 'مساحة عمل الموظف',
      titleEn: 'Employee Workspace',
      href: `/${locale}/workspace`,
      icon: Briefcase,
      badge: 'إنجاز',
      allowedRoles: ['EMPLOYEE'] // Only for employees; hidden from General Manager
    },
    {
      title: 'محرك المهام والمراحل',
      titleEn: 'Agile Tasks & Stages',
      href: `/${locale}/tasks`,
      icon: CheckSquare,
      badge: 'مراحل',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE']
    },
    {
      title: 'النظام المحاسبي والصندوق',
      titleEn: 'Accounting & Treasury',
      href: `/${locale}/payout-desk`,
      icon: Coins,
      badge: 'مالية',
      allowedRoles: ['SUPER_ADMIN', 'TREASURY']
    },
    {
      title: 'مركز الدردشة والتواصل',
      titleEn: 'Team Communication',
      href: `/${locale}/chat`,
      icon: MessageSquare,
      badge: 'لحظي',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE']
    },
    {
      title: 'غرف الاجتماعات وبث الفيديو',
      titleEn: 'Live Meetings & Video',
      href: `/${locale}/meeting`,
      icon: Video,
      badge: 'Live',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE']
    },
    {
      title: 'مركز TheLordAI الذكي',
      titleEn: 'TheLordAI Suite',
      href: `/${locale}/ai-hub`,
      icon: Bot,
      badge: 'Flash',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE']
    },
    {
      title: 'إدارة المشاريع (WBS)',
      titleEn: 'Strategic Projects',
      href: `/${locale}/projects`,
      icon: FolderKanban,
      badge: 'WBS',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE']
    },
    {
      title: 'لوحة الشرف والترتيب (KPIs)',
      titleEn: 'Leaderboard & KPIs',
      href: `/${locale}/leaderboard`,
      icon: Trophy,
      badge: 'شرف',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE']
    },
    {
      title: 'الملف الشخصي والمحافظ',
      titleEn: 'My Digital Profile',
      href: `/${locale}/profile`,
      icon: User,
      badge: 'هويتي',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE']
    },
    {
      title: 'إعدادات المنظومة والسياسات',
      titleEn: 'System Settings',
      href: `/${locale}/settings`,
      icon: Settings,
      badge: 'ضبط',
      allowedRoles: ['SUPER_ADMIN']
    }
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  const renderNavLinks = (onItemClick?: () => void) => (
    <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)]">
      {visibleNavItems.map((item, idx) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={idx}
            href={item.href}
            onClick={onItemClick}
            className={`flex items-center p-3 rounded-2xl transition-all duration-200 group ${
              collapsed ? 'justify-center px-0' : 'justify-between px-3.5'
            } ${
              isActive
                ? 'bg-lord-gold text-obsidian-primary font-black shadow-gold-glow'
                : 'text-gray-400 hover:text-white hover:bg-obsidian-surface'
            }`}
            title={collapsed ? (isRtl ? item.title : item.titleEn) : undefined}
          >
            <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-obsidian-primary stroke-[2.5]' : 'text-gray-400 group-hover:text-lord-gold'
                }`}
              />
              {!collapsed && (
                <span className="text-xs font-bold tracking-wide truncate">
                  {isRtl ? item.title : item.titleEn}
                </span>
              )}
            </div>

            {!collapsed && item.badge && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-obsidian-primary text-lord-gold shadow-xs'
                    : 'bg-obsidian-surface text-gray-400 group-hover:text-white border border-gray-800/80'
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* 1. Desktop Executive Laptop Sidebar */}
      <aside
        className={`hidden md:flex relative flex-col justify-between bg-obsidian-card border-l border-obsidian-border transition-all duration-300 z-40 select-none ${
          collapsed ? 'w-20' : 'w-72'
        }`}
        style={{
          borderLeft: isRtl ? '1px solid #1F2937' : 'none',
          borderRight: isRtl ? 'none' : '1px solid #1F2937'
        }}
      >
        {/* Brand Header */}
        <div>
          <div
            className={`border-b border-obsidian-border transition-all ${
              collapsed
                ? 'py-4 px-2 flex flex-col items-center justify-center gap-3'
                : 'p-4 sm:p-5 flex items-center justify-between'
            }`}
          >
            <Link
              href={`/${locale}`}
              className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'overflow-hidden min-w-0'}`}
              title="THE LORD SYSTEM"
            >
              <div
                style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, maxWidth: 44, maxHeight: 44 }}
                className="relative shrink-0 rounded-full overflow-hidden border-2 border-lord-gold/60 shadow-gold-glow flex items-center justify-center bg-obsidian-surface"
              >
                <img
                  src="/logo.png"
                  alt="THE LORD SYSTEM"
                  style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, objectFit: 'cover' }}
                  className="rounded-full shrink-0"
                />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-white tracking-wider truncate flex items-center gap-1.5">
                    THE LORD <span className="text-lord-gold">C.P</span>
                  </span>
                  <span className="text-[10px] text-lord-gold/80 font-mono truncate">ENTERPRISE & OPERATIONS</span>
                </div>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-obsidian-surface transition-colors border border-transparent hover:border-gray-800 shrink-0"
              title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              {isRtl ? (
                collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Live System Indicator */}
          {!collapsed && (
            <div className="px-5 py-3 bg-obsidian-surface/60 border-b border-obsidian-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[11px] text-gray-300 font-semibold">
                  {isConnected ? 'الخادم متصل لحظياً' : 'جاري الاتصال...'}
                </span>
              </div>
              <span className="text-[10px] text-lord-gold font-mono bg-lord-gold/10 px-2.5 py-0.5 rounded-full border border-lord-gold/20 whitespace-nowrap shrink-0">
                {userRole === 'TREASURY' ? 'صندوق معزول 🪙' : 'BEP20 + جيب'}
              </span>
            </div>
          )}

          {/* Navigation Links */}
          {renderNavLinks()}
        </div>

        {/* Bottom Profile / Role Badge */}
        <div className="p-3.5 border-t border-obsidian-border bg-obsidian-surface/50">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-obsidian-card/80 border border-gray-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-lord-gold/15 border border-lord-gold/35 flex items-center justify-center font-bold text-sm text-lord-gold shrink-0 shadow-xs">
                  {userRole === 'SUPER_ADMIN' ? '👑' : userRole === 'TREASURY' ? '🪙' : '💼'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-white truncate">
                    {userName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">{userRole}</span>
                  </div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-emerald-500/50 shadow-sm shrink-0" title="جلسة آمنة ومتصلة" />
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div
                className="w-9 h-9 rounded-xl bg-lord-gold/15 border border-lord-gold/40 flex items-center justify-center text-sm shadow-xs cursor-pointer hover:scale-105 transition-transform"
                title={`${userName} (${userRole})`}
              >
                {userRole === 'SUPER_ADMIN' ? '👑' : userRole === 'TREASURY' ? '🪙' : '💼'}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Unified Mobile Drawer (Clean, matching laptop sidebar + mobile utility row) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[99999] flex select-none">
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Container */}
          <div
            className={`relative z-10 w-72 max-w-[85vw] h-full bg-[#090c15] border-r border-lord-gold/30 shadow-2xl flex flex-col justify-between animate-in ${
              isRtl ? 'slide-in-from-right' : 'slide-in-from-left'
            } duration-200 text-right`}
          >
            {/* Mobile Brand Header */}
            <div>
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full border border-lord-gold/50 overflow-hidden shrink-0">
                    <img src="/logo.png" alt="THE LORD" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">THE LORD C.P</h3>
                    <p className="text-[10px] text-lord-gold/80 font-mono">القائمة التنفيذية الرسمية</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-xl bg-gray-800/80 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Quick Utilities Bar (Language + Status) */}
              <div className="px-4 py-2 bg-gray-900/60 border-b border-gray-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={switchLanguage}
                  className="p-1.5 px-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center gap-1.5 text-[11px] font-bold font-mono"
                  title="تبديل لغة الواجهة"
                >
                  <Globe className="w-3.5 h-3.5 text-cyber-blue" />
                  <span>{locale === 'ar' ? 'English' : 'العربية'}</span>
                </button>

                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>متصل لحظياً</span>
                </div>
              </div>

              {/* All Official Nav Items */}
              <div className="p-2 overflow-y-auto max-h-[calc(100vh-210px)] space-y-1 scroll-touch">
                {visibleNavItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                        isActive
                          ? 'bg-lord-gold text-black font-black shadow-md'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-lord-gold'}`} />
                        <span className="text-xs font-bold">{isRtl ? item.title : item.titleEn}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                            isActive ? 'bg-black text-lord-gold' : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile Footer User Chip & Logout */}
            <div className="p-3 border-t border-gray-800 bg-[#06080e] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center font-bold text-xs text-lord-gold shrink-0">
                  {userRole === 'SUPER_ADMIN' ? '👑' : userRole === 'TREASURY' ? '🪙' : '💼'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">{userName}</span>
                  <span className="text-[9px] text-gray-400 truncate">{userRole}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
