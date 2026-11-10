'use client';

import React from 'react';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  isMasked?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'gold' | 'emerald' | 'white' | 'muted';
  className?: string;
  showCurrency?: boolean;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  currency = 'USDT',
  isMasked = false,
  size = 'md',
  variant = 'gold',
  className = '',
  showCurrency = true
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl font-black'
  };

  const variantClasses = {
    gold: 'text-lord-gold',
    emerald: 'text-emerald-400',
    white: 'text-white',
    muted: 'text-gray-400'
  };

  if (isMasked) {
    return (
      <span className={`font-mono tracking-widest text-gray-500 select-none ${sizeClasses[size]} ${className}`}>
        ••••••••
      </span>
    );
  }

  const formattedAmount = (amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  return (
    <span className={`inline-flex items-baseline gap-1 font-mono font-bold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      <span>${formattedAmount}</span>
      {showCurrency && (
        <span className="text-[10px] sm:text-xs font-sans text-gray-400 font-normal">
          {currency}
        </span>
      )}
    </span>
  );
};

