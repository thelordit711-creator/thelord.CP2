'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  X,
  Bell,
  CheckCheck,
  Coins,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  Volume2,
  Filter,
  Check
} from 'lucide-react';
import { INotification } from '@lord/shared-types';
import {
  useMarkAsReadMutation,
  useMarkAllAsReadMutation
} from '../../store/api/notificationsApi';
import { toast } from 'sonner';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: INotification[];
  onPlayChime?: () => void;
}

type TabType = 'ALL' | 'TREASURY' | 'TASKS' | 'CHAT';

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onPlayChime
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.readStatus).length;
  }, [notifications]);

  // Tab categorization
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const titleLower = (n.title || '').toLowerCase();
      const msgLower = (n.message || '').toLowerCase();

      if (activeTab === 'TREASURY') {
        return (
          titleLower.includes('صرف') ||
          titleLower.includes('خزينة') ||
          titleLower.includes('مالي') ||
          titleLower.includes('حوالة') ||
          msgLower.includes('usdt') ||
          msgLower.includes('صرف')
        );
      }
      if (activeTab === 'TASKS') {
        return (
          titleLower.includes('مهمة') ||
          titleLower.includes('مرحلة') ||
          titleLower.includes('مشروع') ||
          titleLower.includes('اعتماد') ||
          msgLower.includes('مهمة') ||
          msgLower.includes('مرحلة')
        );
      }
      if (activeTab === 'CHAT') {
        return (
          titleLower.includes('رسالة') ||
          titleLower.includes('محادثة') ||
          titleLower.includes('دردشة') ||
          titleLower.includes('قناة') ||
          msgLower.includes('رسالة')
        );
      }
      return true; // ALL
    });
  }, [notifications, activeTab]);

  const handleMarkAll = async () => {
    try {
      await markAllAsRead().unwrap();
      toast.success('تم تحديد جميع الإشعارات كمقروءة');
    } catch (_e) {
      toast.error('تعذر تحديث حالة الإشعارات');
    }
  };

  const handleNotificationClick = async (n: INotification) => {
    try {
      if (!n.readStatus) {
        await markAsRead(n._id).unwrap();
      }
      if (n.relatedUrl) {
        router.push(n.relatedUrl);
      }
      onClose();
    } catch (_e) { }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-hidden select-none">
      {/* Dim Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed top-0 bottom-0 left-0 w-full max-w-md bg-[#07090E] border-r border-lord-gold/40 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_30px_rgba(212,175,55,0.15)] h-screen flex flex-col z-10 animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="p-4 bg-obsidian-surface/90 border-b border-obsidian-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-lord-gold/30 via-lord-gold/10 to-transparent border border-lord-gold/40 flex items-center justify-center text-lord-gold shadow-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">مركز الإشعارات اللحظية</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-lord-gold text-black text-[10px] font-black animate-pulse">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">تحديثات المنظومة والمهام والمالية المباشرة</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onPlayChime && (
              <button
                type="button"
                onClick={onPlayChime}
                title="فحص صوت التنبيه"
                className="p-2 rounded-xl text-gray-400 hover:text-lord-gold hover:bg-white/5 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categorized Tabs Header */}
        <div className="flex items-center gap-1 p-2 bg-[#0a0d14] border-b border-gray-800/80 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-lord-gold text-black shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>الكل</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TREASURY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'TREASURY'
                ? 'bg-lord-gold text-black shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>المالية والخزينة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TASKS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'TASKS'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>المهام والمراحل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CHAT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'CHAT'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>المحادثات</span>
          </button>
        </div>

        {/* Global Action Toolbar */}
        <div className="px-4 py-2.5 bg-obsidian-card/60 border-b border-gray-800/80 flex items-center justify-between text-xs">
          <span className="text-gray-400 text-[11px]">
            عرض {filteredNotifications.length} من أصل {notifications.length} إشعار
          </span>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-lord-gold hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* Scrollable Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60 p-2 space-y-1">
          {filteredNotifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 opacity-40 text-lord-gold" />
              </div>
              <p className="font-bold text-gray-300 text-xs">لا توجد إشعارات في هذا التصنيف</p>
              <p className="text-[11px] text-gray-500 mt-1">سيتم إدراج أي أحداث فور وقوعها بنظام المزامنة اللحظية</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isUnread = !n.readStatus;
              return (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 rounded-xl transition-all cursor-pointer group select-none ${
                    isUnread
                      ? 'bg-gradient-to-r from-lord-gold/10 to-transparent border border-lord-gold/30 hover:border-lord-gold/60'
                      : 'hover:bg-white/5 border border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-lord-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                      )}
                      <h4 className={`text-xs font-bold ${isUnread ? 'text-lord-gold' : 'text-gray-200'}`}>
                        {n.title}
                      </h4>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-800/40 text-[10px]">
                    <span className="text-gray-500">
                      {new Date(n.createdAt).toLocaleDateString('ar-YE')}
                    </span>
                    {n.relatedUrl && (
                      <span className="text-cyber-blue group-hover:underline flex items-center gap-1 font-bold">
                        <span>فتح الرابط</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Status */}
        <div className="p-3 bg-obsidian-surface border-t border-obsidian-border flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium">اتصال مباشر (WebSocket)</span>
          </div>
          <span className="font-mono text-gray-500 text-[10px]">THE LORD ERP 2.0</span>
        </div>
      </div>
    </div>,
    document.body
  );
};


