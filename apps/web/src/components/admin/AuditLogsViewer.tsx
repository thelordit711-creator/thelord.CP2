'use client';

import React, { useState, useEffect } from 'react';
import { useGetAuditLogsQuery } from '../../store/api/usersApi';
import { useSocket } from '../../providers/SocketProvider';
import { IAuditLog, AuditActionType, AuditSeverity } from '@lord/shared-types';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Key,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Activity
} from 'lucide-react';
import { Button } from '../ui/Button';

export const AuditLogsViewer: React.FC = () => {
  const { socket } = useSocket();
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveLogs, setLiveLogs] = useState<IAuditLog[]>([]);

  const { data: auditRes, isLoading, refetch, isFetching } = useGetAuditLogsQuery({
    actionType: selectedAction || undefined,
    severity: selectedSeverity || undefined,
    search: searchQuery || undefined,
    limit: 50
  });

  // Sync initial query logs
  useEffect(() => {
    if (auditRes?.data) {
      setLiveLogs(auditRes.data);
    }
  }, [auditRes]);

  // Real-time Socket Listener for Live Audit Events
  useEffect(() => {
    if (!socket) return;

    const handleNewAuditEvent = (newLog: IAuditLog) => {
      setLiveLogs((prev) => [newLog, ...prev.slice(0, 99)]);
    };

    socket.on('audit:event', handleNewAuditEvent);

    return () => {
      socket.off('audit:event', handleNewAuditEvent);
    };
  }, [socket]);

  const renderActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'DELETE_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-500/15 border border-red-500/35 text-red-400 font-bold text-[11px]">
            <Trash2 className="w-3 h-3" />
            <span>حذف حساب نهائياً</span>
          </span>
        );
      case 'BLOCK_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-400 font-bold text-[11px]">
            <Lock className="w-3 h-3" />
            <span>حظر ومنع دخول</span>
          </span>
        );
      case 'UNBLOCK_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-bold text-[11px]">
            <Unlock className="w-3 h-3" />
            <span>رفع الحظر وتفعيل</span>
          </span>
        );
      case 'CHANGE_PASSWORD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 font-bold text-[11px]">
            <Key className="w-3 h-3" />
            <span>تغيير كلمة المرور</span>
          </span>
        );
      case 'DISBURSE_PAYOUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyber-blue/15 border border-cyber-blue/35 text-cyber-blue font-bold text-[11px]">
            <Activity className="w-3 h-3" />
            <span>صرف مالي من الصندوق</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-800 text-gray-300 font-mono text-[11px]">
            {action}
          </span>
        );
    }
  };

  const renderSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-black">
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
            WARNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black">
            INFO
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    if (liveLogs.length === 0) return;
    const headers = ['التاريخ', 'القائم بالإجراء', 'نوع العملية', 'المستهدف', 'درجة الخطورة', 'الـ IP', 'التفاصيل'];
    const rows = liveLogs.map((l) => [
      new Date(l.createdAt).toLocaleString('ar-YE'),
      `"${l.userName} (${l.userRole})"`,
      l.actionType,
      `"${l.targetName || '—'}"`,
      l.severity,
      l.ipAddress || '—',
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `thelord_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-lord-gold/15 text-lord-gold border border-lord-gold/30 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-white">سجل التدقيق الأمني والعمليات الحساسة (Audit Trails)</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>توثيق حي غير قابل للتعديل</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              تسجيل تلقائي مشفر لكل عمليات الحظر، فك الحظر، حذف الحسابات، تغيير كلمات السر، وعمليات الصرف المالية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs text-gray-300 border-gray-700 hover:text-white flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-lord-gold" />
            <span>تصدير Excel/CSV</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-lord-gold' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بالقائم بالإجراء، المستهدف، أو البريد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-obsidian-primary border border-gray-800 rounded-xl pr-10 pl-3 py-2 text-xs text-white placeholder-gray-500 focus:border-lord-gold"
          />
        </div>

        <div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full bg-obsidian-primary border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
          >
            <option value="">-- كافة أنواع العمليات الإدارية --</option>
            <option value="BLOCK_USER">حظر ومنع دخول حساب</option>
            <option value="UNBLOCK_USER">فك حظر حساب</option>
            <option value="DELETE_USER">حذف حساب نهائياً</option>
            <option value="CHANGE_PASSWORD">تغيير كلمة المرور إدارياً</option>
            <option value="DISBURSE_PAYOUT">صرف مالي من الصندوق</option>
          </select>
        </div>

        <div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full bg-obsidian-primary border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:border-lord-gold"
          >
            <option value="">-- كافة درجات الخطورة --</option>
            <option value="CRITICAL">حرجة وعالية الأهمية (CRITICAL)</option>
            <option value="WARNING">تنبيه ومتابعة (WARNING)</option>
            <option value="INFO">معلوماتية قياسية (INFO)</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin text-lord-gold mx-auto mb-2" />
          <span>جاري تحميل سجل التدقيق الأمني...</span>
        </div>
      ) : liveLogs.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-500 space-y-2 border border-dashed border-gray-800 rounded-2xl">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="font-bold text-gray-300">لا توجد عمليات مسجلة مطابقة للفلاتر المحددة</p>
          <p className="text-[11px] text-gray-500">كل عملية إدارية حساسة يقوم بها المسؤول ستُسجل وتظهر هنا فوراً.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-800/80">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-obsidian-surface border-b border-gray-800 text-gray-400">
                <th className="py-3 px-4">التوقيت والتاريخ</th>
                <th className="py-3 px-4">القائم بالإجراء</th>
                <th className="py-3 px-4">نوع العملية</th>
                <th className="py-3 px-4">المستهدف</th>
                <th className="py-3 px-4">الخطورة</th>
                <th className="py-3 px-4">تفاصيل وبيان الحدث</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 bg-obsidian-card">
              {liveLogs.map((log) => (
                <tr key={log._id} className="hover:bg-obsidian-surface/50 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span>{new Date(log.createdAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-lord-gold/15 text-lord-gold text-[10px] flex items-center justify-center font-bold">
                        {log.userName?.charAt(0) || '👤'}
                      </span>
                      <span>{log.userName}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono block">{log.userRole}</span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderActionBadge(log.actionType)}
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-gray-200 block">{log.targetName || '—'}</span>
                    {log.targetId && (
                      <span className="text-[10px] text-gray-500 font-mono block truncate max-w-[120px]" title={log.targetId}>
                        ID: {log.targetId}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderSeverityBadge(log.severity)}
                  </td>

                  <td className="py-3 px-4 text-gray-300 max-w-xs">
                    {log.details ? (
                      <div className="text-[11px] leading-relaxed">
                        {log.details.reason && (
                          <div>
                            <span className="text-gray-400">السبب: </span>
                            <strong className="text-white">{log.details.reason}</strong>
                          </div>
                        )}
                        {log.details.deletedEmail && (
                          <div className="font-mono text-gray-400">
                            بريد: {log.details.deletedEmail}
                          </div>
                        )}
                        {log.details.targetEmail && (
                          <div className="font-mono text-gray-400">
                            {log.details.targetEmail}
                          </div>
                        )}
                        {log.ipAddress && (
                          <div className="text-[10px] text-gray-500 font-mono">
                            IP: {log.ipAddress}
                          </div>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
