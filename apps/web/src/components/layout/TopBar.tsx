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
  TrendingUp,
  Sparkles,
  LogOut,
  Clock,
  Coffee,
  Play,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  CheckCheck,
  Radio,
  Layers,
  Minimize2,
  X,
  Volume2,
  Smartphone
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { toast } from 'sonner';
import { WorkStatus, INotification } from '@lord/shared-types';
import { useSocket } from '../../providers/SocketProvider';
import {
  useGetMyNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation
} from '../../store/api/notificationsApi';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

export const TopBar: React.FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isRtl = locale === 'ar';
  const { socket } = useSocket();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workStatus, setWorkStatus] = useState<WorkStatus>('LOGGED_IN');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Floating Overlay & HUD states (Desktop PiP & Mobile HUD)
  const [showMobileOverlay, setShowMobileOverlay] = useState(true);
  const [isMobileOverlayMinimized, setIsMobileOverlayMinimized] = useState(true);
  const [hasNativeNotificationPermission, setHasNativeNotificationPermission] = useState(false);
  const pipWindowRef = useRef<any>(null);

  // Real MongoDB notifications via RTK Query
  const { data: notificationsData, refetch: refetchNotifications } = useGetMyNotificationsQuery();
  const [markAsRead] = useMarkAsReadMutation();
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
          toast.success('تم تفعيل إشعارات الهاتف والنظام في الخلفية!');
        } else {
          toast.info('تم رفض الإذن بإشعارات النظام');
        }
      } catch (e) {
        toast.error('تعذر طلب إذن الإشعارات');
      }
    }
  };

  // Synthesized Executive Notification Chime (Zero-latency Web Audio API)
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) { }
  };

  // Document Picture-in-Picture Floating Overlay & Mobile HUD
  const openFloatingPIP = async () => {
    // Check if Desktop Document Picture-in-Picture is supported
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          pipWindowRef.current.focus();
          toast.info('النافذة العائمة قيد التشغيل بالفعل');
          return;
        }

        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 360,
          height: 520
        });

        pipWindowRef.current = pipWindow;
        pipWindow.addEventListener('pagehide', () => {
          pipWindowRef.current = null;
        });

        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
          pipWindow.document.head.appendChild(node.cloneNode(true));
        });

        pipWindow.document.title = 'THE LORD OF CRYPTO — Live Executive HUD';
        pipWindow.document.body.className = 'bg-[#07090E] text-white p-0 m-0 font-sans select-none overflow-y-auto';

        const container = pipWindow.document.createElement('div');
        container.innerHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; direction: rtl; background: #07090E; min-height: 100vh; padding: 14px; box-sizing: border-box; color: #fff;">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(212, 175, 55, 0.25); padding-bottom: 12px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #d4af37 0%, #b89020 100%); display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 0 10px rgba(212,175,55,0.4);">
                  🦁
                </div>
                <div>
                  <div style="font-weight: 900; font-size: 12px; color: #D4AF37; letter-spacing: 0.5px;">THE LORD ERP • HUD</div>
                  <div style="font-size: 9px; color: #10b981; display: flex; align-items: center; gap: 4px;">
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span>
                    متصل لحظياً • Live Sync
                  </div>
                </div>
              </div>
              <span style="font-size: 10px; background: rgba(212, 175, 55, 0.15); color: #f59e0b; border: 1px solid rgba(212, 175, 55, 0.3); padding: 3px 8px; border-radius: 9999px; font-weight: bold;">
                PIP عائم
              </span>
            </div>

            <!-- Notifications List -->
            <div id="pip-notifications-list" style="display: flex; flex-direction: column; gap: 8px;">
              ${notificationsList.length === 0
                ? '<div style="text-align: center; color: #6b7280; font-size: 11px; padding: 40px 10px;">لا توجد تنبيهات حالية</div>'
                : notificationsList.slice(0, 15).map(n => `
                    <div style="background: rgba(16, 20, 30, 0.85); border: 1px solid ${n.readStatus ? 'rgba(255,255,255,0.08)' : 'rgba(212, 175, 55, 0.4)'}; padding: 10px; border-radius: 10px; font-size: 11px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: bold; color: ${n.readStatus ? '#9ca3af' : '#fbbf24'};">${n.title}</span>
                        <span style="font-size: 9px; color: #6b7280;">${new Date(n.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style="color: #d1d5db; line-height: 1.4; font-size: 10.5px;">${n.message}</div>
                    </div>
                  `).join('')
              }
            </div>
          </div>
        `;
        pipWindow.document.body.appendChild(container);
        toast.success('تم تفعيل الشاشة العائمة المصغرة خارج المتصفح (Always-on-top PIP)!');
      } catch (err) {
        // Fallback to Mobile Overlay HUD
        setShowMobileOverlay(true);
        setIsMobileOverlayMinimized(false);
        requestNotificationPermission();
      }
    } else {
      // Mobile Browser / Devices without Document PiP
      setShowMobileOverlay(true);
      setIsMobileOverlayMinimized(false);
      requestNotificationPermission();
      toast.success('تم تفعيل الشاشة العائمة للهاتف المحمول!');
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: INotification) => {
      refetchNotifications();
      playNotificationChime();
      toast.info(notification.title, {
        description: notification.message,
        duration: 8000
      });

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

      // Prepend dynamically to Desktop PiP window
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        try {
          const list = pipWindowRef.current.document.getElementById('pip-notifications-list');
          if (list) {
            const newCard = pipWindowRef.current.document.createElement('div');
            newCard.style.cssText = 'background: rgba(20, 26, 40, 0.95); border: 1px solid #d4af37; padding: 10px; border-radius: 10px; font-size: 11px; margin-bottom: 8px; box-shadow: 0 0 12px rgba(212,175,55,0.4);';
            newCard.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: bold; color: #fbbf24;">⚡ ${notification.title}</span>
                <span style="font-size: 9px; color: #10b981; font-weight: bold;">الآن</span>
              </div>
              <div style="color: #ffffff; line-height: 1.4; font-size: 10.5px;">${notification.message}</div>
            `;
            list.insertBefore(newCard, list.firstChild);
          }
        } catch (e) {
          console.warn('PiP update error:', e);
        }
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
    setShowStatusMenu(false);
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
      toast.success(`تم تحديث حالتك إلى: ${statusLabels[newStatus]}`);
    } catch (err) {
      toast.error((err as Error).message);
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
    toast.info('تم تسجيل الخروج بنجاح');
    router.push(`/${locale}/logged-out`);
  };

  const getStatusBadge = (status: WorkStatus) => {
    switch (status) {
      case 'WORKING':
        return {
          label: 'قيد العمل ⚡',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
        };
      case 'ON_BREAK':
        return {
          label: 'استراحة ☕',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        };
      case 'LOGGED_OUT':
        return {
          label: 'تم تسجيل الخروج',
          color: 'bg-red-500/20 text-red-400 border-red-500/40'
        };
      case 'LOGGED_IN':
      default:
        return {
          label: 'تم تسجيل الدخول 🟢',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
    }
  };

  const badge = getStatusBadge(workStatus);

  return (
    <header className="sticky top-0 z-30 w-full bg-obsidian-surface/90 backdrop-blur-md border-b border-obsidian-border px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Side: Live Tickers */}
        <div className="hidden xl:flex items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-lord-gold font-bold bg-lord-gold/10 px-2.5 py-1 rounded-lg border border-lord-gold/20">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>BTC $91,420</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyber-blue font-bold bg-cyber-blue/10 px-2.5 py-1 rounded-lg border border-cyber-blue/20">
            <span>ETH $3,450</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span>USDT BEP20</span>
          </div>
        </div>

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
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={updatingStatus}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${badge.color}`}
            >
              <span>{badge.label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 sm:left-auto mt-2 w-48 bg-obsidian-card border border-lord-gold/40 rounded-2xl shadow-2xl overflow-hidden z-50 p-1 divide-y divide-gray-800">
                <div className="p-2 text-[10px] text-gray-400 font-semibold">تغيير حالة العمل اللحظية:</div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('LOGGED_IN')}
                    className="w-full text-right px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg flex items-center justify-between"
                  >
                    <span>تم تسجيل الدخول</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange('WORKING')}
                    className="w-full text-right px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 rounded-lg flex items-center justify-between font-bold"
                  >
                    <span>قيد العمل ⚡</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange('ON_BREAK')}
                    className="w-full text-right px-3 py-2 text-xs text-blue-300 hover:bg-blue-500/10 rounded-lg flex items-center justify-between"
                  >
                    <span>في استراحة ☕</span>
                    <Coffee className="w-3.5 h-3.5 text-blue-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange('LOGGED_OUT')}
                    className="w-full text-right px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-between"
                  >
                    <span>تسجيل الخروج 🔴</span>
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Display Pill */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-card border border-obsidian-border text-xs">
              <span className="text-gray-400 text-[11px]">
                {currentUser.accessRole === 'SUPER_ADMIN' ? '👑 الإدارة' : currentUser.accessRole === 'TREASURY' ? '🪙 الصندوق' : '💼 موظف'}:
              </span>
              <span className="text-white font-bold max-w-[120px] truncate">{currentUser.fullName}</span>
            </div>
          )}

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => switchLanguage(locale === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-xs text-gray-300 hover:text-lord-gold transition-all"
            title="تبديل اللغة / Switch Language"
          >
            <Globe className="w-4 h-4 text-lord-gold" />
            <span className="font-bold">{locale === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Floating Overlay & PIP Button (Visible on mobile & desktop) */}
          <button
            type="button"
            onClick={openFloatingPIP}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-lord-gold/15 via-[#1a1711] to-lord-gold/5 border border-lord-gold/50 text-lord-gold hover:text-white hover:border-lord-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all text-xs shadow-md font-bold shrink-0"
            title="تفعيل الشاشة العائمة المصغرة والإشعارات اللحظية (Mobile Floating HUD & PIP)"
          >
            <span className="text-sm">🦁</span>
            <span className="hidden sm:inline">النافذة العائمة</span>
            <span className="sm:hidden text-[11px]">عائم</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-300 hover:text-lord-gold transition-all relative flex items-center justify-center hover:border-lord-gold/40"
              title="مركز الإشعارات والتنبيهات المباشرة"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-status-danger text-white text-[10px] font-black absolute -top-1.5 -right-1.5 flex items-center justify-center shadow-lg border-2 border-obsidian-primary animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Full Screen Slide-over Notification Drawer */}
          <NotificationDrawer
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={notificationsList}
            onPlayChime={playNotificationChime}
          />

          {/* Direct Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="تسجيل الخروج من المنظومة"
            className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Floating Overlay HUD (For Mobile & PWA real-time supervisory) */}
      {showMobileOverlay && (
        <>
          {isMobileOverlayMinimized ? (
            /* Minimized Floating Gold Lion Orb */
            <div
              className="fixed bottom-20 right-3.5 z-[99999] cursor-pointer group select-none animate-in fade-in zoom-in duration-200"
              onClick={() => setIsMobileOverlayMinimized(false)}
              title="فتح اللوحة العائمة المصغرة (THE LORD HUD)"
            >
              <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-[#07090E] via-[#161a26] to-[#2a2212] border-2 border-lord-gold shadow-[0_0_25px_rgba(212,175,55,0.65),inset_0_1px_2px_rgba(255,255,255,0.3)] transition-transform hover:scale-110 active:scale-95">
                <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">🦁</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-status-danger text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-obsidian-primary animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#07090E] shadow-[0_0_6px_#10b981]" />
                <span className="absolute inset-0 rounded-full border border-lord-gold/40 animate-ping opacity-25 pointer-events-none" />
              </div>
            </div>
          ) : (
            /* Expanded Luxury Glass Floating Panel */
            <div className="fixed bottom-20 right-2 sm:bottom-6 sm:right-6 z-[99999] w-[95vw] max-w-[370px] bg-[#07090E]/95 backdrop-blur-3xl border-2 border-lord-gold/60 rounded-3xl shadow-[0_12px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.3)] p-3.5 text-white animate-in fade-in slide-in-from-bottom-5 duration-200 select-none">
              {/* HUD Top Bar */}
              <div className="flex items-center justify-between border-b border-lord-gold/30 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-lord-gold to-amber-700 flex items-center justify-center shadow-md">
                    <span className="text-sm">🦁</span>
                  </div>
                  <div>
                    <div className="text-xs font-black text-lord-gold tracking-wide">THE LORD • لوحة عائمة</div>
                    <div className="text-[9px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      تحديث لحظي نشط
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsMobileOverlayMinimized(true)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    title="تصغير اللوحة لأيقونة عائمة"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileOverlay(false)}
                    className="p-1 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                    title="إغلاق اللوحة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Permission Banner if Not Granted */}
              {!hasNativeNotificationPermission && (
                <div className="mb-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-amber-200 leading-tight">
                    تفعيل إشعارات الهاتف عند إغلاق التطبيق (PWA)
                  </div>
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className="px-2 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-bold hover:bg-amber-400 transition-all whitespace-nowrap shadow-sm"
                  >
                    تفعيل الآن 🔔
                  </button>
                </div>
              )}

              {/* Action Controls */}
              <div className="flex items-center justify-between gap-2 px-1 mb-2 text-[10px]">
                <span className="text-gray-400">التنبيهات المباشرة ({notificationsList.length})</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={playNotificationChime}
                    className="text-gray-300 hover:text-lord-gold flex items-center gap-1 transition-all"
                    title="تجربة صوت التنبيه"
                  >
                    <Volume2 className="w-3 h-3 text-lord-gold" />
                    <span>فحص الصوت</span>
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        await markAllAsRead().unwrap();
                        toast.info('تم تحديد جميع الإشعارات كمقروءة');
                      }}
                      className="text-lord-gold hover:underline font-bold"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications Scroll Container */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-right divide-y divide-gray-800/60">
                {notificationsList.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs">
                    <Bell className="w-6 h-6 mx-auto mb-1 opacity-30 text-lord-gold" />
                    <span>لا توجد تنبيهات واردة حالياً</span>
                  </div>
                ) : (
                  notificationsList.slice(0, 10).map((n) => (
                    <div
                      key={n._id}
                      className={`pt-2 pb-1 transition-all ${n.readStatus ? 'opacity-70' : 'bg-lord-gold/5 rounded-lg px-2 border border-lord-gold/20'}`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-[11px] font-bold truncate ${n.readStatus ? 'text-gray-300' : 'text-lord-gold'}`}>
                          {n.title}
                        </span>
                        <span className="text-[9px] text-gray-500 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-300 leading-snug break-words">
                        {n.message}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer info */}
              <div className="mt-2.5 pt-2 border-t border-gray-800 flex items-center justify-between text-[9px] text-gray-500">
                <span>👑 الرقابة الملكية اللحظية</span>
                <span>تزامن تلقائي بدون إعادة تحميل</span>
              </div>
            </div>
          )}
        </>
      )}
    </header>
  );
};
