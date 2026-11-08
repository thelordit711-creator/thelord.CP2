'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Bell,
  Globe,
  LogOut,
  Menu,
  Sun,
  Moon,
  SlidersHorizontal,
  X,
  Check
} from 'lucide-react';
import { WorkStatus, INotification } from '@lord/shared-types';
import { useSocket } from '../../providers/SocketProvider';
import {
  useGetMyNotificationsQuery,
  useMarkAllAsReadMutation
} from '../../store/api/notificationsApi';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { lordToast } from '../../lib/lordToast';

// Modular Subcomponents
import { WorkStatusSelector } from './WorkStatusSelector';
import { MobileFloatingHud } from './MobileFloatingHud';

export const TopBar: React.FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { socket } = useSocket();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workStatus, setWorkStatus] = useState<WorkStatus>('LOGGED_IN');
  const [showNotifications, setShowNotifications] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Floating Tools Popover State
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showFloatingAi, setShowFloatingAi] = useState(false);
  const [showFloatingHud, setShowFloatingHud] = useState(false);

  // HUD Visibility (controlled by toggle)
  const [isMobileOverlayMinimized, setIsMobileOverlayMinimized] = useState(true);
  const [hasNativeNotificationPermission, setHasNativeNotificationPermission] = useState(false);

  // RTK Query Notifications
  const { data: notificationsData, refetch: refetchNotifications } = useGetMyNotificationsQuery();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const notificationsList: INotification[] = notificationsData?.data || [];
  const unreadCount = notificationsData?.meta?.unreadCount ?? notificationsList.filter(n => !n.readStatus).length;

  // Always enforce official obsidian black dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('lord_theme', 'dark');

      // Floating Tools (Default: FALSE / Hidden to keep interface clean)
      const savedAi = localStorage.getItem('lord_show_floating_ai') === 'true';
      const savedHud = localStorage.getItem('lord_show_floating_hud') === 'true';
      setShowFloatingAi(savedAi);
      setShowFloatingHud(savedHud);

      // Listen for updates from other components
      const syncFloatingTools = () => {
        setShowFloatingAi(localStorage.getItem('lord_show_floating_ai') === 'true');
        setShowFloatingHud(localStorage.getItem('lord_show_floating_hud') === 'true');
      };
      window.addEventListener('lord_floating_tools_updated', syncFloatingTools);

      // 3. PWA Push Notifications
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW registration:', err);
        });
      }
      if ('Notification' in window) {
        setHasNativeNotificationPermission(window.Notification.permission === 'granted');
      }

      return () => {
        window.removeEventListener('lord_floating_tools_updated', syncFloatingTools);
      };
    }
  }, []);

  // Request Native Notification Permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await window.Notification.requestPermission();
        if (perm === 'granted') {
          setHasNativeNotificationPermission(true);
          lordToast.success('تم تفعيل إشعارات الهاتف والنظام في الخلفية!');
        } else {
          lordToast.gold('إشعار', 'تم رفض الإذن بإشعارات النظام');
        }
      } catch (e) {
        lordToast.error('تعذر طلب إذن الإشعارات');
      }
    }
  };

  // Synthesized Executive Notification Chime (Zero-latency Web Audio API)
  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Imperial Gold harmonic chord: 523.25Hz (C5) and 659.25Hz (E5)
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime);

      osc1.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.35);
      osc2.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.35);

      gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.85);
      osc2.stop(ctx.currentTime + 0.85);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  };

  // Toggle Floating Tools (AI Assistant & HUD)
  const toggleFloatingTool = (tool: 'ai' | 'hud') => {
    if (typeof window === 'undefined') return;

    if (tool === 'ai') {
      const next = !showFloatingAi;
      setShowFloatingAi(next);
      localStorage.setItem('lord_show_floating_ai', next ? 'true' : 'false');
      window.dispatchEvent(new Event('lord_floating_tools_updated'));
      lordToast.gold(next ? 'تم إظهار المساعد TheLordAI 🦁' : 'تم إخفاء المساعد الذكي');
    } else {
      const next = !showFloatingHud;
      setShowFloatingHud(next);
      localStorage.setItem('lord_show_floating_hud', next ? 'true' : 'false');
      window.dispatchEvent(new Event('lord_floating_tools_updated'));
      lordToast.gold(next ? 'تم إظهار لوحة الرقابة HUD 🦁' : 'تم إخفاء لوحة الرقابة');
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: INotification) => {
      refetchNotifications();
      playNotificationChime();
      lordToast.gold(notification.title, notification.message);

      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: notification.title,
          body: notification.message,
          url: window.location.href
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, refetchNotifications]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setCurrentUser(user);
          if (user.workStatus) {
            setWorkStatus(user.workStatus);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const switchLanguage = (newLocale: string) => {
    if (newLocale === locale) return;
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const handleStatusChange = async (newStatus: WorkStatus) => {
    if (newStatus === workStatus) return;

    if (newStatus === 'LOGGED_OUT') {
      handleLogout();
      return;
    }

    setUpdatingStatus(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const token = localStorage.getItem('lord_auth_token');

      const res = await fetch(`${apiUrl}/auth/work-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ workStatus: newStatus })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تحديث حالة العمل');
      }

      setWorkStatus(newStatus);
      if (currentUser) {
        const updated = { ...currentUser, workStatus: newStatus, workStatusUpdatedAt: data.workStatusUpdatedAt };
        setCurrentUser(updated);
        localStorage.setItem('lord_current_user', JSON.stringify(updated));
      }

      const statusLabels: Record<WorkStatus, string> = {
        LOGGED_IN: 'تم تسجيل الدخول',
        WORKING: 'قيد العمل ⚡',
        ON_BREAK: 'في استراحة ☕',
        LOGGED_OUT: 'تم تسجيل الخروج 🔴'
      };
      lordToast.success(`تم تحديث حالتك إلى: ${statusLabels[newStatus]}`);
    } catch (err: any) {
      lordToast.error(err.message || 'فشل تحديث الحالة');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const token = localStorage.getItem('lord_auth_token');
      if (token) {
        await fetch(`${apiUrl}/auth/work-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ workStatus: 'LOGGED_OUT' })
        });
      }
    } catch (_err) {
      // ignore
    }

    localStorage.removeItem('lord_auth_token');
    localStorage.removeItem('lord_current_user');
    lordToast.gold('تم تسجيل الخروج بنجاح');
    router.push(`/${locale}/logged-out`);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead().unwrap();
      lordToast.gold('تم التحديث', 'تم تحديد جميع الإشعارات كمقروءة');
    } catch (err: any) {
      lordToast.error('فشل تحديث الإشعارات');
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-obsidian-surface/95 backdrop-blur-md border-b border-obsidian-border px-3 sm:px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Right Side (in RTL): Mobile Drawer Hamburger & Official Compact Branding */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('lord_toggle_mobile_sidebar'));
              }
            }}
            className="md:hidden p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-300 hover:text-lord-gold transition-all"
            title="فتح القائمة الرئيسية الموحدة"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-lord-gold/50 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
              <img src="/logo.png" alt="THE LORD" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs sm:text-sm font-black text-white tracking-wide truncate">
              THE LORD <span className="text-lord-gold">C.P</span>
            </span>
          </Link>
        </div>

        {/* Left Side (in RTL): Desktop Full Controls OR Mobile Minimal Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Work Status Dropdown Switcher (Desktop only; on mobile it is in the Drawer) */}
          <div className="hidden md:block">
            <WorkStatusSelector
              workStatus={workStatus}
              updatingStatus={updatingStatus}
              onStatusChange={handleStatusChange}
            />
          </div>

          {/* Floating Tools Controls Popover Trigger (Desktop only) */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setShowToolsMenu((prev) => !prev)}
              className={`p-2 rounded-xl border transition-all ${
                showToolsMenu || showFloatingAi || showFloatingHud
                  ? 'bg-lord-gold/15 border-lord-gold/50 text-lord-gold'
                  : 'bg-obsidian-card border-obsidian-border text-gray-400 hover:text-white'
              }`}
              title="تخصيص العناصر والأيقونات العائمة"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Floating Tools Popover */}
            {showToolsMenu && (
              <div className="absolute left-0 mt-2 w-64 bg-[#0a0d16] border border-lord-gold/40 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 text-right select-none">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-lord-gold" />
                    <span>العناصر العائمة على الشاشة</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowToolsMenu(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {/* AI Assistant Toggle */}
                  <div
                    onClick={() => toggleFloatingTool('ai')}
                    className="p-2.5 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🦁</span>
                      <div>
                        <div className="text-xs font-bold text-white">المساعد TheLordAI</div>
                        <div className="text-[10px] text-gray-400">تحليل الصفقات وصياغة المهام</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        showFloatingAi
                          ? 'bg-lord-gold border-lord-gold text-black font-bold'
                          : 'border-gray-700 bg-gray-800 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>

                  {/* Live HUD Toggle */}
                  <div
                    onClick={() => toggleFloatingTool('hud')}
                    className="p-2.5 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔔</span>
                      <div>
                        <div className="text-xs font-bold text-white">لوحة الرقابة اللحظية</div>
                        <div className="text-[10px] text-gray-400">تنبيهات الصندوق والمهام</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        showFloatingHud
                          ? 'bg-lord-gold border-lord-gold text-black font-bold'
                          : 'border-gray-700 bg-gray-800 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-gray-800/80 text-[10px] text-gray-400 text-center">
                  مخفية افتراضياً لتوفير مساحة نقية ومريحة
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell (Always Visible on Mobile & Desktop) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-400 hover:text-lord-gold hover:border-lord-gold/40 transition-all"
              title="التنبيهات والإشعارات"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-status-danger text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-obsidian-surface animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Language Switcher (Desktop only) */}
          <button
            type="button"
            onClick={() => switchLanguage(locale === 'ar' ? 'en' : 'ar')}
            className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-obsidian-card border border-obsidian-border text-xs text-gray-300 hover:text-white transition-all"
            title="تبديل اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-cyber-blue" />
            <span className="font-bold">{locale.toUpperCase()}</span>
          </button>

          {/* User Badge: Compact Avatar on Mobile, Full Badge on Desktop */}
          {currentUser && (
            currentUser.accessRole === 'TREASURY' ? (
              <div
                className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl bg-obsidian-card border border-amber-500/30"
                title="أمين الصندوق والخزينة"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-xs text-amber-400">
                  {currentUser.fullName ? currentUser.fullName.charAt(0) : 'T'}
                </div>
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-white max-w-[260px] truncate">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold">
                    أمين الصندوق (النظام المحاسبي)
                  </span>
                </div>
              </div>
            ) : (
              <Link
                href={`/${locale}/profile`}
                className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl bg-obsidian-card border border-obsidian-border hover:border-lord-gold/50 transition-all group"
                title="الملف الشخصي"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center font-bold text-xs text-lord-gold group-hover:scale-105 transition-transform">
                  {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-white group-hover:text-lord-gold transition-colors max-w-[260px] truncate">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {currentUser.accessRole === 'SUPER_ADMIN' ? 'المدير العام' : 'موظف'}
                  </span>
                </div>
              </Link>
            )
          )}

          {/* Logout Button (Desktop only; on mobile it is in the Drawer) */}
          <button
            type="button"
            onClick={handleLogout}
            className="hidden md:flex p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-all"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide-out Notification Drawer */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notificationsList}
        onPlayChime={playNotificationChime}
      />

      {/* Mobile Floating HUD (Rendered only if explicitly enabled by user) */}
      {showFloatingHud && (
        <MobileFloatingHud
          showMobileOverlay={showFloatingHud}
          setShowMobileOverlay={(show) => {
            setShowFloatingHud(show);
            localStorage.setItem('lord_show_floating_hud', show ? 'true' : 'false');
            window.dispatchEvent(new Event('lord_floating_tools_updated'));
          }}
          isMobileOverlayMinimized={isMobileOverlayMinimized}
          setIsMobileOverlayMinimized={setIsMobileOverlayMinimized}
          unreadCount={unreadCount}
          hasNativeNotificationPermission={hasNativeNotificationPermission}
          requestNotificationPermission={requestNotificationPermission}
          notificationsList={notificationsList}
          playNotificationChime={playNotificationChime}
          onMarkAllAsRead={handleMarkAllRead}
        />
      )}
    </header>
  );
};
