'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  useGetVaultQuery,
  useAdjustVaultMutation,
  useGetFinancialRequestsQuery,
  useDecideFinancialRequestMutation
} from '../../../../store/api/financeApi';
import { useGetTasksQuery } from '../../../../store/api/tasksApi';
import { Button } from '../../../../components/ui/Button';
import { UserPlus, ArrowLeftRight } from 'lucide-react';
import { useSocket } from '../../../../providers/SocketProvider';
import { lordToast } from '../../../../lib/lordToast';
import { AuditLogsViewer } from '../../../../components/admin/AuditLogsViewer';

// Modular Subcomponents
import { FinancialMetricsGrid } from '../../../../components/dashboard/FinancialMetricsGrid';
import { LiveStaffStatusMonitor, StaffStatusItem } from '../../../../components/dashboard/LiveStaffStatusMonitor';
import { PendingFinancialRequests } from '../../../../components/dashboard/PendingFinancialRequests';
import { InviteStaffModal } from '../../../../components/dashboard/modals/InviteStaffModal';
import { VaultLiquidityModal } from '../../../../components/dashboard/modals/VaultLiquidityModal';

export default function AdminDashboardPage() {
  const { data: vaultRes, refetch: refetchVault } = useGetVaultQuery();
  const { data: requestsRes, refetch: refetchRequests } = useGetFinancialRequestsQuery();
  const { socket } = useSocket();

  const [adjustVault, { isLoading: isAdjusting }] = useAdjustVaultMutation();
  const [decideRequest, { isLoading: isDeciding }] = useDecideFinancialRequestMutation();

  // Vault Liquidity & Governance modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'FUND_TREASURY' | 'DEPOSIT_BUDGET' | 'RETURN_BUDGET'>('FUND_TREASURY');
  const [adjustAmount, setAdjustAmount] = useState<number>(1000);
  const [adjustReason, setAdjustReason] = useState<string>('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');

  // Staff Monitoring State
  const [staffList, setStaffList] = useState<StaffStatusItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const vault = vaultRes?.data;
  const requests = requestsRes?.data || [];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  // Fetch staff statuses
  const fetchStaffStatuses = useCallback(async () => {
    try {
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${apiUrl}/auth/staff-statuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStaffList(data.data);
      }
    } catch (e) {
      console.error('Failed to load staff statuses', e);
    } finally {
      setLoadingStaff(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchStaffStatuses();

    // Listen to real-time status updates via Socket.io
    if (socket) {
      const handleVaultRefresh = () => {
        refetchVault();
        refetchRequests();
      };

      socket.on('vault:updated', handleVaultRefresh);
      socket.on('payout:new_order', handleVaultRefresh);
      socket.on('payout:disbursed', handleVaultRefresh);
      socket.on('payout:processing', handleVaultRefresh);
      socket.on('stage:submitted', handleVaultRefresh);
      socket.on('task:created', handleVaultRefresh);
      socket.on('task:proposed', handleVaultRefresh);

      socket.on('STAFF_STATUS_CHANGED', (updatedStaff: any) => {
        setStaffList((prev) => {
          const index = prev.findIndex((s) => s._id === updatedStaff.userId || s.email === updatedStaff.email);
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = {
              ...copy[index],
              workStatus: updatedStaff.workStatus,
              workStatusUpdatedAt: updatedStaff.workStatusUpdatedAt,
              presenceStatus: updatedStaff.presenceStatus
            };
            return copy;
          } else {
            return [
              {
                _id: updatedStaff.userId,
                fullName: updatedStaff.fullName,
                email: updatedStaff.email,
                accessRole: updatedStaff.accessRole,
                workStatus: updatedStaff.workStatus,
                workStatusUpdatedAt: updatedStaff.workStatusUpdatedAt,
                presenceStatus: updatedStaff.presenceStatus
              },
              ...prev
            ];
          }
        });
        lordToast.gold(`تحديث حالة الموظف`, `${updatedStaff.fullName} -> ${updatedStaff.workStatus}`);
      });

      return () => {
        socket.off('vault:updated', handleVaultRefresh);
        socket.off('payout:new_order', handleVaultRefresh);
        socket.off('payout:disbursed', handleVaultRefresh);
        socket.off('payout:processing', handleVaultRefresh);
        socket.off('stage:submitted', handleVaultRefresh);
        socket.off('task:created', handleVaultRefresh);
        socket.off('task:proposed', handleVaultRefresh);
        socket.off('STAFF_STATUS_CHANGED');
      };
    }
  }, [socket, apiUrl, refetchVault, refetchRequests, fetchStaffStatuses]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(adjustAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      lordToast.error('خطأ في الإدخال', 'يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const currentGenBudget = vault?.generalBudget ?? 0;
    const currentTreasury = vault?.treasuryBalance ?? 0;

    if (activeTab === 'FUND_TREASURY' && amount > currentGenBudget) {
      lordToast.error(
        'رصيد غير كافٍ',
        `المبلغ المطلوب (${amount.toLocaleString()} USDT) يتجاوز رصيد الميزانية العامة المتاحة (${currentGenBudget.toLocaleString()} USDT)! يرجى إيداع رصيد أولاً.`
      );
      return;
    }

    if (activeTab === 'RETURN_BUDGET' && amount > currentTreasury) {
      lordToast.error(
        'رصيد غير كافٍ',
        `المبلغ المطلوب (${amount.toLocaleString()} USDT) يتجاوز رصيد الصندوق المتاح (${currentTreasury.toLocaleString()} USDT)!`
      );
      return;
    }

    try {
      let actionType: 'DEPOSIT_GENERAL_BUDGET' | 'FUND_TREASURY' | 'RETURN_TO_BUDGET' = 'FUND_TREASURY';
      if (activeTab === 'DEPOSIT_BUDGET') actionType = 'DEPOSIT_GENERAL_BUDGET';
      else if (activeTab === 'RETURN_BUDGET') actionType = 'RETURN_TO_BUDGET';

      await adjustVault({
        actionType,
        amount,
        reason: adjustReason.trim() || 'إدارة سيولة الخزينة'
      }).unwrap();

      lordToast.financial(amount, 'USDT');
      setIsAdjustModalOpen(false);
      refetchVault();
    } catch (err: any) {
      lordToast.error('فشل العملية', err?.data?.error || 'فشل في تنفيذ العملية');
    }
  };

  const handleDecision = async (requestId: string, decision: 'APPROVE' | 'REJECT' | 'NOTE') => {
    try {
      await decideRequest({
        id: requestId,
        data: {
          decision,
          adminNotes: decision === 'APPROVE' ? 'معتمد للصرف عبر الصندوق' : 'تمت المراجعة من المسؤول'
        }
      }).unwrap();

      if (decision === 'APPROVE') {
        lordToast.success('تم اعتماد الميزانية', 'تمت إحالة الطلب لشاشة الصندوق فوراً للصرف!');
      } else {
        lordToast.gold('تحديث الطلب', 'تم تحديث حالة الطلب المالي بنجاح');
      }
      refetchRequests();
      refetchVault();
    } catch (err: any) {
      lordToast.error('خطأ', err?.data?.error || 'حدث خطأ أثناء اتخاذ القرار');
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-lord-gold tracking-widest uppercase">
            THE LORD OF CRYPTO — EXECUTIVE PANEL
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            لوحة قيادة العمليات والخزينة ومراقبة الكادر
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="gold"
            size="md"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 ml-1.5" />
            <span>إرسال دعوة انضمام لكادر جديد</span>
          </Button>

          <Button
            variant="surface"
            size="md"
            onClick={() => {
              setActiveTab('FUND_TREASURY');
              setAdjustAmount(1000);
              setAdjustReason('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');
              setIsAdjustModalOpen(true);
            }}
            className="flex items-center gap-2 border border-lord-gold/40 text-lord-gold hover:bg-lord-gold/10"
          >
            <ArrowLeftRight className="w-4 h-4 ml-1.5" />
            <span>إدارة السيولة وتغذية الصندوق</span>
          </Button>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <FinancialMetricsGrid
        vault={vault}
        onOpenFundTreasury={() => {
          setActiveTab('FUND_TREASURY');
          setAdjustAmount(1000);
          setAdjustReason('تغذية رصيد الصندوق بالخصم من الميزانية العامة للشركة');
          setIsAdjustModalOpen(true);
        }}
        onOpenDepositBudget={() => {
          setActiveTab('DEPOSIT_BUDGET');
          setAdjustAmount(5000);
          setAdjustReason('إيداع رأس مال / أرباح جديدة في الميزانية العامة');
          setIsAdjustModalOpen(true);
        }}
      />

      {/* Real-Time Staff Work Status Monitor */}
      <LiveStaffStatusMonitor
        staffList={staffList}
        loadingStaff={loadingStaff}
        onRefresh={fetchStaffStatuses}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
      />

      {/* Pending Financial Requests Section */}
      <PendingFinancialRequests
        requests={requests}
        isDeciding={isDeciding}
        onDecision={handleDecision}
      />

      {/* Centralized Security Audit Trail Section */}
      <AuditLogsViewer />

      {/* Modals via React Portal */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        apiUrl={apiUrl}
      />

      <VaultLiquidityModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        vault={vault}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adjustAmount={adjustAmount}
        setAdjustAmount={setAdjustAmount}
        adjustReason={adjustReason}
        setAdjustReason={setAdjustReason}
        isAdjusting={isAdjusting}
        onSubmit={handleAdjustSubmit}
      />
    </div>
  );
}
