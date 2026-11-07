'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { TheLordAIFloatingAssistant } from '../ai/TheLordAIFloatingAssistant';
import { DynamicIslandNotification } from '../notifications/DynamicIslandNotification';
import { useSocket } from '../../providers/SocketProvider';
import { toast } from 'sonner';

const PUBLIC_ROUTES = ['/login', '/register', '/logged-out', '/registered-success'];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { socket } = useSocket();
  const [authorized, setAuthorized] = useState(false);

  // Immediate security enforcement: revoke session if admin bans or deletes account
  useEffect(() => {
    if (!socket) return;

    const handleAccessRevoked = (data: { userId: string; reason?: string }) => {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('lord_current_user') : null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (String(user._id) === String(data.userId)) {
            toast.error(
              data.reason
                ? `تم إيقاف حسابك ومنعك من دخول المنظومة بقرار إداري. السبب: ${data.reason}`
                : 'تم إيقاف حسابك ومنعك من دخول المنظومة بقرار إداري'
            );
            localStorage.removeItem('lord_auth_token');
            localStorage.removeItem('lord_current_user');
            router.replace(`/${locale}/login`);
          }
        } catch (e) {}
      }
    };

    const handleUserDeleted = (data: { userId: string }) => {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('lord_current_user') : null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (String(user._id) === String(data.userId)) {
            toast.error('تم حذف حسابك نهائياً من المنظومة من قِبل الإدارة');
            localStorage.removeItem('lord_auth_token');
            localStorage.removeItem('lord_current_user');
            router.replace(`/${locale}/login`);
          }
        } catch (e) {}
      }
    };

    socket.on('USER_ACCESS_REVOKED', handleAccessRevoked);
    socket.on('USER_DELETED', handleUserDeleted);

    return () => {
      socket.off('USER_ACCESS_REVOKED', handleAccessRevoked);
      socket.off('USER_DELETED', handleUserDeleted);
    };
  }, [socket, locale, router]);

  // Check if current route is a standalone auth/public page
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.includes(route));

  useEffect(() => {
    if (isPublicRoute) {
      setAuthorized(true);
      return;
    }

    // Check user authentication
    const token = typeof window !== 'undefined' ? localStorage.getItem('lord_auth_token') : null;
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('lord_current_user') : null;

    if (!token || !userStr) {
      router.replace(`/${locale}/login`);
      return;
    }

    try {
      const user = JSON.parse(userStr);
      const role = user.accessRole;

      // 1. Strict Treasury Isolation Guard
      if (role === 'TREASURY') {
        const allowedForTreasury = pathname.includes('/payout-desk') || pathname.includes('/chat');
        if (!allowedForTreasury) {
          router.replace(`/${locale}/payout-desk`);
          return;
        }
      }

      // 2. Strict Employee Guard (cannot access executive dashboard, payroll management, or payout desk)
      if (role === 'EMPLOYEE') {
        const forbiddenForEmployee =
          pathname.includes('/dashboard') ||
          pathname.includes('/employees') ||
          pathname.includes('/payout-desk');

        if (forbiddenForEmployee) {
          router.replace(`/${locale}/workspace`);
          return;
        }
      }

      setAuthorized(true);
    } catch (_err) {
      router.replace(`/${locale}/login`);
    }
  }, [pathname, isPublicRoute, locale, router]);

  // Public standalone pages: Render clean full-screen view (No Sidebar, No TopBar, No Assistant)
  if (isPublicRoute) {
    return <main className="min-h-screen bg-lord-dark w-full">{children}</main>;
  }

  // Loading state during permission check
  if (!authorized) {
    return (
      <div className="min-h-screen bg-lord-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-lord-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-xs font-mono">التحقق من الصلاحيات وأمن الحساب...</span>
        </div>
      </div>
    );
  }

  // Authenticated pages: Render full enterprise workspace layout
  return (
    <div className="min-h-screen flex flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 pb-32 md:pb-8 scroll-touch">
          {children}
        </main>
      </div>
      <BottomNav />
      <DynamicIslandNotification />
      <TheLordAIFloatingAssistant />
    </div>
  );
};

