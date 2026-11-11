import cron from 'node-cron';
import os from 'os';
import { User } from '../models/User.model';
import { Task } from '../models/Task.model';
import { DailyReport } from '../models/DailyReport.model';
import { AttendanceSession } from '../models/AttendanceSession.model';
import { CompanyVault } from '../models/CompanyVault.model';
import { CronLock } from '../models/CronLock.model';
import { SocketService } from './socket.service';
import { logger } from '../utils/logger';

export const DEFAULT_APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Riyadh';

/**
 * Pure deterministic date formatter in a fixed operational timezone (YYYY-MM-DD).
 */
export function getLocalDateString(date: Date = new Date(), timeZone: string = DEFAULT_APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Builds deterministic time-bucket lock keys so multi-instance API replicas
 * execute each scheduled window at most once.
 */
export function buildCronWindowKey(jobName: string, date: Date = new Date(), bucketMinutes: number = 1440): string {
  const dayStr = getLocalDateString(date);
  if (bucketMinutes >= 1440) {
    return `${jobName}:${dayStr}`;
  }
  const totalMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const bucketIndex = Math.floor(totalMinutes / bucketMinutes);
  return `${jobName}:${dayStr}:b${bucketIndex}`;
}

export class CronService {
  private static isInitialized = false;
  private static instanceId = `${os.hostname()}-${process.pid}`;

  /**
   * Acquires an atomic MongoDB distributed lock for a cron window.
   * Returns false if another replica already claimed this execution window.
   */
  public static async acquireDistributedLock(lockKey: string, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      await CronLock.create({
        lockKey,
        lockedBy: this.instanceId,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000)
      });
      return true;
    } catch (err: any) {
      if (err?.code === 11000) {
        return false;
      }
      logger.error(`[CronService] Distributed lock check failed for ${lockKey}`, err);
      return false;
    }
  }

  public static init() {
    if (process.env.DISABLE_EMBEDDED_CRON === 'true') {
      logger.info('[CronService] Embedded cron disabled via DISABLE_EMBEDDED_CRON=true (external worker mode)');
      return;
    }
    if (this.isInitialized) return;
    this.isInitialized = true;

    const tzOptions = { timezone: DEFAULT_APP_TIMEZONE };
    logger.info(`[CronService] Initializing scheduled jobs & distributed locks (TZ=${DEFAULT_APP_TIMEZONE})`);

    // 1. Midnight Daily Executive Report (Every day at 00:00 in operational timezone)
    cron.schedule(
      '0 0 * * *',
      async () => {
        const lockKey = buildCronWindowKey('midnight-executive-report');
        if (!(await this.acquireDistributedLock(lockKey, 23 * 3600))) return;
        logger.info('[CronService] Running midnight executive audit report');
        await this.generateMidnightExecutiveReport();
      },
      tzOptions
    );

    // 2. Daily Report Evening Reminder (Every day at 21:00 in operational timezone)
    cron.schedule(
      '0 21 * * *',
      async () => {
        const lockKey = buildCronWindowKey('daily-report-reminders');
        if (!(await this.acquireDistributedLock(lockKey, 23 * 3600))) return;
        logger.info('[CronService] Sending daily report submission reminders');
        await this.sendDailyReportReminders();
      },
      tzOptions
    );

    // 3. Morning Routine Tasks Generation (Every day at 08:30 AM in operational timezone)
    cron.schedule(
      '30 8 * * *',
      async () => {
        const lockKey = buildCronWindowKey('morning-routine-tasks');
        if (!(await this.acquireDistributedLock(lockKey, 23 * 3600))) return;
        logger.info('[CronService] Generating morning routine tasks at 08:30 AM');
        await this.generateMorningRoutineTasks();
      },
      tzOptions
    );

    // 4. Multi-Tier Escalation Ladder (Every hour)
    cron.schedule(
      '0 * * * *',
      async () => {
        const lockKey = buildCronWindowKey('escalation-ladder', new Date(), 60);
        if (!(await this.acquireDistributedLock(lockKey, 55 * 60))) return;
        logger.info('[CronService] Running automated escalation ladder for pending & delayed tasks');
        await this.runEscalationLadder();
      },
      tzOptions
    );

    // 5. Task Delay / Overdue Checks (Every 2 hours)
    cron.schedule(
      '0 */2 * * *',
      async () => {
        const lockKey = buildCronWindowKey('overdue-tasks-check', new Date(), 120);
        if (!(await this.acquireDistributedLock(lockKey, 110 * 60))) return;
        logger.info('[CronService] Checking for overdue tasks and approaching deadlines');
        await this.checkOverdueTasks();
      },
      tzOptions
    );
  }

  /**
   * Generates Midnight 12:00 AM Executive Brief + Detailed Audit Report
   */
  public static async generateMidnightExecutiveReport() {
    try {
      const yesterday = new Date(Date.now() - 86400000);
      const targetDateStr = getLocalDateString(yesterday);

      // 1. Fetch all registered employees
      const allEmployees = await User.find({ accessRole: 'EMPLOYEE' })
        .select('_id fullName email primaryDepartment jobTitles');

      // 2. Fetch submitted daily reports for that date
      const submittedReports = await DailyReport.find({ reportDate: targetDateStr })
        .populate('employeeId', 'fullName email primaryDepartment');

      const submittedEmpIds = new Set(submittedReports.map(r => (r.employeeId as any)?._id?.toString()));
      const missingEmployees = allEmployees.filter(emp => !submittedEmpIds.has(emp._id.toString()));

      // 3. Fetch attendance hours
      const sessions = await AttendanceSession.find({ dateStr: targetDateStr });
      const hoursByEmp: Record<string, number> = {};
      sessions.forEach(s => {
        const empId = s.employeeId.toString();
        hoursByEmp[empId] = (hoursByEmp[empId] || 0) + (s.totalDurationMinutes || 0);
      });

      // 4. Fetch treasury spent
      const vault = await CompanyVault.findOne();
      const treasurySpent = vault
        ? Object.values(vault.totalSpentByCategory || {}).reduce((a: number, b: number) => a + b, 0)
        : 0;

      // Executive Brief Summary
      const briefTitle = `🌙 التقرير التنفيذي اليومي لمنتصف الليل (${targetDateStr})`;
      const briefMessage = `نسبة تسليم التقارير: ${submittedReports.length}/${allEmployees.length} • الموظفون المتأخرون عن التسليم: ${missingEmployees.length} • الرصيد المتاح للصرف: $${(vault?.treasuryBalance || 0).toLocaleString()} USDT.`;

      // Detailed Report Content
      const detailedLog = `
========================================
تقرير المتابعة والرقابة اليومي الشامل (Audit Trail)
التاريخ: ${targetDateStr}
========================================

1. ملخص التزام الموظفين بالتقارير اليومية:
- تم تسليم: ${submittedReports.length} تقرير
- المتأخرون عن التسليم (${missingEmployees.length}):
${missingEmployees.map(m => `  • ${m.fullName} (${m.primaryDepartment || 'عام'})`).join('\n') || '  لا يوجد متأخرون، التزام 100%!'}

2. سجل ساعات العمل الفعلية:
${allEmployees.map(m => {
  const mins = hoursByEmp[m._id.toString()] || 0;
  const hours = (mins / 60).toFixed(1);
  return `  • ${m.fullName}: ${hours} ساعة عمل فعلية`;
}).join('\n')}

3. الوضع المالي للخزينة والمصروفات:
- رصيد الصندوق المتاح للصرف: $${(vault?.treasuryBalance || 0).toLocaleString()} USDT
- إجمالي المصروفات المنفذة تاريخياً: $${treasurySpent.toLocaleString()} USDT
========================================
      `;

      // Notify Super Admins
      const superAdmins = await User.find({ accessRole: 'SUPER_ADMIN' }).select('_id');
      for (const admin of superAdmins) {
        await SocketService.dispatchNotification({
          recipientId: admin._id.toString(),
          title: briefTitle,
          message: briefMessage,
          type: 'DAILY_REPORT_REMINDER',
          priority: 'HIGH'
        });
      }

      console.log('✅ Midnight Executive Report generated successfully:\n', detailedLog);
      return { briefTitle, briefMessage, detailedLog };
    } catch (err) {
      console.error('Error in generateMidnightExecutiveReport:', err);
    }
  }

  /**
   * Evening reminder at 9:00 PM for employees who haven't submitted daily report
   */
  public static async sendDailyReportReminders() {
    try {
      const todayStr = getLocalDateString();
      const allEmployees = await User.find({ accessRole: 'EMPLOYEE' }).select('_id fullName');
      const submittedReports = await DailyReport.find({ reportDate: todayStr }).select('employeeId');

      const submittedEmpIds = new Set(submittedReports.map(r => r.employeeId.toString()));
      const pendingEmployees = allEmployees.filter(emp => !submittedEmpIds.has(emp._id.toString()));

      for (const emp of pendingEmployees) {
        await SocketService.dispatchNotification({
          recipientId: emp._id.toString(),
          title: '📝 تذكير بتقديم التقرير اليومي',
          message: `مرحباً ${emp.fullName}، يرجى التكرم بتسليم تقريرك اليومي قبل الساعة 12:00 منتصف الليل لتوثيق إنجازاتك.`,
          type: 'DAILY_REPORT_REMINDER',
          priority: 'MEDIUM',
          relatedUrl: '/tasks'
        });
      }
    } catch (err) {
      console.error('Error sending daily report reminders:', err);
    }
  }

  /**
   * Generates Morning Routine Tasks every day at 08:30 AM
   */
  public static async generateMorningRoutineTasks() {
    try {
      const todayStr = getLocalDateString();
      const existing = await Task.findOne({
        title: { $regex: /الفحص الصباحي لخوادم البوتات/i },
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      });

      if (existing) {
        console.log('🌅 Morning routine task already generated for today.');
        return;
      }

      const employees = await User.find({ accessRole: 'EMPLOYEE' });
      if (employees.length === 0) {
        return;
      }

      const adminUser = await User.findOne({ accessRole: 'SUPER_ADMIN' });
      if (!adminUser) return;
      const assignees = employees.slice(0, 2).map(u => u._id);

      const routineTask = await Task.create({
        title: 'الفحص الصباحي لخوادم البوتات واستقرار الـ API 💻',
        description: 'مراقبة صحة سيرفرات تداول البوتات، وفحص استجابة الـ API Webhooks، والتأكد من عدم وجود أخطاء في الـ Logs.',
        targetPlatform: 'GENERAL_SYSTEM',
        serviceCategory: 'BOT_SERVER_HEALTH',
        priority: 'HIGH',
        executionType: 'ADMIN_ASSIGNED',
        createdBy: adminUser._id,
        assignedTo: assignees,
        isDailyRecurring: true,
        dailyRecurrenceTime: '08:30 ص',
        status: 'IN_PROGRESS',
        stages: [
          {
            stageOrder: 1,
            stageTitle: 'دراسة المتطلبات وربط الـ API',
            instructions: 'فحص اتصالات الـ Webhooks مع سيرفر التيليجرام وخوادم Binance/Bybit API.',
            status: 'IN_PROGRESS',
            requiredInputs: [
              { fieldLabel: 'تقرير فحص الاستجابة ومعدل الـ Latency', expectedType: 'TEXT', isMandatory: true }
            ]
          },
          {
            stageOrder: 2,
            stageTitle: 'كتابة الكود البرمجي واختبار البوت',
            instructions: 'التأكد من جاهزية المحركات ومعالجة أي توقفات برمجية سابقة.',
            status: 'LOCKED',
            requiredInputs: [
              { fieldLabel: 'لقطة شاشة لاختبار الأوامر', expectedType: 'IMAGE', isMandatory: true }
            ]
          },
          {
            stageOrder: 3,
            stageTitle: 'النشر على السيرفر ومراقبة الـ Logs',
            instructions: 'مراقبة السجلات الحية للتأكد من خلوها من أي Crash أو Out of Memory.',
            status: 'LOCKED',
            requiredInputs: [
              { fieldLabel: 'لقطة من سجلات الـ PM2 / Docker logs', expectedType: 'IMAGE', isMandatory: true }
            ]
          }
        ]
      });

      for (const empId of assignees) {
        await SocketService.dispatchNotification({
          recipientId: empId.toString(),
          title: '🌅 مهمة روتينية صباحية (08:30 ص)',
          message: 'تم تفعيل مهمة الفحص الصباحي لخوادم البوتات واستقرار الـ API تلقائياً.',
          type: 'TASK_ASSIGNED',
          priority: 'HIGH',
          relatedEntityId: routineTask._id.toString(),
          relatedUrl: '/tasks'
        });
      }

      console.log('✅ Morning routine tasks initialized successfully.');
    } catch (err) {
      console.error('Error generating morning routine tasks:', err);
    }
  }

  /**
   * Automated Multi-Tier Escalation Ladder
   * Level 1: Delayed 1-2 hours -> Gentle reminder to employee
   * Level 2: Delayed 4-8 hours -> Yellow escalation warning
   * Level 3: Delayed > 8 hours or Urgent -> Red critical alert to Super Admin Leadership
   */
  public static async runEscalationLadder() {
    try {
      const now = new Date();
      const inProgressTasks = await Task.find({
        status: { $in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { $exists: true, $ne: null }
      }).populate('assignedTo', '_id fullName accessRole');

      const superAdmins = await User.find({ accessRole: 'SUPER_ADMIN' }).select('_id');

      for (const task of inProgressTasks) {
        if (!task.dueDate) continue;
        const diffMs = now.getTime() - new Date(task.dueDate).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours >= 8 || (diffHours >= 4 && task.priority === 'CRITICAL')) {
          // Level 3 Critical Escalation: Alert Super Admins
          for (const admin of superAdmins) {
            await SocketService.dispatchNotification({
              recipientId: admin._id.toString(),
              title: '🚨 إنذار أحمر: سلم التصعيد التنفيذي',
              message: `المهمة الحرجة [${task.title}] متأخرة بأكثر من ${Math.floor(diffHours)} ساعات! يرجى التدخل الفوري.`,
              type: 'OVERDUE_TASK',
              priority: 'URGENT',
              relatedEntityId: task._id.toString(),
              relatedUrl: '/tasks'
            });
          }
        } else if (diffHours >= 2) {
          // Level 2 Escalation: Yellow Warning to Assigned Staff
          for (const emp of (task.assignedTo as any[])) {
            await SocketService.dispatchNotification({
              recipientId: emp._id.toString(),
              title: '⚠️ تصعيد أصفر: تنبيه تأخر مرحلي',
              message: `مرحباً ${emp.fullName}، مضى على موعد تسليم المهمة [${task.title}] أكثر من ساعتين. يرجى تسليم المرحلة فوراً.`,
              type: 'OVERDUE_TASK',
              priority: 'HIGH',
              relatedEntityId: task._id.toString(),
              relatedUrl: '/workspace'
            });
          }
        }
      }
    } catch (err) {
      console.error('Error running escalation ladder:', err);
    }
  }

  /**
   * Check tasks that are overdue or due within 2 hours
   */
  public static async checkOverdueTasks() {
    try {
      const now = new Date();
      const overdueTasks = await Task.find({
        status: { $in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { $lte: now }
      }).populate('assignedTo', '_id fullName');

      for (const task of overdueTasks) {
        for (const emp of (task.assignedTo as any[])) {
          await SocketService.dispatchNotification({
            recipientId: emp._id.toString(),
            title: '⚠️ تنبيه: تأخر موعد تسليم المهمة',
            message: `المهمة [${task.title}] تجاوزت موعد التسليم المحدد (${new Date(task.dueDate!).toLocaleDateString('ar-YE')}). يرجى استكمال المراحل وتسليمها فوراً.`,
            type: 'OVERDUE_TASK',
            priority: 'URGENT',
            relatedEntityId: task._id.toString(),
            relatedUrl: '/tasks'
          });
        }
      }
    } catch (err) {
      console.error('Error checking overdue tasks:', err);
    }
  }
}

