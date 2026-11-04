import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'cyber' | 'danger' | 'ghost' | 'outline' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'gold', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      gold: 'bg-lord-gold hover:bg-lord-hover text-obsidian-primary font-bold shadow-gold-glow focus:ring-lord-gold',
      cyber: 'bg-cyber-blue hover:bg-opacity-80 text-white font-bold shadow-blue-glow focus:ring-cyber-blue',
      danger: 'bg-status-danger hover:bg-red-600 text-white font-bold focus:ring-status-danger',
      ghost: 'bg-transparent hover:bg-obsidian-surface text-gray-300 hover:text-white',
      outline: 'border border-lord-gold/40 text-lord-gold hover:border-lord-gold hover:bg-lord-gold/10',
      surface: 'bg-obsidian-card hover:bg-obsidian-border text-white border border-gray-800'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

