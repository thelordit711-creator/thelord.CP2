'use client';

import React, { useState, useEffect } from 'react';
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
  Layers
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

  // Real MongoDB notifications via RTK Query
  const { data: notificationsData, refetch: refetchNotifications } = useGetMyNotificationsQuery();
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const notificationsList: INotification[] = notificationsData?.data || [];
  const unreadCount = notificationsData?.meta?.unreadCount ?? notificationsList.filter(n => !n.readStatus).length;

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

  // Document Picture-in-Picture Floating Overlay
  const openFloatingPIP = async () => {
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 340,
          height: 480
        });

        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
          pipWindow.document.head.appendChild(node.cloneNode(true));
        });

        pipWindow.document.title = 'THE LORD OF CRYPTO — Live Floating Panel';
        pipWindow.document.body.className = 'bg-[#0b0e14] text-white p-4 font-sans select-none overflow-y-auto';

        const container = pipWindow.document.createElement('div');
        container.innerHTML = `
          <div style="font-family: system-ui, sans-serif; direction: rtl; padding: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1f2937; padding-bottom: 10px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">🦁</span>
                <span style="font-weight: 900; font-size: 13px; color: #f59e0b;">THE LORD C.P</span>
              </div>
              <span style="font-size: 10px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 6px; border-radius: 9999px;">عائم نشط PIP</span>
            </div>
            <div id="pip-notifications-list" style="display: flex; flex-direction: column; gap: 8px;">
              ${notificationsList.length === 0
            ? '<div style="text-align: center; color: #6b7280; font-size: 11px; padding: 20px;">لا توجد تنبيهات حالية</div>'
            : notificationsList.slice(0, 8).map(n => `
                    <div style="background: rgba(17, 24, 39, 0.8); border: 1px solid #374151; padding: 10px; border-radius: 12px; font-size: 11px;">
                      <div style="font-weight: bold; color: ${n.readStatus ? '#9ca3af' : '#fbbf24'}; margin-bottom: 4px;">${n.title}</div>
                      <div style="color: #d1d5db; line-height: 1.4;">${n.message}</div>
                      <div style="font-size: 9px; color: #6b7280; margin-top: 6px;">${new Date(n.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  `).join('')
          }
            </div>
          </div>
        `;
        pipWindow.document.body.appendChild(container);
        toast.success('تم تفعيل الشاشة العائمة المصغرة خارج المتصفح (Always-on-top PIP)!');
      } catch (err) {
        toast.error('تعذر تفعيل نافذة PiP: ' + (err as Error).message);
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await window.Notification.requestPermission();
        if (perm === 'granted') {
          toast.success('تم تفعيل إشعارات سطح المكتب بنجاح!');
        } else {
          toast.info('تم رفض إذن إشعارات سطح المكتب');
        }
      } else {
        toast.info('ميزة PIP غير مدعومة في هذا المتصفح');
      }
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

      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
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
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
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
        <div className="flex-1 max-w-md relative hidden sm:block">
          <Search className="w-4 h-4 text-gray-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث سريع في المنظومة... (Ctrl+K)"
            className="w-full bg-obsidian-card border border-gray-800 rounded-xl pr-9 pl-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold transition-all"
          />
        </div>

        {/* Right Controls: Work Status Switcher + Language + Logout */}
        <div className="flex items-center gap-3">
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

          {/* Floating Picture-in-Picture Button */}
          <button
            type="button"
            onClick={openFloatingPIP}
            className="hidden sm:flex items-center gap-1.5 p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-300 hover:text-lord-gold hover:border-lord-gold/40 transition-all text-xs"
            title="تفعيل النافذة العائمة المصغرة خارج النظام (Document PIP)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-lord-gold" />
            <span className="font-bold text-[11px]">عائم PIP</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-300 hover:text-lord-gold transition-all relative flex items-center justify-center"
              title="مركز الإشعارات والتنبيهات"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-status-danger text-white text-[10px] font-black absolute -top-1.5 -right-1.5 flex items-center justify-center shadow-lg border-2 border-obsidian-primary animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 sm:right-auto sm:left-0 mt-3 w-88 max-w-[340px] bg-obsidian-card border border-lord-gold/40 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-3 bg-obsidian-surface border-b border-obsidian-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">مركز الإشعارات اللحظية</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-lord-gold/20 text-lord-gold text-[10px] font-bold">
                        {unreadCount} جديد
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        await markAllAsRead().unwrap();
                        toast.info('تم تحديد جميع الإشعارات كمقروءة');
                      }}
                      className="text-[10px] text-lord-gold hover:underline font-bold flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>تحديد الكل كمقروء</span>
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-800/80 max-h-80 overflow-y-auto">
                  {notificationsList.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                      <Bell className="w-8 h-8 text-gray-600 opacity-40" />
                      <span>لا توجد إشعارات حالياً</span>
                    </div>
                  ) : (
                    notificationsList.map((n) => (
                      <div
                        key={n._id}
                        onClick={async () => {
                          if (!n.readStatus) await markAsRead(n._id).unwrap();
                          if (n.relatedUrl) router.push(n.relatedUrl);
                          setShowNotifications(false);
                        }}
                        className={`p-3 text-xs transition-colors hover:bg-obsidian-surface cursor-pointer ${!n.readStatus ? 'bg-lord-gold/10 border-r-2 border-lord-gold' : 'opacity-80'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <strong className={`font-bold text-xs ${!n.readStatus ? 'text-lord-gold' : 'text-gray-300'}`}>
                            {n.title}
                          </strong>
                          {!n.readStatus && (
                            <span className="w-2 h-2 rounded-full bg-lord-gold" />
                          )}
                        </div>
                        <p className="text-gray-300 leading-relaxed text-[11px] line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
    </header>
  );
};
