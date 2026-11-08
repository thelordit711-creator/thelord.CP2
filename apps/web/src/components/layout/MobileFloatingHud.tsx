'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Minimize2,
  X,
  Volume2,
  ShieldCheck,
  CheckCheck,
  Coins,
  Briefcase,
  Sparkles,
  ExternalLink,
  Layers,
  Check
} from 'lucide-react';
import { INotification } from '@lord/shared-types';
import { useMarkAsReadMutation } from '../../store/api/notificationsApi';
import { lordToast } from '../../lib/lordToast';

interface MobileFloatingHudProps {
  showMobileOverlay: boolean;
  setShowMobileOverlay: (show: boolean) => void;
  isMobileOverlayMinimized: boolean;
  setIsMobileOverlayMinimized: (min: boolean) => void;
  unreadCount: number;
  hasNativeNotificationPermission: boolean;
  requestNotificationPermission: () => Promise<void>;
  notificationsList: INotification[];
  playNotificationChime: () => void;
  onMarkAllAsRead: () => Promise<void>;
}

type TabType = 'ALL' | 'TREASURY' | 'TASKS' | 'ADMIN';

export const MobileFloatingHud: React.FC<MobileFloatingHudProps> = ({
  showMobileOverlay,
  setShowMobileOverlay,
  isMobileOverlayMinimized,
  setIsMobileOverlayMinimized,
  unreadCount,
  hasNativeNotificationPermission,
  requestNotificationPermission,
  notificationsList,
  playNotificationChime,
  onMarkAllAsRead
}) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [markAsRead] = useMarkAsReadMutation();

  // Responsive Draggable Position State for the Floating Orb
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 1000, y: 650 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    moved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 1000,
    initialY: 650,
    moved: false
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lord_hud_btn_coords');
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const maxX = winW - 80;
          const maxY = winH - 90;
          setPosition({
            x: Math.min(Math.max(16, parsed.x), maxX),
            y: Math.min(Math.max(16, parsed.y), maxY)
          });
          return;
        } catch (_e) {}
      }

      // Default initial position: Bottom-Right of the viewport (separated from AI Copilot at bottom-left)
      const defaultX = Math.max(16, winW - 90);
      const defaultY = Math.max(80, winH - 140);
      setPosition({ x: defaultX, y: defaultY });
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      moved: false
    };
    setIsDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_e) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      dragRef.current.moved = true;
    }

    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 90;
    const newX = Math.min(Math.max(16, dragRef.current.initialX + deltaX), maxX);
    const newY = Math.min(Math.max(16, dragRef.current.initialY + deltaY), maxY);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_e) {}

    if (typeof window !== 'undefined') {
      localStorage.setItem('lord_hud_btn_coords', JSON.stringify(position));
    }

    // If pointer was clicked without dragging, toggle open/close
    if (!dragRef.current.moved) {
      setIsMobileOverlayMinimized(false);
    }
  };

  // Filtered Notifications based on selected Tab
  const filteredNotifications = useMemo(() => {
    return notificationsList.filter((n) => {
      const titleLower = (n.title || '').toLowerCase();
      const msgLower = (n.message || '').toLowerCase();

      if (activeTab === 'TREASURY') {
        return (
          titleLower.includes('صرف') ||
          titleLower.includes('خزينة') ||
          titleLower.includes('مالي') ||
          titleLower.includes('حوالة') ||
          titleLower.includes('راتب') ||
          titleLower.includes('مكافأة') ||
          msgLower.includes('usdt') ||
          msgLower.includes('صرف') ||
          msgLower.includes('محفظة')
        );
      }
      if (activeTab === 'TASKS') {
        return (
          titleLower.includes('مهمة') ||
          titleLower.includes('مرحلة') ||
          titleLower.includes('مشروع') ||
          titleLower.includes('تسليم') ||
          titleLower.includes('اعتماد') ||
          msgLower.includes('مهمة') ||
          msgLower.includes('مرحلة')
        );
      }
      if (activeTab === 'ADMIN') {
        return (
          titleLower.includes('إدارة') ||
          titleLower.includes('قرار') ||
          titleLower.includes('نظام') ||
          titleLower.includes('أمان') ||
          titleLower.includes('حساب') ||
          msgLower.includes('إداري')
        );
      }
      return true; // ALL
    });
  }, [notificationsList, activeTab]);

  const handleNotificationClick = async (n: INotification) => {
    try {
      if (!n.readStatus) {
        await markAsRead(n._id).unwrap();
      }
      if (n.relatedUrl) {
        router.push(n.relatedUrl);
      }
      setIsMobileOverlayMinimized(true);
    } catch (_e) {}
  };

  if (!showMobileOverlay || !mounted) return null;

  const content = (
    <>
      {isMobileOverlayMinimized ? (
        /* =========================================================================
           1. Minimized Draggable Royal Lion Orb (HUD Badge)
           - Floating freely in document.body (Never trapped by TopBar blur)
           - Draggable anywhere, click to expand
           ========================================================================= */
        <div
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            touchAction: 'none'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="fixed z-[99999] select-none cursor-grab active:cursor-grabbing group transition-transform active:scale-95"
          title="شاشة الرقابة والتنبيهات اللحظية • انقر للتوسيع أو اسحب لتغيير الموضع 🦁"
        >
          {/* Multi-layered Obsidian & Gold Luxury Badge */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#06080e] via-[#111420] to-[#251e11] border-2 border-amber-500/70 shadow-[0_8px_30px_rgba(245,158,11,0.4),0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:border-amber-400 group-hover:shadow-[0_8px_35px_rgba(245,158,11,0.6)]">
            {/* Center Embossed Lion Crest */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] pointer-events-none">
              🦁
            </div>

            {/* Live Socket Connection Dot (Bottom Left) */}
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 absolute -bottom-0.5 -left-0.5 border-2 border-[#06080e] shadow-[0_0_8px_#10b981]" />
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 absolute -bottom-0.5 -left-0.5 border-2 border-[#06080e] animate-ping opacity-75" />

            {/* Unread Notifications Badge (Top Right) */}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-gradient-to-r from-red-600 to-rose-700 text-white text-[11px] font-mono font-black flex items-center justify-center shadow-[0_2px_10px_rgba(225,29,72,0.8)] border-2 border-[#06080e] animate-bounce">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
           2. Expanded Executive Glass HUD Panel
           - Anchored completely within the screen boundaries
           - Clean tabs, chime test, mark all read, PWA push banner
           ========================================================================= */
        <div className="fixed z-[99999] bottom-4 inset-x-2 sm:inset-x-auto sm:right-6 sm:bottom-6 w-auto sm:w-[420px] max-w-[calc(100vw-1rem)] h-[600px] max-h-[85vh] bg-[#080b13]/98 border-2 border-amber-500/50 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(212,175,55,0.25)] flex flex-col overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 select-none text-white">
          {/* Executive Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#141824] via-[#0f131d] to-[#1c170d] border-b border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                🦁
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>THE LORD • لوحة الرقابة اللحظية</span>
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>متصل لحظياً (Socket.io)</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMobileOverlayMinimized(true)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-colors"
                title="تصغير لأيقونة الأسد العائمة"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowMobileOverlay(false)}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                title="إغلاق اللوحة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Permission Banner if Not Granted */}
          {!hasNativeNotificationPermission && (
            <div className="m-2.5 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
              <div className="text-[11px] text-amber-200 leading-tight">
                تفعيل إشعارات الهاتف والويندوز عند إغلاق المنظومة (PWA)
              </div>
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[10px] font-black hover:from-amber-400 hover:to-amber-500 transition-all whitespace-nowrap shadow-md active:scale-95"
              >
                تفعيل الآن 🔔
              </button>
            </div>
          )}

          {/* Category Tabs */}
          <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5 border-b border-gray-800/80 overflow-x-auto no-scrollbar text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              الكل ({notificationsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TREASURY')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'TREASURY'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Coins className="w-3 h-3" />
              <span>الصندوق والمالية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TASKS')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'TASKS'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Briefcase className="w-3 h-3" />
              <span>المهام</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ADMIN')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'ADMIN'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>الإدارة</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-800/60 bg-[#06080d]/80 text-[10px]">
            <span className="text-gray-400 font-mono">
              الوارد ({filteredNotifications.length}) {unreadCount > 0 && `• ${unreadCount} جديد`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={playNotificationChime}
                className="text-gray-300 hover:text-amber-400 flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-all font-semibold"
                title="تجربة صوت النغمة الفاخرة"
              >
                <Volume2 className="w-3 h-3 text-amber-400" />
                <span>فحص الصوت</span>
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all font-bold"
                >
                  <Check className="w-3 h-3" />
                  <span>تحديد الكل كمقروء</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications Scroll Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-gray-800/50 scroll-touch">
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-xs flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2.5">
                  <Bell className="w-6 h-6 text-amber-400/50" />
                </div>
                <span className="text-gray-300 font-bold mb-1">لا توجد تنبيهات في هذا القسم</span>
                <span className="text-gray-500 text-[11px]">المنظومة متزامنة وتعمل بأقصى كفاءة ⚡</span>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`pt-2.5 pb-2 px-3 rounded-2xl transition-all cursor-pointer group ${
                    n.readStatus
                      ? 'bg-transparent hover:bg-gray-800/40 opacity-75'
                      : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 hover:border-amber-400/60 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-xs font-bold truncate flex items-center gap-1.5 ${
                        n.readStatus ? 'text-gray-300 group-hover:text-white' : 'text-amber-400 font-black'
                      }`}
                    >
                      {!n.readStatus && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0 shadow-[0_0_6px_#f59e0b]" />
                      )}
                      <span>{n.title}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleTimeString('ar-YE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-300 leading-relaxed break-words group-hover:text-white transition-colors">
                    {n.message}
                  </div>

                  {n.relatedUrl && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-400/80 group-hover:text-amber-300">
                      <span>عرض التفاصيل</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Luxury Executive Footer */}
          <div className="p-3 bg-[#06080e] border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>THE LORD • رقابة مشفرة ولحظية 24/7</span>
            </span>
            <span className="font-mono text-[9px] text-gray-400">تزامن تلقائي عبر WebSockets</span>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
};
