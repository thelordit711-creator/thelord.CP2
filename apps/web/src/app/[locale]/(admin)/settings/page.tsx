'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Bell,
  ShieldCheck,
  FileText,
  Save,
  Volume2,
  Calendar,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useGetSystemSettingsQuery, useUpdateSystemSettingsMutation } from '../../../../store/api/usersApi';
import { Button } from '../../../../components/ui/Button';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const { data: settingsRes, isLoading, refetch } = useGetSystemSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSystemSettingsMutation();
  const settings = settingsRes?.data;

  const [workHoursStart, setWorkHoursStart] = useState('09:00');
  const [workHoursEnd, setWorkHoursEnd] = useState('18:00');
  const [dailyReportDeadline, setDailyReportDeadline] = useState('23:59');
  const [dailyReportReminderTime, setDailyReportReminderTime] = useState('21:00');
  const [allowSelfBountyClaim, setAllowSelfBountyClaim] = useState(true);
  const [autoLockOverdueTasks, setAutoLockOverdueTasks] = useState(false);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      if (settings.workHoursStart) setWorkHoursStart(settings.workHoursStart);
      if (settings.workHoursEnd) setWorkHoursEnd(settings.workHoursEnd);
      if (settings.dailyReportDeadline) setDailyReportDeadline(settings.dailyReportDeadline);
      if (settings.dailyReportReminderTime) setDailyReportReminderTime(settings.dailyReportReminderTime);
      if (settings.allowSelfBountyClaim !== undefined) setAllowSelfBountyClaim(settings.allowSelfBountyClaim);
      if (settings.autoLockOverdueTasks !== undefined) setAutoLockOverdueTasks(settings.autoLockOverdueTasks);
      if (settings.notificationSoundEnabled !== undefined) setNotificationSoundEnabled(settings.notificationSoundEnabled);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        workHoursStart,
        workHoursEnd,
        dailyReportDeadline,
        dailyReportReminderTime,
        allowSelfBountyClaim,
        autoLockOverdueTasks,
        notificationSoundEnabled
      }).unwrap();

      toast.success('تم حفظ إعدادات وسياسات المنظومة بنجاح! ⚙️');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-lord-gold">
        <span className="w-8 h-8 rounded-full border-2 border-lord-gold border-t-transparent animate-spin ml-3" />
        <span>جاري تحميل إعدادات المنظومة...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lord-gold to-yellow-700 flex items-center justify-center text-obsidian-primary shadow-gold-glow shrink-0">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">إعدادات وسياسات المنظومة المركزية</h1>
            <p className="text-xs text-gray-400 mt-1">
              التحكم في مواعيد الدوام الرسمي، سياسات التقارير اليومية، وتخصيص تنبيهات الكادر
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          variant="gold"
          size="md"
          disabled={isSaving}
          className="rounded-2xl shadow-gold-glow flex items-center gap-2 shrink-0 font-bold"
        >
          <Save className="w-4 h-4 ml-1" />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات 💾'}</span>
        </Button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Official Working Hours */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <Clock className="w-5 h-5 text-lord-gold" />
            <h3 className="text-sm font-bold text-white">مواعيد الدوام وساعات العمل الرسمية</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">وقت بدء الدوام:</label>
              <input
                type="time"
                value={workHoursStart}
                onChange={(e) => setWorkHoursStart(e.target.value)}
                className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-lord-gold"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">وقت نهاية الدوام:</label>
              <input
                type="time"
                value={workHoursEnd}
                onChange={(e) => setWorkHoursEnd(e.target.value)}
                className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-lord-gold"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            تُعتمد هذه الأوقات لحساب فترات الحضور الفعلي وتنبيهات التأخير في تقرير منتصف الليل.
          </p>
        </div>

        {/* Card 2: Daily Reports Policy */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <FileText className="w-5 h-5 text-cyber-blue" />
            <h3 className="text-sm font-bold text-white">سياسة التقارير اليومية والتذكير الآلي</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">وقت التذكير المسائي:</label>
              <input
                type="time"
                value={dailyReportReminderTime}
                onChange={(e) => setDailyReportReminderTime(e.target.value)}
                className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyber-blue"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">آخر موعد للتسليم (Deadline):</label>
              <input
                type="time"
                value={dailyReportDeadline}
                onChange={(e) => setDailyReportDeadline(e.target.value)}
                className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyber-blue"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            يتم إرسال إشعار تذكيري للموظفين الذين لم يقدموا تقاريرهم بحلول وقت التذكير.
          </p>
        </div>

        {/* Card 3: Bounty & Marketplace Policy */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">قواعد مهام المكافآت والتنافس</h3>
          </div>

          <label className="flex items-center gap-3 p-3 bg-obsidian-surface/60 rounded-xl border border-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={allowSelfBountyClaim}
              onChange={(e) => setAllowSelfBountyClaim(e.target.checked)}
              className="rounded border-gray-700 text-lord-gold focus:ring-lord-gold w-4 h-4"
            />
            <div className="text-xs">
              <span className="font-bold text-white block">السماح بالقبول الفوري لمهام البونتي</span>
              <span className="text-[11px] text-gray-400">تمكين أول موظف يضغط على المهمة من حجزها لنفسه مباشرة</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-obsidian-surface/60 rounded-xl border border-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={autoLockOverdueTasks}
              onChange={(e) => setAutoLockOverdueTasks(e.target.checked)}
              className="rounded border-gray-700 text-lord-gold focus:ring-lord-gold w-4 h-4"
            />
            <div className="text-xs">
              <span className="font-bold text-white block">قفل المهام المتأخرة آلياً</span>
              <span className="text-[11px] text-gray-400">منع التسليم بعد فوات الموعد النهائي إلا بإذن المسؤول</span>
            </div>
          </label>
        </div>

        {/* Card 4: Audio & Notifications Alerting */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <Bell className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white">التنبيهات اللحظية والأصوات الفاخرة</h3>
          </div>

          <label className="flex items-center gap-3 p-3 bg-obsidian-surface/60 rounded-xl border border-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSoundEnabled}
              onChange={(e) => setNotificationSoundEnabled(e.target.checked)}
              className="rounded border-gray-700 text-lord-gold focus:ring-lord-gold w-4 h-4"
            />
            <div className="text-xs">
              <span className="font-bold text-white block flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-lord-gold" />
                تفعيل صوت التنبيه الفاخر (Chime Audio)
              </span>
              <span className="text-[11px] text-gray-400">تشغيل نغمة رقمية فورية بدون تأخير عند ورود إشعار جديد</span>
            </div>
          </label>
        </div>
      </form>
    </div>
  );
}

