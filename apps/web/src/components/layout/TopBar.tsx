'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Bell,
  Search,
  Globe,
  Shield,
  Briefcase,
  Coins,
  LogOut,
  Layers,
  Smartphone
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { WorkStatus, INotification } from '@lord/shared-types';
import { useSocket } from '../../providers/SocketProvider';
import {
  useGetMyNotificationsQuery,
  useMarkAllAsReadMutation
} from '../../store/api/notificationsApi';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { lordToast } from '../../lib/lordToast';

// Modular Subcomponents
import { CryptoTickerChips } from './CryptoTickerChips';
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

  // Floating Overlay & HUD states (Desktop PiP & Mobile HUD)
  const [showMobileOverlay, setShowMobileOverlay] = useState(true);
  const [isMobileOverlayMinimized, setIsMobileOverlayMinimized] = useState(true);
  const [hasNativeNotificationPermission, setHasNativeNotificationPermission] = useState(false);
  const pipWindowRef = useRef<any>(null);

  // RTK Query Notifications
  const { data: notificationsData, refetch: refetchNotifications } = useGetMyNotificationsQuery();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const notificationsList: INotification[] = notificationsData?.data || [];
  const unreadCount = notificationsData?.meta?.unreadCount ?? notificationsList.filter(n => !n.readStatus).length;

  // Register PWA Service Worker & Check Notification Permission
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW registration:', err);
        });
      }
      if ('Notification' in window) {
        setHasNativeNotificationPermission(window.Notification.permission === 'granted');
      }
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

  // Desktop Always-On-Top Floating HUD (Document Picture-in-Picture API)
  const toggleFloatingOverlay = async () => {
    if (typeof window === 'undefined') return;

    if ('documentPictureInPicture' in window) {
      try {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          pipWindowRef.current.close();
          pipWindowRef.current = null;
          lordToast.gold('تم إغلاق النافذة العائمة المستقلة');
          return;
        }

        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 360,
          height: 380
        });

        pipWindowRef.current = pipWindow;

        pipWindow.document.body.style.cssText = 'margin:0; padding:16px; background:#07090e; color:#ffffff; font-family:system-ui, -apple-system, sans-serif; direction:rtl; overflow-y:auto;';
        pipWindow.document.title = 'THE LORD • الرقابة اللحظية العائمة';

        const container = pipWindow.document.createElement('div');
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(212,175,55,0.3); padding-bottom:10px; margin-bottom:12px;">
            <div style="font-weight:900; color:#d4af37; font-size:13px; display:flex; align-items:center; gap:6px;">
              <span>🦁</span> <span>THE LORD OF CRYPTO</span>
            </div>
            <div style="font-size:10px; background:rgba(16,185,129,0.2); color:#10b981; border:1px solid rgba(16,185,129,0.4); padding:2px 8px; border-radius:99px; font-weight:bold;">
              ● متصل لحظياً
            </div>
          </div>
          <div id="pip-notifications-list" style="display:flex; flex-direction:column; gap:8px;">
            ${notificationsList.slice(0, 5).map(n => `
              <div style="background:rgba(20, 26, 40, 0.8); border:1px solid rgba(255,255,255,0.1); padding:8px 10px; border-radius:10px; font-size:11px;">
                <div style="font-weight:bold; color:#fbbf24; margin-bottom:3px;">${n.title}</div>
                <div style="color:#9ca3af; font-size:10px; line-height:1.3;">${n.message}</div>
              </div>
            `).join('')}
          </div>
        `;

        pipWindow.document.body.appendChild(container);
        lordToast.success('تم تفعيل النافذة العائمة المستقلة فوق كل الشاشات!');
      } catch (err) {
        setIsMobileOverlayMinimized(false);
        setShowMobileOverlay(true);
        lordToast.gold('تم تفعيل اللوحة العائمة المدمجة');
      }
    } else {
      setIsMobileOverlayMinimized(false);
      setShowMobileOverlay(true);
      lordToast.gold('تم تفعيل اللوحة العائمة المدمجة');
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: INotification) => {
      refetchNotifications();
      playNotificationChime();
      lordToast.gold(notification.title, notification.message);

      // Post message to Service Worker for background native alert
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
      // ignore error on logout
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
    <header className="sticky top-0 z-30 w-full bg-obsidian-surface/90 backdrop-blur-md border-b border-obsidian-border px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Side: Live Tickers */}
        <CryptoTickerChips />

        {/* Search Bar */}
        <div className="flex-1 max-w-xs xl:max-w-sm relative hidden md:block">
          <Search className="w-4 h-4 text-gray-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث سريع... (Ctrl+K)"
            className="w-full bg-obsidian-card border border-gray-800 rounded-xl pr-9 pl-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold transition-all"
          />
        </div>

        {/* Right Controls: Work Status Switcher + Language + Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Work Status Dropdown Switcher */}
          <WorkStatusSelector
            workStatus={workStatus}
            updatingStatus={updatingStatus}
            onStatusChange={handleStatusChange}
          />

          {/* Floating HUD Trigger */}
          <button
            type="button"
            onClick={toggleFloatingOverlay}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-lord-gold/30 bg-lord-gold/5 hover:bg-lord-gold/15 text-lord-gold text-xs font-bold transition-all shadow-sm"
            title="تفعيل النافذة العائمة المستقلة فوق كل الشاشات"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">النافذة العائمة</span>
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-400 hover:text-lord-gold hover:border-lord-gold/40 transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-status-danger text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-obsidian-surface animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => switchLanguage(locale === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-obsidian-card border border-obsidian-border text-xs text-gray-300 hover:text-white transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-cyber-blue" />
            <span className="font-bold">{locale.toUpperCase()}</span>
          </button>

          {/* User Badge & Profile Link */}
          {currentUser && (
            <Link
              href={`/${locale}/profile`}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-obsidian-card border border-obsidian-border hover:border-lord-gold/50 transition-all group"
            >
              <div className="w-7 h-7 rounded-lg bg-lord-gold/20 border border-lord-gold/40 flex items-center justify-center font-bold text-xs text-lord-gold group-hover:scale-105 transition-transform">
                {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
              </div>
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-white group-hover:text-lord-gold transition-colors">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-gray-400">
                  {currentUser.accessRole === 'SUPER_ADMIN' ? 'المدير العام' : currentUser.accessRole === 'TREASURY' ? 'أمين الصندوق' : 'موظف'}
                </span>
              </div>
            </Link>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-all"
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

      {/* Mobile Floating HUD */}
      <MobileFloatingHud
        showMobileOverlay={showMobileOverlay}
        setShowMobileOverlay={setShowMobileOverlay}
        isMobileOverlayMinimized={isMobileOverlayMinimized}
        setIsMobileOverlayMinimized={setIsMobileOverlayMinimized}
        unreadCount={unreadCount}
        hasNativeNotificationPermission={hasNativeNotificationPermission}
        requestNotificationPermission={requestNotificationPermission}
        notificationsList={notificationsList}
        playNotificationChime={playNotificationChime}
        onMarkAllAsRead={handleMarkAllRead}
      />
    </header>
  );
};
