'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Coins,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
  Bell,
  X,
  ExternalLink,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import { INotification } from '@lord/shared-types';
import { useSocket } from '../../providers/SocketProvider';

export interface DynamicNotificationPayload {
  id?: string;
  title: string;
  message: string;
  type?: 'TREASURY' | 'TASK' | 'CHAT' | 'URGENT' | 'SYSTEM' | string;
  relatedUrl?: string;
  actionLabel?: string;
  timestamp?: number;
}

export const DynamicIslandNotification: React.FC = () => {
  const { socket } = useSocket();
  const router = useRouter();
  const locale = useLocale();

  const [activeAlert, setActiveAlert] = useState<DynamicNotificationPayload | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesized Luxury Sound (Zero-latency Web Audio API)
  const playChime = (type?: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'URGENT') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      } else if (type === 'TREASURY') {
        // Gold coin register chime
        osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12); // C6
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      } else {
        // High luxury chime
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (_e) { }

    // Haptic pulse on mobile devices
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate([25, 30, 25]);
      } catch (_e) { }
    }
  };

  const triggerAlert = (payload: DynamicNotificationPayload) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setActiveAlert(payload);
    setIsVisible(true);
    setIsExpanded(false);
    playChime(payload.type);

    timerRef.current = setTimeout(() => {
      dismissAlert();
    }, 7000);
  };

  const dismissAlert = () => {
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => {
      setActiveAlert(null);
      setIsExpanded(false);
    }, 300);
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: INotification) => {
      let inferredType: DynamicNotificationPayload['type'] = 'SYSTEM';
      const titleLower = (notification.title || '').toLowerCase();
      const msgLower = (notification.message || '').toLowerCase();

      if (titleLower.includes('صرف') || titleLower.includes('مالي') || titleLower.includes('خزينة') || titleLower.includes('حوالة') || msgLower.includes('usdt')) {
        inferredType = 'TREASURY';
      } else if (titleLower.includes('مهمة') || titleLower.includes('مرحلة') || titleLower.includes('مشروع') || titleLower.includes('اعتماد')) {
        inferredType = 'TASK';
      } else if (titleLower.includes('رسالة') || titleLower.includes('محادثة') || titleLower.includes('دردشة')) {
        inferredType = 'CHAT';
      } else if (notification.priority === 'URGENT' || titleLower.includes('عاجل') || titleLower.includes('تحذير')) {
        inferredType = 'URGENT';
      }

      triggerAlert({
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: inferredType,
        relatedUrl: notification.relatedUrl,
        timestamp: Date.now()
      });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [socket]);

  // Expose a custom window event trigger so any component can invoke the dynamic island directly
  useEffect(() => {
    const handleCustomTrigger = (event: CustomEvent<DynamicNotificationPayload>) => {
      if (event.detail) {
        triggerAlert(event.detail);
      }
    };

    window.addEventListener('lord:island_alert' as any, handleCustomTrigger);
    return () => {
      window.removeEventListener('lord:island_alert' as any, handleCustomTrigger);
    };
  }, []);

  if (!activeAlert || !isVisible) return null;

  const getStyleForType = () => {
    switch (activeAlert.type) {
      case 'TREASURY':
        return {
          icon: Coins,
          glow: 'shadow-[0_0_25px_rgba(212,175,55,0.45)] border-lord-gold/60',
          accent: 'text-lord-gold',
          badgeBg: 'bg-lord-gold/20 text-lord-gold border border-lord-gold/40',
          label: 'الخزينة والمالية',
          btnBg: 'bg-lord-gold text-black hover:bg-amber-400'
        };
      case 'TASK':
        return {
          icon: CheckSquare,
          glow: 'shadow-gold-glow border-lord-gold/50',
          accent: 'text-lord-gold',
          badgeBg: 'bg-lord-gold/15 text-lord-gold border border-lord-gold/30',
          label: 'المهام والمشاريع',
          btnBg: 'bg-lord-gold text-black hover:bg-lord-gold/90'
        };
      case 'CHAT':
        return {
          icon: MessageSquare,
          glow: 'shadow-gold-glow border-lord-gold/50',
          accent: 'text-lord-gold',
          badgeBg: 'bg-lord-gold/15 text-lord-gold border border-lord-gold/30',
          label: 'محادثة مباشرة',
          btnBg: 'bg-lord-gold text-black hover:bg-lord-gold/90'
        };
      case 'URGENT':
        return {
          icon: AlertTriangle,
          glow: 'shadow-[0_0_30px_rgba(239,68,68,0.5)] border-red-500/60 animate-pulse',
          accent: 'text-red-400',
          badgeBg: 'bg-red-500/20 text-red-300 border border-red-500/40',
          label: 'تنبيه عاجل',
          btnBg: 'bg-red-600 text-white hover:bg-red-500'
        };
      default:
        return {
          icon: Bell,
          glow: 'shadow-[0_0_25px_rgba(212,175,55,0.35)] border-lord-gold/40',
          accent: 'text-lord-gold',
          badgeBg: 'bg-lord-gold/15 text-lord-gold border border-lord-gold/30',
          label: 'إشعار النظام',
          btnBg: 'bg-lord-gold text-black hover:bg-amber-400'
        };
    }
  };

  const style = getStyleForType();
  const Icon = style.icon;

  const handleAction = () => {
    if (activeAlert.relatedUrl) {
      router.push(activeAlert.relatedUrl);
    }
    dismissAlert();
  };

  return (
    <div className="fixed top-3 inset-x-0 z-[99999] flex justify-center px-3 pointer-events-none select-none transition-all duration-300 ease-out">
      <div
        className={`pointer-events-auto w-full max-w-md bg-[#07090E]/95 backdrop-blur-2xl rounded-2xl border ${style.glow} text-white transition-all duration-300 p-3 sm:p-3.5 transform translate-y-0`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-2.5">
          {/* Leading Icon & Tag */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.badgeBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${style.badgeBg}`}>
                  {style.label}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">الآن</span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {activeAlert.title}
              </h4>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {activeAlert.relatedUrl && (
              <button
                type="button"
                onClick={handleAction}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 ${style.btnBg}`}
              >
                <span>{activeAlert.actionLabel || 'عرض'}</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={dismissAlert}
              className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message body */}
        <div className="mt-2 text-xs text-gray-300 leading-relaxed break-words px-1">
          {activeAlert.message}
        </div>
      </div>
    </div>
  );
};
