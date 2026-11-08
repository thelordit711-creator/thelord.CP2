'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  LayoutDashboard,
  CheckSquare,
  Coins,
  MessageSquare,
  Users,
  Video,
  Briefcase,
  Bot,
  FolderKanban,
  Trophy,
  User,
  Grid,
  X,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { AccessRole } from '@lord/shared-types';
import { useGetMyNotificationsQuery } from '../../store/api/notificationsApi';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const locale = useLocale();
  const [userRole, setUserRole] = useState<AccessRole>('SUPER_ADMIN');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: notificationsData } = useGetMyNotificationsQuery();
  const unreadCount = notificationsData?.meta?.unreadCount ?? 0;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user.accessRole) setUserRole(user.accessRole);
        } catch (e) {
          console.error(e);
        }
      }

      // Check modal open status immediately
      const checkModal = () => {
        setIsModalOpen(document.body.classList.contains('modal-open'));
      };
      checkModal();

      const observer = new MutationObserver(checkModal);
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

      return () => observer.disconnect();
    }
  }, []);

  // All sections matching the laptop sidebar (8 for employee, 11 for admin)
  const allNavItems = [
    { title: 'الرئيسية', href: `/${locale}/dashboard`, icon: LayoutDashboard, badge: 'ERP', roles: ['SUPER_ADMIN'] },
    { title: 'الموظفون', href: `/${locale}/employees`, icon: Users, badge: 'HR', roles: ['SUPER_ADMIN'] },
    { title: 'مساحتي', href: `/${locale}/workspace`, icon: Briefcase, badge: 'إنجاز', roles: ['SUPER_ADMIN', 'EMPLOYEE'] },
    { title: 'المهام', href: `/${locale}/tasks`, icon: CheckSquare, badge: 'مراحل', roles: ['SUPER_ADMIN', 'EMPLOYEE'] },
    { title: 'المشاريع', href: `/${locale}/projects`, icon: FolderKanban, badge: 'WBS', roles: ['SUPER_ADMIN', 'EMPLOYEE'] },
    { title: 'الدردشة', href: `/${locale}/chat`, icon: MessageSquare, badge: 'لحظي', roles: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY'], hasBadge: true },
    { title: 'TheLordAI', href: `/${locale}/ai-hub`, icon: Bot, badge: 'AI 2.5', roles: ['SUPER_ADMIN', 'EMPLOYEE'] },
    { title: 'الاجتماع', href: `/${locale}/meeting`, icon: Video, badge: 'Live', roles: ['SUPER_ADMIN', 'EMPLOYEE'] },
    { title: 'لوحة الشرف', href: `/${locale}/leaderboard`, icon: Trophy, badge: 'KPIs', roles: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY'] },
    { title: 'الملف الشخصي', href: `/${locale}/profile`, icon: User, badge: 'هويتي', roles: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY'] },
    { title: 'الصندوق', href: `/${locale}/payout-desk`, icon: Coins, badge: 'خزينة', roles: ['SUPER_ADMIN', 'TREASURY'] }
  ];

  const visibleItems = allNavItems.filter(item => item.roles.includes(userRole));

  // Primary 4 tabs on the floating bar
  const primaryTabs = visibleItems.slice(0, 4);
  // Remaining tabs in the "المزيد" menu
  const secondaryTabs = visibleItems.slice(4);

  // Check if current active path is in secondary tabs
  const isSecondaryActive = secondaryTabs.some(
    item => pathname === item.href || (item.href !== `/${locale}` && pathname.startsWith(item.href))
  );

  return (
    <>
      {/* Floating Bottom Nav Capsule with All 8 Sections */}
      <div className={`bottom-nav-capsule md:hidden fixed bottom-2 inset-x-1.5 sm:inset-x-3 z-40 max-w-2xl mx-auto pointer-events-none select-none transition-all duration-200 ${isModalOpen ? 'hidden pointer-events-none opacity-0' : ''}`}>
        <nav className="pointer-events-auto bg-[#07090E]/95 backdrop-blur-2xl border border-lord-gold/40 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(212,175,55,0.18)] px-1 py-1 transition-all">
          {/* Proportional Grid Row containing all 8 sections so NONE are cut off */}
          <div className="flex items-center justify-between gap-0.5 px-0.5">
            {visibleItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== `/${locale}` && pathname.startsWith(item.href));
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className={`relative flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 ${isActive
                      ? 'text-lord-gold font-bold bg-gradient-to-b from-lord-gold/25 to-transparent shadow-[inset_0_1px_1px_rgba(212,175,55,0.4)] scale-105'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  title={item.title}
                >
                  <div className="relative">
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)] text-lord-gold' : ''}`} />
                    {item.hasBadge && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[12px] h-[12px] px-0.5 rounded-full bg-status-danger text-white text-[8px] font-black flex items-center justify-center shadow-md animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[8px] sm:text-[9px] tracking-tighter mt-0.5 truncate max-w-full block ${isActive ? 'text-lord-gold font-black' : 'font-medium'}`}>
                    {item.title}
                  </span>

                  {isActive && (
                    <span className="absolute -bottom-0.5 w-3.5 h-0.5 rounded-full bg-lord-gold shadow-[0_0_6px_#D4AF37]" />
                  )}
                </Link>
              );
            })}

            {/* Quick Grid Sheet Toggle */}
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 text-gray-400 hover:text-lord-gold hover:bg-white/5 border-r border-gray-800 shrink-0"
              title="عرض كافة الأقسام في شبكة سريعة"
            >
              <Grid className="w-3.5 h-3.5 text-lord-gold/90" />
              <span className="text-[7.5px] text-lord-gold/90 font-mono mt-0.5 font-bold">
                {visibleItems.length}
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Expanded "All 8 Sections" Bottom Sheet (Action Sheet) */}
      {isMoreMenuOpen && mounted && createPortal(
        <div className="md:hidden fixed inset-0 z-[99999] flex flex-col justify-end select-none">
          {/* Dim Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMoreMenuOpen(false)}
          />

          {/* Action Sheet Container */}
          <div className="relative w-full max-w-lg mx-auto bg-[#07090E] border-t-2 border-lord-gold/60 rounded-t-3xl shadow-[0_-10px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(212,175,55,0.2)] p-4 pb-8 z-10 animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle & Header */}
            <div className="w-12 h-1 rounded-full bg-gray-700 mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center text-lord-gold">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">كافة أقسام المنظومة ({visibleItems.length} أقسام)</h3>
                  <p className="text-[10px] text-gray-400">انتقال فوري لكافة الميزات المتاحة لحسابك</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of All 8 Sections */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[60vh] overflow-y-auto p-1">
              {visibleItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== `/${locale}` && pathname.startsWith(item.href));

                return (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${isActive
                        ? 'bg-gradient-to-br from-lord-gold/25 via-lord-gold/10 to-transparent border-lord-gold text-lord-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] font-bold scale-[1.02]'
                        : 'bg-obsidian-card border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white'
                      }`}
                  >
                    <div className="relative mb-1.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-lord-gold text-black shadow-md' : 'bg-obsidian-surface text-gray-300 border border-gray-800'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {item.hasBadge && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-status-danger text-white text-[9px] font-black flex items-center justify-center shadow-md animate-pulse">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold block truncate max-w-full">
                      {item.title}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono mt-0.5 block">
                      {item.badge}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
