'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Global React Error Boundary protecting AppShell screens from unhandled render exceptions.
 */
export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'حدث خطأ غير متوقع في واجهة المستخدم'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-nova rounded-2xl p-6 border border-red-500/30 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-black text-white">تعذّر عرض هذا القسم مؤقتاً</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                تم عزل الخطأ تلقائياً لحماية بقية جلسة العمل. يمكنك إعادة المحاولة أو تحديث الصفحة.
              </p>
              {this.state.errorMessage && (
                <p className="text-[11px] font-mono text-red-300/80 bg-gray-950/70 border border-gray-800 rounded-lg px-3 py-2 mt-2 break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-lord-gold text-black text-xs font-black hover:opacity-90 flex items-center gap-1.5 transition-opacity"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.assign('/')}
                className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-200 text-xs font-bold hover:border-lord-gold/40 flex items-center gap-1.5 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>العودة للرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

