'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  LayoutDashboard,
  CheckSquare,
  Coins,
  MessageSquare,
  Users,
  Video,
  Briefcase
} from 'lucide-react';
import { AccessRole } from '@lord/shared-types';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const locale = useLocale();
  const [userRole, setUserRole] = useState<AccessRole>('SUPER_ADMIN');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user.accessRole) setUserRole(user.accessRole);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const allNavItems = [
    { title: 'الرئيسية', href: `/${locale}/dashboard`, icon: LayoutDashboard, roles: ['SUPER_ADMIN'] },
    { title: 'مساحتي', href: `/${locale}/workspace`, icon: Briefcase, roles: ['SUPER_ADMIN', 'EMPLOYEE'] },
    { title: 'المهام', href: `/${locale}/tasks`, icon: CheckSquare, roles: ['SUPER_ADMIN', 'EMPLOYEE'] },
    { title: 'الصندوق', href: `/${locale}/payout-desk`, icon: Coins, roles: ['SUPER_ADMIN', 'TREASURY'] },
    { title: 'الدردشة', href: `/${locale}/chat`, icon: MessageSquare, roles: ['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY'] },
    { title: 'الاجتماع', href: `/${locale}/meeting`, icon: Video, roles: ['SUPER_ADMIN', 'EMPLOYEE'] }
  ];

  const visibleItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-obsidian-card/95 backdrop-blur-xl border-t border-obsidian-border pb-safe">
      <div className={`grid h-16 items-center px-1`} style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}>
        {visibleItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-all ${
                isActive
                  ? 'text-lord-gold font-bold scale-105'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-lord-gold/15' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 font-medium truncate max-w-[50px]">
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
