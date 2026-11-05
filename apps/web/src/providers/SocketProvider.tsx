'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
    const s = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 5000
    });

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time Payout Toasts
    s.on('payout:processing', (data: any) => {
      toast.warning(`⏳ بدأ الصندوق عملية الصرف!`, {
        description: `المبلغ: ${data.amount} ${data.currency} عبر ${data.payoutMethod}`
      });
    });

    s.on('payout:disbursed', (data: any) => {
      toast.success(`✅ تم صرف المستحقات بنجاح!`, {
        description: `تم إيداع ${data.amount} ${data.currency} في حساب ${data.beneficiaryName || ''}`
      });
    });

    s.on('payout:new_order', (data: any) => {
      toast.info(`🔔 أمر صرف جديد ورد إلى شاشة الصندوق`, {
        description: `المبلغ: ${data.amount} ${data.currency}`
      });
    });

    s.on('stage:submitted', (data: any) => {
      toast.info(`📋 تم تسليم مرحلة جديدة للمراجعة`, {
        description: `المهمة: ${data.taskId} - ${data.stageTitle} بواسطة ${data.employeeName || ''}`
      });
    });

    s.on('stage:approved', (data: any) => {
      toast.success(`🎉 اعتمد المسؤول مرحلتك!`, {
        description: data.nextStageUnlocked ? 'تم فتح المرحلة التالية تلقائياً.' : 'اكتملت جميع مراحل المهمة بنجاح.'
      });
    });

    // Real-time Meeting Alerts
    s.on('meeting:invite', (data: any) => {
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

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

