import { toast } from 'sonner';

/**
 * 👑 LordToast - Unified Executive Alert & Notification Engine
 * Standardized Royal Obsidian (#07090E) & Imperial Gold (#D4AF37) notification styling.
 */
export const lordToast = {
  success: (title: string, description?: string) => {
    toast.success(title, {
      description,
      className:
        '!bg-[#07090E]/95 !border-2 !border-emerald-500/60 !text-white !shadow-[0_10px_35px_rgba(16,185,129,0.25)] !rounded-2xl !p-4',
      duration: 3500
    });
  },

  error: (title: string, description?: string) => {
    toast.error(title, {
      description: description || 'يرجى مراجعة الصلاحيات أو إعادة المحاولة',
      className:
        '!bg-[#07090E]/95 !border-2 !border-rose-500/60 !text-white !shadow-[0_10px_35px_rgba(244,63,94,0.25)] !rounded-2xl !p-4',
      duration: 4500
    });
  },

  gold: (title: string, description?: string) => {
    toast.info(title, {
      description,
      className:
        '!bg-[#07090E]/95 !border-2 !border-lord-gold/70 !text-white !shadow-[0_10px_35px_rgba(212,175,55,0.25)] !rounded-2xl !p-4 font-bold',
      duration: 4000
    });
  },

  financial: (amount: number, currency = 'USDT', txHash?: string) => {
    toast.success(`تم تأكيد المعاملة المالية: $${amount} ${currency}`, {
      description: txHash
        ? `رقم العملية: ${txHash.substring(0, 18)}... (تم التوثيق في الخزينة)`
        : 'تم تحويل وصرف المبلغ بنجاح عبر الخزينة المعزولة',
      className:
        '!bg-[#07090E]/95 !border-2 !border-emerald-400 !text-white !shadow-[0_12px_40px_rgba(16,185,129,0.35)] !rounded-2xl !p-4',
      duration: 5000
    });
  },

  ai: (title: string, description?: string) => {
    toast.info(title, {
      description,
      className:
        '!bg-[#07090E]/95 !border-2 !border-cyber-blue/70 !text-white !shadow-[0_10px_35px_rgba(0,240,255,0.25)] !rounded-2xl !p-4',
      duration: 4000
    });
  },

  promise: async <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      className:
        '!bg-[#07090E]/95 !border-2 !border-lord-gold/50 !text-white !rounded-2xl !p-4'
    });
  }
};

