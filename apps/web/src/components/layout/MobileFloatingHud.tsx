'use client';

import React from 'react';
import { Bell, Minimize2, X, Volume2 } from 'lucide-react';
import { INotification } from '@lord/shared-types';

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
  if (!showMobileOverlay) return null;

  return (
    <>
      {isMobileOverlayMinimized ? (
        /* Minimized Draggable Floating Pill / Badge */
        <div
          onClick={() => setIsMobileOverlayMinimized(false)}
          className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-[99999] cursor-pointer group select-none transition-transform active:scale-95"
          title="انقر لتوسيع شاشة التنبيهات الملكية العائمة"
        >
          <div className="relative w-12 h-12 rounded-full bg-[#07090E] border-2 border-lord-gold/70 shadow-[0_8px_30px_rgba(212,175,55,0.4)] flex items-center justify-center transition-all group-hover:scale-110">
            <span className="text-xl">🦁</span>
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
                  onClick={onMarkAllAsRead}
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
                  className={`pt-2 pb-1 transition-all ${
                    n.readStatus ? 'opacity-70' : 'bg-lord-gold/5 rounded-lg px-2 border border-lord-gold/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-[11px] font-bold truncate ${
                        n.readStatus ? 'text-gray-300' : 'text-lord-gold'
                      }`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[9px] text-gray-500 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleTimeString('ar-YE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
  );
};
