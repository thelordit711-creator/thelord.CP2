'use client';

import React from 'react';
import { FileCheck, Check, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface PendingFinancialRequestsProps {
  requests: any[];
  isDeciding: boolean;
  onDecision: (requestId: string, decision: 'APPROVE' | 'REJECT' | 'NOTE') => void;
}

export const PendingFinancialRequests: React.FC<PendingFinancialRequestsProps> = ({
  requests,
  isDeciding,
  onDecision
}) => {
  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-lord-gold" />
          <h3 className="text-lg font-bold text-white">الطلبات المالية بانتظار اعتماد المسؤول</h3>
        </div>
        <Badge variant="gold">{requests.length} طلبات</Badge>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-10 text-xs text-gray-500">
          لا توجد طلبات مالية معلقة حالياً.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => (
            <div
              key={req._id}
              className="p-4 rounded-2xl bg-obsidian-surface border border-obsidian-border flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{req.title}</span>
                  <Badge variant="processing">طلب ميزانية</Badge>
                </div>
                <p className="text-xs text-gray-400">
                  المقدم: <strong className="text-gray-200">{req.createdBy?.fullName || 'عضو'}</strong> |
                  المبلغ: <strong className="text-lord-gold">{req.financialRequirement?.amount} USDT</strong> |
                  الوسيلة: <strong className="text-cyber-blue">{req.financialRequirement?.payoutMethodRequested}</strong>
                </p>
                {req.financialRequirement?.justification && (
                  <p className="text-xs text-gray-400 mt-1 italic">
                    "{req.financialRequirement.justification}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="gold"
                  size="sm"
                  disabled={isDeciding}
                  onClick={() => onDecision(req._id, 'APPROVE')}
                  className="flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>موافقة وتحويل للصندوق</span>
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isDeciding}
                  onClick={() => onDecision(req._id, 'REJECT')}
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>رفض</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

