'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { MoneyDisplay } from './MoneyDisplay';

interface MetricCardProps {
  title: string;
  subtitle?: string;
  value: number | string;
  isFinancial?: boolean;
  currency?: string;
  isMasked?: boolean;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  subtitle,
  value,
  isFinancial = false,
  currency = 'USDT',
  isMasked = false,
  icon: Icon,
  badge,
  trend,
  onClick,
  className = ''
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-obsidian-surface border border-gray-800/80 hover:border-lord-gold/40 rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-200 relative overflow-hidden flex flex-col justify-between gap-3 ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-gray-400 block leading-tight">{title}</span>
          {subtitle && (
            <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{subtitle}</span>
          )}
        </div>

        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-lord-gold/10 border border-lord-gold/30 flex items-center justify-center text-lord-gold shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div className="text-xl sm:text-2xl font-black text-white font-mono">
          {isFinancial && typeof value === 'number' ? (
            <MoneyDisplay amount={value} currency={currency} isMasked={isMasked} size="lg" />
          ) : isMasked ? (
            <span className="text-gray-500 font-mono tracking-widest text-lg">••••••••</span>
          ) : (
            <span>{value}</span>
          )}
        </div>

        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {trend && (
        <div className="text-[11px] font-bold pt-2 border-t border-gray-800/60 flex items-center gap-1.5">
          <span className={trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};

