'use client';

import React from 'react';
import { Badge } from './Badge';
import { Clock, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Radio } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md'
}) => {
  const normalized = status?.toUpperCase() || 'UNKNOWN';

  switch (normalized) {
    case 'WAITING_TREASURY':
    case 'PENDING_APPROVAL':
    case 'PENDING':
      return (
        <Badge variant="gold" className="flex items-center gap-1 font-bold">
          <Clock className="w-3 h-3" />
          <span>{label || 'بانتظار الاعتماد'}</span>
        </Badge>
      );

    case 'IN_PROGRESS':
    case 'PROCESSING':
      return (
        <Badge variant="processing" className="flex items-center gap-1 font-bold">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>{label || 'قيد التنفيذ'}</span>
        </Badge>
      );

    case 'DISBURSED':
    case 'COMPLETED':
    case 'APPROVED':
      return (
        <Badge variant="disbursed" className="flex items-center gap-1 font-bold">
          <CheckCircle2 className="w-3 h-3" />
          <span>{label || 'معتمد ومنفذ'}</span>
        </Badge>
      );

    case 'REJECTED':
    case 'CANCELLED':
    case 'FAILED':
      return (
        <Badge variant="danger" className="flex items-center gap-1 font-bold">
          <XCircle className="w-3 h-3" />
          <span>{label || 'مرفوض / ملغي'}</span>
        </Badge>
      );

    case 'ONLINE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{label || 'متصل الآن'}</span>
        </span>
      );

    case 'OFFLINE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
          <span className="w-2 h-2 rounded-full bg-gray-500"></span>
          <span>{label || 'غير متصل'}</span>
        </span>
      );

    default:
      return (
        <Badge variant="neutral">
          <span>{label || status}</span>
        </Badge>
      );
  }
};
