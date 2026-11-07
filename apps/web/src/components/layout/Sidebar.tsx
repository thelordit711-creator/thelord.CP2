'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Coins,
  MessageSquare,
  Bot,
  UserPlus,
  Shield,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Activity,
  Layers,
  Video,
  FolderKanban,
  Trophy,
  User,
  Settings
} from 'lucide-react';
import { useSocket } from '../../providers/SocketProvider';
import { AccessRole } from '@lord/shared-types';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { isConnected } = useSocket();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<AccessRole>('SUPER_ADMIN');
  const [userName, setUserName] = useState<string>('The Lord Admin');

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
    }
  }, []);

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
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE']
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
      title: 'الصندوق المعزول (Treasury)',
      titleEn: 'Isolated Payout Desk',
      href: `/${locale}/payout-desk`,
      icon: Coins,
      badge: 'صرف',
      allowedRoles: ['SUPER_ADMIN', 'TREASURY']
    },
    {
      title: 'مركز الدردشة والتواصل',
      titleEn: 'Team Communication',
      href: `/${locale}/chat`,
      icon: MessageSquare,
      badge: 'لحظي',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY']
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
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY']
    },
    {
      title: 'الملف الشخصي والمحافظ',
      titleEn: 'My Digital Profile',
      href: `/${locale}/profile`,
      icon: User,
      badge: 'هويتي',
      allowedRoles: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY']
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

  return (
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
              ? 'p-3 flex flex-col items-center gap-2 justify-center'
              : 'p-4 sm:p-5 flex items-center justify-between'
          }`}
        >
          <Link
            href={`/${locale}`}
            className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : 'overflow-hidden min-w-0'}`}
            title="THE LORD OF CRYPTO"
          >
            <div className="relative shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] flex items-center justify-center">
              <img
                src="/logo.png"
                alt="THE LORD OF CRYPTO"
                className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] aspect-square rounded-full object-cover shadow-gold-glow shrink-0 border border-lord-gold/50 hover:scale-105 transition-transform"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-white tracking-wider truncate flex items-center gap-1.5">
                  THE LORD <span className="text-lord-gold">C.P</span>
                </span>
                <span className="text-[10px] text-lord-gold/80 font-mono truncate">TRADING & LEARNING</span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-obsidian-surface transition-colors border border-transparent hover:border-gray-800 shrink-0 ${
              collapsed ? 'mt-1' : ''
            }`}
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
        <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)]">
          {visibleNavItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={idx}
                href={item.href}
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
  );
};
