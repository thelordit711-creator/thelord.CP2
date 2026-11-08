'use client';

import React from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { MessageSquare, Video, Phone, Send, ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

interface QuickContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export const QuickContactModal: React.FC<QuickContactModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const router = useRouter();
  const locale = useLocale();

  if (!isOpen || !employee) return null;

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-[#0a0d16] border border-amber-500/40 rounded-3xl shadow-2xl p-5 text-white text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-lg">
              {employee.fullName?.charAt(0) || '👤'}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">التواصل المباشر مع {employee.fullName}</h3>
              <p className="text-[11px] text-gray-400 font-mono">{employee.primaryDepartment}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-800/60 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Options */}
        <div className="space-y-2.5">
          {/* Internal Chat */}
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/${locale}/chat?userId=${employee._id}`);
            }}
            className="w-full p-3.5 rounded-2xl bg-gray-900/80 hover:bg-amber-500/10 border border-gray-800 hover:border-amber-500/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  إرسال رسالة في الشات الداخلي
                </div>
                <div className="text-[10px] text-gray-400">محادثة ثنائية فورية مشفرة</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-amber-400" />
          </button>

          {/* Video / Audio Meeting */}
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/${locale}/meeting?room=call_${employee._id}`);
            }}
            className="w-full p-3.5 rounded-2xl bg-gray-900/80 hover:bg-amber-500/10 border border-gray-800 hover:border-amber-500/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Video className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  بدء اجتماع أو اتصال فيديو حي
                </div>
                <div className="text-[10px] text-gray-400">غرفة اتصال مباشر مع مشاركة الشاشة</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-amber-400" />
          </button>

          {/* Direct Phone / Mobile */}
          {employee.phoneNumber && (
            <a
              href={`tel:${employee.phoneNumber}`}
              className="w-full p-3.5 rounded-2xl bg-gray-900/80 hover:bg-amber-500/10 border border-gray-800 hover:border-amber-500/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-lord-gold/15 border border-lord-gold/30 flex items-center justify-center text-lord-gold group-hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    اتصال هاتفي مباشر
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">{employee.phoneNumber}</div>
                </div>
              </div>
              <Phone className="w-4 h-4 text-gray-500 group-hover:text-amber-400" />
            </a>
          )}
        </div>
      </div>
    </AppModalPortal>
  );
};

