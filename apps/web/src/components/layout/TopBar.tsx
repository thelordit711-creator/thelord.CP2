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
  ChevronDown
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { toast } from 'sonner';
import { WorkStatus } from '@lord/shared-types';
import { useSocket } from '../../providers/SocketProvider';

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

  const [notifications, setNotifications] = useState<Array<{ id: string | number; text: string; time: string; unread: boolean }>>([]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const isLeader = currentUser.accessRole === 'SUPER_ADMIN';
    const isTreasury = currentUser.accessRole === 'TREASURY';
    const isEmployee = currentUser.accessRole === 'EMPLOYEE';

    const handlePayoutNewOrder = (data: any) => {
      if (isLeader || isTreasury) {
        setNotifications(prev => [
          {
            id: Date.now(),
            text: `أمر صرف جديد ورد للصندوق: ${data.amount} ${data.currency}`,
            time: 'الآن',
            unread: true
          },
          ...prev
        ]);
      }
    };

    const handleStageSubmitted = (data: any) => {
      if (isLeader) {
        setNotifications(prev => [
          {
            id: Date.now(),
            text: `تسليم مرحلة للمراجعة: ${data.stageTitle || 'مرحلة جديدة'} بواسطة ${data.employeeName || 'كادر'}`,
            time: 'الآن',
            unread: true
          },
          ...prev
        ]);
      }
    };

    const handleStageApproved = (data: any) => {
      if (isEmployee) {
        setNotifications(prev => [
          {
            id: Date.now(),
            text: `تم اعتماد مرحلتك بنجاح! ${data.nextStageUnlocked ? 'تم فتح المرحلة التالية.' : 'اكتملت المهمة.'}`,
            time: 'الآن',
            unread: true
          },
          ...prev
        ]);
      }
    };

    const handleMeetingInvite = (data: any) => {
      setNotifications(prev => [
        {
          id: Date.now(),
          text: `دعوة لاجتماع مباشر من ${data.inviterName || 'المسؤول'}`,
          time: 'الآن',
          unread: true
        },
        ...prev
      ]);
    };

    socket.on('payout:new_order', handlePayoutNewOrder);
    socket.on('stage:submitted', handleStageSubmitted);
    socket.on('stage:approved', handleStageApproved);
    socket.on('meeting:invite', handleMeetingInvite);

    return () => {
      socket.off('payout:new_order', handlePayoutNewOrder);
      socket.off('stage:submitted', handleStageSubmitted);
      socket.off('stage:approved', handleStageApproved);
      socket.off('meeting:invite', handleMeetingInvite);
    };
  }, [socket, currentUser]);

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

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl bg-obsidian-card border border-obsidian-border text-gray-300 hover:text-lord-gold transition-all relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => n.unread) && (
                <span className="w-2 h-2 rounded-full bg-status-danger absolute top-1.5 right-1.5 ring-2 ring-obsidian-primary animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 sm:right-auto sm:left-0 mt-3 w-80 bg-obsidian-card border border-lord-gold/40 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-3 bg-obsidian-surface border-b border-obsidian-border flex items-center justify-between">
                  <span className="text-xs font-bold text-white">مركز الإشعارات اللحظية</span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                        toast.info('تم تعليم جميع الإشعارات كمقروءة');
                      }}
                      className="text-[10px] text-lord-gold hover:underline"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-800/80 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-xs">
                      لا توجد إشعارات جديدة حالياً
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition-colors hover:bg-obsidian-surface ${
                          n.unread ? 'bg-lord-gold/5' : ''
                        }`}
                      >
                        <p className="text-gray-200 leading-relaxed">{n.text}</p>
                        <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                          {n.time}
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
