import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'processing' | 'disbursed' | 'danger' | 'cyber' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'neutral', children, ...props }) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

  const variants = {
    gold: 'bg-lord-gold/15 text-lord-gold border border-lord-gold/30',
    processing: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    disbursed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/30',
    cyber: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    neutral: 'bg-gray-800 text-gray-300 border border-gray-700'
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], className))} {...props}>
      {children}
    </span>
  );
};

