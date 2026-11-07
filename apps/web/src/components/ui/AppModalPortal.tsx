'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface AppModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
  className?: string;
  preventBackdropClose?: boolean;
}

/**
 * 👑 AppModalPortal - Universal Modal Portal Provider
 * Mounts directly into document.body with supreme z-index (z-[9999]).
 * Prevents mobile BottomNav clipping, CSS stacking context traps, and locks background scroll.
 */
export const AppModalPortal: React.FC<AppModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidthClassName = 'max-w-4xl',
  className = '',
  preventBackdropClose = false
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Background body scroll lock and escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-fade-in select-none"
      onClick={() => {
        if (!preventBackdropClose) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClassName} max-h-[96dvh] sm:max-h-[90vh] my-auto flex flex-col overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
