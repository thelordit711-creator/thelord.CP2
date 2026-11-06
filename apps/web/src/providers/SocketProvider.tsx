'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { store } from '../store';
import { baseApi } from '../store/api/baseApi';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinUser: (userId: string, role?: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinUser: () => {}
});

export const useSocket = () => useContext(SocketContext);

// Luxury Zero-latency Executive Notification Audio Chime
const playSystemChime = (tone: 'INFO' | 'SUCCESS' | 'FINANCE' | 'ALERT' = 'INFO') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (tone === 'SUCCESS') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (tone === 'FINANCE') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.2); // B5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // AudioContext blocked by browser policy until interaction
  }
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const getStoredUserData = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lord_current_user') || localStorage.getItem('lord_user_profile');
        const token = localStorage.getItem('lord_auth_token') || localStorage.getItem('auth_token') || '';
        if (stored) {
          const u = JSON.parse(stored);
          return {
            userId: u?._id || u?.id || '',
            role: u?.accessRole || u?.role || '',
            token
          };
        }
        return { userId: '', role: '', token };
      } catch {
        return { userId: '', role: '', token: '' };
      }
    }
    return { userId: '', role: '', token: '' };
  }, []);

  const joinUser = useCallback((userId: string, role?: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('user:join', { userId, role });
    }
  }, []);

  useEffect(() => {
    const rawWsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL;
    let socketUrl = rawWsUrl;
    if (!socketUrl && typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      socketUrl = isLocal ? 'http://localhost:5000' : window.location.origin;
    }

    const { userId, role, token } = getStoredUserData();

    const s = io(socketUrl || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
      query: {
        userId: userId || '',
        role: role || ''
      },
      auth: {
        userId: userId || '',
        role: role || '',
        token: token || ''
      }
    });

    socketRef.current = s;

    s.on('connect', () => {
      setIsConnected(true);
      // Immediately identify user upon connect
      const latest = getStoredUserData();
      if (latest.userId) {
        s.emit('user:join', { userId: latest.userId, role: latest.role });
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // 1. Task Real-Time Sync & Invalidation (Zero Reload)
    const handleTaskEvent = (data: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Task']));
    };

    s.on('task:created', (data: any) => {
      handleTaskEvent(data);
      playSystemChime('INFO');
      toast.info('📋 مهمة جديدة أُضيفت إلى المنظومة', {
        description: data.title ? `${data.title}` : 'تم تحديث قائمة المهام تلقائياً'
      });
    });

    s.on('task:assigned', (data: any) => {
      handleTaskEvent(data);
      playSystemChime('ALERT');
      toast.info('🔔 مهمة جديدة أُسندت إليك الآن!', {
        description: data.title ? `${data.title} - انقر للبدء بالتنفيذ` : 'انقر لعرض مراحل المهمة في مساحة العمل',
        duration: 9000
      });
    });

    s.on('task:updated', (data: any) => {
      handleTaskEvent(data);
    });

    s.on('task:deleted', (data: any) => {
      handleTaskEvent(data);
      toast.warning('تم حذف مهمة من قبل المسؤول', {
        description: data.title || ''
      });
    });

    s.on('task:proposed', (data: any) => {
      handleTaskEvent(data);
      playSystemChime('INFO');
      toast.info('💡 مقترح مهمة جديد من الموظف بانتظار الاعتماد', {
        description: `${data.title} - ${data.proposer || ''}`
      });
    });

    s.on('stage:submitted', (data: any) => {
      handleTaskEvent(data);
      playSystemChime('INFO');
      toast.info(`📋 تم تسليم مرحلة جديدة للمراجعة`, {
        description: `${data.stageTitle || 'مرحلة جديدة'} بواسطة ${data.employeeName || 'الموظف'}`
      });
    });

    s.on('stage:approved', (data: any) => {
      handleTaskEvent(data);
      playSystemChime('SUCCESS');
      toast.success(`🎉 اعتمد المسؤول مرحلتك!`, {
        description: data.nextStageUnlocked ? 'تم فتح المرحلة التالية تلقائياً.' : 'اكتملت جميع مراحل المهمة بنجاح.'
      });
    });

    s.on('stage:revision_requested', (data: any) => {
      handleTaskEvent(data);
      playSystemChime('ALERT');
      toast.warning(`⚠️ طلب المسؤول تعديل المرحلة`, {
        description: data.adminFeedback?.note || 'يرجى مراجعة ملاحظات المدير واستكمال المتطلبات'
      });
    });

    // 2. Financial & Treasury Sync (Zero Reload)
    const handleFinanceEvent = () => {
      store.dispatch(baseApi.util.invalidateTags(['PayoutOrder', 'CompanyVault', 'EmployeeLedger']));
    };

    s.on('payout:new_order', (data: any) => {
      handleFinanceEvent();
      playSystemChime('FINANCE');
      toast.info(`🔔 أمر صرف جديد ورد إلى شاشة الصندوق`, {
        description: `المبلغ: ${data.amount} ${data.currency}`
      });
    });

    s.on('payout:processing', (data: any) => {
      handleFinanceEvent();
      playSystemChime('FINANCE');
      toast.warning(`⏳ بدأ الصندوق عملية الصرف!`, {
        description: `المبلغ: ${data.amount} ${data.currency} عبر ${data.payoutMethod}`
      });
    });

    s.on('payout:disbursed', (data: any) => {
      handleFinanceEvent();
      playSystemChime('SUCCESS');
      toast.success(`✅ تم صرف المستحقات بنجاح!`, {
        description: `تم إيداع ${data.amount} ${data.currency} في حساب ${data.beneficiaryName || ''}`
      });
    });

    s.on('vault:updated', (data: any) => {
      handleFinanceEvent();
      toast.info('💰 تم تحديث رصيد الخزينة/الميزانية');
    });

    s.on('finance:approved', (data: any) => {
      handleFinanceEvent();
      playSystemChime('SUCCESS');
      toast.success('تمت الموافقة على طلب الصرف المالي وإحالته للصندوق');
    });

    s.on('finance:rejected', (data: any) => {
      handleFinanceEvent();
      toast.error('تم رفض طلب الصرف المالي من قِبل المسؤول');
    });

    // 3. User Presence & Staff Monitor (Zero Reload)
    s.on('STAFF_STATUS_CHANGED', () => {
      store.dispatch(baseApi.util.invalidateTags(['User']));
    });

    s.on('presence:update', () => {
      store.dispatch(baseApi.util.invalidateTags(['User']));
    });

    // 4. Notifications (Zero Reload)
    s.on('notification:new', (notification: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Notification']));
      playSystemChime('ALERT');
      toast.info(notification.title || 'إشعار جديد', {
        description: notification.message || '',
        duration: 9000
      });
    });

    // 5. Chat Notification
    s.on('chat:notification', (data: any) => {
      playSystemChime('INFO');
    });

    // 6. Channel Created
    s.on('channel:created', () => {
      store.dispatch(baseApi.util.invalidateTags(['ChatMessage']));
    });

    // 7. Meetings
    s.on('meeting:invite', (data: any) => {
      playSystemChime('ALERT');
      toast.info(`🎥 دعوة لاجتماع مباشر!`, {
        description: `${data.inviterName || 'المسؤول'} يدعوك للانضمام إلى غرفة الاجتماع الآن!`,
        action: {
          label: 'انضمام الآن 🎙️',
          onClick: () => {
            window.location.href = '/meeting';
          }
        },
        duration: 15000
      });
    });

    s.on('meeting:started', (data: any) => {
      playSystemChime('ALERT');
      toast.info(`🔴 بدأ الاجتماع المركزي!`, {
        description: `${data.startedBy || 'المسؤول'} بدأ البث المباشر للاجتماع المركزي الآن.`,
        action: {
          label: 'انضمام 🎙️',
          onClick: () => {
            window.location.href = '/meeting';
          }
        },
        duration: 10000
      });
    });

    setSocket(s);

    // Watch for login changes in window
    const handleStorageChange = () => {
      const freshUser = getStoredUserData();
      if (freshUser.userId && s.connected) {
        s.emit('user:join', { userId: freshUser.userId, role: freshUser.role });
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      s.disconnect();
    };
  }, [getStoredUserData]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinUser }}>
      {children}
    </SocketContext.Provider>
  );
}