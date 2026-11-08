'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import {
  useGetTasksQuery,
  useSettleTaskBudgetMutation
} from '../../../../store/api/tasksApi';
import { useConfirmPayoutReceiptMutation } from '../../../../store/api/financeApi';
import { useSocket } from '../../../../providers/SocketProvider';
import { WorkStatus } from '@lord/shared-types';
import { ImageLightboxModal } from '../../../../components/ui/ImageLightboxModal';
import { CreateTaskModal } from '../../../../components/tasks/modals/CreateTaskModal';
import { WorkStatusBar } from '../../../../components/workspace/WorkStatusBar';
import { PersonalStatementTab } from '../../../../components/workspace/PersonalStatementTab';
import { ProposalsListTab } from '../../../../components/workspace/ProposalsListTab';
import { TaskExecutionPanel } from '../../../../components/workspace/TaskExecutionPanel';
import { toast } from 'sonner';

export default function EmployeeWorkspacePage() {
  const { socket } = useSocket();
  const { data: tasksRes, refetch: refetchTasks } = useGetTasksQuery();
  const [confirmPayoutReceipt, { isLoading: isConfirmingReceipt }] = useConfirmPayoutReceiptMutation();
  const [settleTaskBudget, { isLoading: isSettlingBudget }] = useSettleTaskBudgetMutation();

  const [activeTab, setActiveTab] = useState<'tasks' | 'propose' | 'statement'>('tasks');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [workStatus, setWorkStatus] = useState<WorkStatus>('WORKING');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statement, setStatement] = useState<any[]>([]);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);

  const tasks = tasksRes?.data || [];

  useEffect(() => {
    if (tasks.length > 0 && !selectedTask) {
      setSelectedTask(tasks[0]);
    }
  }, [tasks, selectedTask]);

  // Load statement
  useEffect(() => {
    const fetchStatement = async () => {
      try {
        const token = localStorage.getItem('lord_auth_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/finance/ledger/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStatement(data.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (activeTab === 'statement') {
      fetchStatement();
    }
  }, [activeTab]);

  // Work Status Sync
  const handleStatusChange = async (newStatus: WorkStatus) => {
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem('lord_auth_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/auth/work-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ workStatus: newStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setWorkStatus(newStatus);
      toast.success(`تم تحديث حالتك إلى: ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث الحالة');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Socket updates
  useEffect(() => {
    if (socket) {
      socket.on('stage:submitted', () => refetchTasks());
      socket.on('stage:approved', (data: any) => {
        toast.success(`🎉 تم اعتماد المرحلة ${data.stageOrder} من الإدارة!`);
        refetchTasks();
      });
      socket.on('stage:rejected', (data: any) => {
        toast.error(`⚠️ تم طلب تعديلات على المرحلة ${data.stageOrder}: ${data.adminFeedback}`);
        refetchTasks();
      });
      socket.on('task:assigned', () => refetchTasks());
    }
    return () => {
      if (socket) {
        socket.off('stage:submitted');
        socket.off('stage:approved');
        socket.off('stage:rejected');
        socket.off('task:assigned');
      }
    };
  }, [socket, refetchTasks]);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
      {/* Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-lord-gold tracking-widest uppercase">
            EMPLOYEE WORKSPACE & TALENT HUB
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            مساحة عمل الفريق والتنفيذ اللحظي
          </h1>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-[#0a0d16] rounded-2xl border border-gray-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'tasks'
                ? 'bg-lord-gold text-black shadow-gold-glow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            مهامي ومراحلي
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('propose');
              setIsProposeModalOpen(true);
            }}
            className={`px-4 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'propose'
                ? 'bg-lord-gold text-black shadow-gold-glow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ اقتراح مهمة ومراحلها 💡</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={`px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'statement'
                ? 'bg-lord-gold text-black shadow-gold-glow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            كشف حسابي الشخصي
          </button>
        </div>
      </div>

      {/* Real-time Work Status Switcher Bar */}
      <WorkStatusBar
        workStatus={workStatus}
        updatingStatus={updatingStatus}
        onStatusChange={handleStatusChange}
      />

      {/* Tab 1: Tasks & Stages Stepper */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-gray-300">قائمة المهام المسندة إليك:</h3>
            {tasks.length === 0 ? (
              <div className="p-6 bg-[#0a0d16] rounded-2xl border border-gray-800 text-center text-xs text-gray-500">
                لا توجد مهام مسندة إليك حالياً. يمكنك اقتراح مهمة جديدة!
              </div>
            ) : (
              tasks.map((t: any) => (
                <div
                  key={t._id}
                  onClick={() => setSelectedTask(t)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedTask?._id === t._id
                      ? 'border-lord-gold/60 bg-[#101524] shadow-md'
                      : 'border-gray-800/80 bg-[#0a0d16] hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{t.title}</span>
                      {t.isDailyRecurring && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-800 text-lord-gold border border-lord-gold/30 text-[9px] font-bold">
                          🔄 روتين يومي
                        </span>
                      )}
                    </h4>
                    <Badge variant={t.status === 'COMPLETED' ? 'disbursed' : 'processing'}>
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">{t.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>المراحل: {t.stages?.length || 0}</span>
                    {t.dueDate && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        ⏰ {new Date(t.dueDate).toLocaleDateString('ar-YE', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="text-lord-gold font-bold">{t.overallProgressPercent || 0}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Task Detail & Stage Stepper */}
          <div className="lg:col-span-2">
            <TaskExecutionPanel
              selectedTask={selectedTask}
              onCloseTask={() => setSelectedTask(null)}
              onRefreshTasks={refetchTasks}
              onOpenLightbox={setLightboxImage}
              confirmPayoutReceipt={confirmPayoutReceipt}
              isConfirmingReceipt={isConfirmingReceipt}
              settleTaskBudget={settleTaskBudget}
              isSettlingBudget={isSettlingBudget}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Propose Task Hub */}
      {activeTab === 'propose' && (
        <ProposalsListTab
          tasks={tasks}
          onOpenProposeModal={() => setIsProposeModalOpen(true)}
          onSelectTask={(task: any) => {
            setSelectedTask(task);
            setActiveTab('tasks');
          }}
        />
      )}

      {/* Tab 3: Personal Statement */}
      {activeTab === 'statement' && (
        <PersonalStatementTab statement={statement} />
      )}

      {/* Global Image Lightbox Modal for Receipts & Proofs */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          imageAlt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Comprehensive Task & Stage Proposal Modal with Voice AI & Budget */}
      <CreateTaskModal
        isOpen={isProposeModalOpen}
        onClose={() => setIsProposeModalOpen(false)}
        isProposal={true}
        onSuccess={() => {
          refetchTasks();
          setActiveTab('propose');
        }}
      />
    </div>
  );
}
