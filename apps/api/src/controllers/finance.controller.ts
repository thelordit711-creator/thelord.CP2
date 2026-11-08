import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { Task } from '../models/Task.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { CompanyVault } from '../models/CompanyVault.model';
import { EmployeeLedger } from '../models/EmployeeLedger.model';
import { User } from '../models/User.model';
import { PayrollSchedule } from '../models/PayrollSchedule.model';
import { Notification } from '../models/Notification.model';
import { AccountingService } from '../services/accounting.service';
import { SocketService } from '../services/socket.service';
import { AuditService } from '../services/audit.service';
import { IFinancialDecisionDto, IAdjustVaultBalanceDto, IManageLedgerDto } from '@lord/shared-types';

export class FinanceController {
  // 1. Admin gets all pending financial requests
  public static async getFinancialRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requests = await Task.find({
        'financialRequirement.requiresBudget': true,
        'financialRequirement.adminApprovalStatus': 'PENDING_ADMIN'
      })
        .populate('createdBy', 'fullName email avatarUrl phoneNumber payoutMethods')
        .sort({ createdAt: -1 });

      res.json({ success: true, data: requests });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 2. Admin decides on financial request (Approve -> PayoutOrder, Reject, Note)
  public static async decideFinancialRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { decision, adminNotes } = req.body as IFinancialDecisionDto;

      const task = await Task.findById(id).populate('createdBy');
      if (!task || !task.financialRequirement.requiresBudget) {
        res.status(404).json({ success: false, error: 'Task financial request not found' });
        return;
      }

      const creator = await User.findById(task.createdBy);
      if (!creator) {
        res.status(404).json({ success: false, error: 'Beneficiary user not found' });
        return;
      }

      if (decision === 'APPROVE') {
        const reqPayout = task.financialRequirement.payoutMethodRequested;
        const destDetails: Record<string, string> = {};

        if (reqPayout === 'BEP20_USDT') {
          destDetails.bep20Address = creator.payoutMethods.bep20Address || '';
        } else if (reqPayout === 'JEEB_WALLET') {
          destDetails.walletPhoneNumber = creator.payoutMethods.jeebWallet?.registeredPhone || creator.phoneNumber || '';
          destDetails.accountHolderName = creator.payoutMethods.jeebWallet?.accountHolderName || creator.fullName;
        } else if (reqPayout === 'JAWALI_WALLET') {
          destDetails.walletPhoneNumber = creator.payoutMethods.jawaliWallet?.registeredPhone || creator.phoneNumber || '';
          destDetails.accountHolderName = creator.payoutMethods.jawaliWallet?.accountHolderName || creator.fullName;
        }

        const payoutOrder = await PayoutOrder.create({
          relatedTaskId: task._id,
          beneficiaryId: creator._id,
          amount: task.financialRequirement.amount,
          currency: task.financialRequirement.currency,
          payoutMethod: reqPayout,
          destinationDetails: destDetails,
          category: task.financialRequirement.expenseCategory || 'GENERAL',
          summaryForTreasury: `ميزانية مهمة: ${task.title}`,
          executionStatus: 'WAITING_TREASURY'
        });

        task.financialRequirement.adminApprovalStatus = 'APPROVED';
        task.financialRequirement.approvedAt = new Date();
        task.financialRequirement.adminNotes = adminNotes;
        task.financialRequirement.payoutOrderId = payoutOrder._id as any;
        await task.save();

        // Notify Treasury & Employee
        SocketService.emitToTreasury('payout:new_order', payoutOrder);
        SocketService.emitToUser(creator._id.toString(), 'finance:approved', {
          taskId: task._id,
          amount: task.financialRequirement.amount
        });

        res.json({
          success: true,
          message: 'Budget approved and forwarded to Treasury Desk',
          data: { task, payoutOrder }
        });
      } else if (decision === 'REJECT') {
        task.financialRequirement.adminApprovalStatus = 'REJECTED';
        task.financialRequirement.adminNotes = adminNotes;
        await task.save();

        SocketService.emitToUser(creator._id.toString(), 'finance:rejected', {
          taskId: task._id,
          reason: adminNotes
        });

        res.json({ success: true, message: 'Request rejected', data: task });
      } else {
        task.financialRequirement.adminApprovalStatus = 'NEEDS_CHANGES';
        task.financialRequirement.adminNotes = adminNotes;
        await task.save();

        SocketService.emitToUser(creator._id.toString(), 'finance:notes', {
          taskId: task._id,
          notes: adminNotes
        });

        res.json({ success: true, message: 'Notes sent to employee', data: task });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 3. Vault & General Budget
  public static async getVault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vault = await AccountingService.getOrCreateVault();
      res.json({ success: true, data: vault });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async adjustVault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const body = req.body as IAdjustVaultBalanceDto;
      const amount = Number(body.amount);

      if (isNaN(amount) || amount <= 0) {
        res.status(400).json({ success: false, error: 'يرجى إدخال مبلغ صحيح أكبر من الصفر' });
        return;
      }

      const adminId = req.user?._id?.toString() || '';
      let vault;

      if (body.actionType === 'FUND_TREASURY') {
        vault = await AccountingService.fundTreasuryFromGeneralBudget(amount, body.reason, adminId, body.targetSegment);
      } else if (body.actionType === 'RETURN_TO_BUDGET') {
        vault = await AccountingService.returnFromTreasuryToGeneralBudget(amount, body.reason, adminId);
      } else if (body.actionType === 'DEPOSIT_GENERAL_BUDGET') {
        vault = await AccountingService.depositToGeneralBudget(amount, body.reason, adminId);
      } else {
        vault = await AccountingService.getOrCreateVault();

        if (body.targetBalance === 'TREASURY_BALANCE') {
          if (body.operation === 'INCREASE') {
            // Strict Accounting Rule: Any addition to treasury must be deducted from General Budget
            if (vault.generalBudget < amount) {
              res.status(400).json({
                success: false,
                error: `رصيد الميزانية العامة للشركة (${vault.generalBudget.toLocaleString()} USDT) غير كافٍ لتغذية الصندوق بمبلغ (${amount.toLocaleString()} USDT). يرجى إيداع رصيد أولاً في الميزانية العامة.`
              });
              return;
            }
            vault.generalBudget -= amount;
            vault.treasuryBalance += amount;
          } else if (body.operation === 'DECREASE') {
            if (vault.treasuryBalance < amount) {
              res.status(400).json({
                success: false,
                error: `رصيد الصندوق المتاح (${vault.treasuryBalance.toLocaleString()} USDT) أقل من المبلغ المطلوب خصمه (${amount.toLocaleString()} USDT).`
              });
              return;
            }
            vault.treasuryBalance -= amount;
            vault.generalBudget += amount;
          } else if (body.operation === 'SET') {
            vault.treasuryBalance = amount;
          }
        } else {
          // GENERAL_BUDGET
          if (body.operation === 'INCREASE') {
            vault.generalBudget += amount;
          } else if (body.operation === 'DECREASE') {
            if (vault.generalBudget < amount) {
              res.status(400).json({ success: false, error: 'المبلغ المطلوب خصمه أكبر من رصيد الميزانية العامة' });
              return;
            }
            vault.generalBudget -= amount;
          } else if (body.operation === 'SET') {
            vault.generalBudget = amount;
          }
        }

        vault.manualAdjustmentsLog.push({
          adjustedBy: req.user?._id as any,
          targetBalance: body.targetBalance || 'GENERAL_BUDGET',
          operation: body.operation || 'INCREASE',
          amount,
          reason: body.reason,
          createdAt: new Date()
        });

        await vault.save();
        SocketService.emitToAdmins('vault:updated', vault);
      }

      res.json({
        success: true,
        message: 'تم تحديث الأرصدة بنجاح وفق القواعد المحاسبية للمنظومة',
        data: vault
      });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  // 4. Employee Ledger (Bonuses, Deductions, Warnings, Salary)
  public static async manageEmployeeLedger(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const body = req.body as IManageLedgerDto;

      const employee = await User.findById(id);
      if (!employee) {
        res.status(404).json({ success: false, error: 'Employee not found' });
        return;
      }

      // Update compensation fields if provided
      if (body.baseSalary !== undefined) {
        employee.compensation.baseSalary = body.baseSalary;
      }
      if (body.payoutDayOfMonth !== undefined) {
        employee.compensation.payoutDayOfMonth = body.payoutDayOfMonth;
      }

      if (body.entryType === 'BONUS') {
        employee.compensation.activeBonuses += body.amount;
      } else if (body.entryType === 'DEDUCTION') {
        employee.compensation.activeDeductions += body.amount;
      } else if (body.entryType === 'WARNING') {
        employee.compensation.warningsCount += 1;
      }

      await employee.save();

      const ledgerEntry = await EmployeeLedger.create({
        employeeId: employee._id,
        entryType: body.entryType,
        amount: body.amount || 0,
        payoutMethodUsed: body.payoutMethodUsed || 'NONE',
        reason: body.reason,
        warningLevel: body.warningLevel || 'NONE',
        recordedBy: req.user?._id
      });

      SocketService.emitToUser(employee._id.toString(), 'ledger:updated', ledgerEntry);

      res.json({
        success: true,
        message: 'Employee ledger updated successfully',
        data: { employee, ledgerEntry }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 5. Employee gets their own statement
  public static async getMyStatement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?._id;
      const ledger = await EmployeeLedger.find({ employeeId }).sort({ createdAt: -1 });
      res.json({ success: true, data: ledger });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 6. Confirm Receipt of Payout (Employee confirms they received funds)
  public static async confirmPayoutReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { note } = req.body;

      const order = await PayoutOrder.findById(orderId).populate('beneficiaryId', 'fullName email');
      if (!order) {
        res.status(404).json({ success: false, error: 'أمر الصرف غير موجود' });
        return;
      }

      const beneficiaryIdStr = (order.beneficiaryId as any)?._id?.toString() || order.beneficiaryId?.toString();
      const isBeneficiary = req.user && beneficiaryIdStr === String(req.user._id);
      const isAdmin = req.user?.accessRole === 'SUPER_ADMIN';

      if (!isBeneficiary && !isAdmin) {
        res.status(403).json({ success: false, error: 'غير مصرح لك بتأكيد استلام هذا الصرف' });
        return;
      }

      (order as any).employeeConfirmation = {
        isConfirmed: true,
        confirmedAt: new Date(),
        confirmationNote: note?.trim() || 'تم تأكيد الاستلام بنجاح من قبل المستلم'
      };
      await order.save();

      // Audit Trail
      if (req.user) {
        await AuditService.logAction({
          userId: req.user._id,
          userName: req.user.fullName,
          userEmail: req.user.email,
          userRole: req.user.accessRole,
          actionType: 'CONFIRM_PAYOUT_RECEIPT',
          targetId: String(order._id),
          targetName: `أمر صرف بقيمة ${order.amount} ${order.currency}`,
          targetType: 'PAYOUT',
          severity: 'INFO',
          details: {
            amount: order.amount,
            payoutMethod: order.payoutMethod,
            note: (order as any).employeeConfirmation?.confirmationNote
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }

      // Realtime Broadcast
      SocketService.emitToAdmins('payout:receipt_confirmed', {
        orderId: order._id,
        beneficiaryId: order.beneficiaryId,
        confirmedAt: (order as any).employeeConfirmation?.confirmedAt,
        note: (order as any).employeeConfirmation?.confirmationNote
      });

      res.json({
        success: true,
        data: order,
        message: 'تم تأكيد استلام الحوالة وإشعار الصندوق والإدارة بنجاح! ✓'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 7. Admin: Get all employee payroll schedules (10-day tranches & allowances)
  public static async getPayrollSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employees = await User.find({ accessRole: { $in: ['EMPLOYEE', 'TREASURY'] } })
        .select('fullName email avatarUrl primaryDepartment jobTitles compensation payoutMethods isSuspended')
        .sort({ fullName: 1 });

      const existingSchedules = await PayrollSchedule.find().lean();
      const schedulesMap = new Map(existingSchedules.map((s: any) => [s.employeeId.toString(), s]));

      // Merge and auto-initialize missing schedules
      const merged = await Promise.all(
        employees.map(async (emp: any) => {
          let schedule: any = schedulesMap.get(emp._id.toString());
          if (!schedule) {
            const created = await PayrollSchedule.create({
              employeeId: emp._id,
              baseMonthlySalary: emp.compensation?.baseSalary || 0,
              cycleType: 'EVERY_10_DAYS',
              tranche1Day: 10,
              tranche2Day: 20,
              tranche3Day: 30,
              allowances: [],
              requireEmployeeReceiptConfirmation: false,
              sendProofAttachmentToEmployee: true
            });
            schedule = created.toObject();
          }
          return {
            ...schedule,
            employee: emp
          };
        })
      );

      res.json({ success: true, data: merged });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 8. Admin: Update employee payroll schedule & allowances
  public static async updatePayrollSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const {
        baseMonthlySalary,
        cycleType,
        tranche1Day,
        tranche2Day,
        tranche3Day,
        allowances,
        requireEmployeeReceiptConfirmation,
        sendProofAttachmentToEmployee
      } = req.body;

      let schedule = await PayrollSchedule.findOne({ employeeId });
      if (!schedule) {
        schedule = new PayrollSchedule({ employeeId });
      }

      if (typeof baseMonthlySalary === 'number') schedule.baseMonthlySalary = Math.max(0, baseMonthlySalary);
      if (cycleType) schedule.cycleType = cycleType;
      if (tranche1Day) schedule.tranche1Day = tranche1Day;
      if (tranche2Day) schedule.tranche2Day = tranche2Day;
      if (tranche3Day) schedule.tranche3Day = tranche3Day;
      if (Array.isArray(allowances)) schedule.allowances = allowances;
      if (typeof requireEmployeeReceiptConfirmation === 'boolean') {
        schedule.requireEmployeeReceiptConfirmation = requireEmployeeReceiptConfirmation;
      }
      if (typeof sendProofAttachmentToEmployee === 'boolean') {
        schedule.sendProofAttachmentToEmployee = sendProofAttachmentToEmployee;
      }

      await schedule.save();

      // Update User compensation field as well for synchronization
      await User.findByIdAndUpdate(employeeId, {
        'compensation.baseSalary': schedule.baseMonthlySalary
      });

      res.json({
        success: true,
        data: schedule,
        message: 'تم تحديث جدول تجزئة الراتب والبدلات الشهرية بنجاح! ⚙️'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 9. Admin: Generate Tranche Payout Orders (Disburse tranche 1, 2, 3 or monthly allowances)
  public static async generateTranchePayouts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { trancheType, employeeIds } = req.body; // e.g. 'TRANCHE_1' | 'TRANCHE_2' | 'TRANCHE_3' | 'MONTHLY_ALLOWANCE'

      const query: any = {};
      if (Array.isArray(employeeIds) && employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds };
      }

      const schedules = await PayrollSchedule.find(query).populate('employeeId', 'fullName email payoutMethods isSuspended');

      const createdOrders = [];

      for (const sched of schedules) {
        const emp = sched.employeeId as any;
        if (!emp || emp.isSuspended) continue;

        let amount = 0;
        let summary = '';
        let category: any = 'SALARY';

        if (trancheType === 'TRANCHE_1' || trancheType === 'TRANCHE_2' || trancheType === 'TRANCHE_3') {
          // If 10-day cycle: salary is split into 3 parts (1/3 each)
          const isTenDay = sched.cycleType === 'EVERY_10_DAYS';
          amount = isTenDay ? Math.round((sched.baseMonthlySalary / 3) * 100) / 100 : sched.baseMonthlySalary;
          const trancheLabel = trancheType === 'TRANCHE_1' ? 'الأولى (1-10)' : trancheType === 'TRANCHE_2' ? 'الثانية (11-20)' : 'الثالثة (21-30)';
          summary = `صرف دفعة الراتب ${trancheLabel} - ${emp.fullName}`;
        } else if (trancheType === 'MONTHLY_ALLOWANCE') {
          // Sum active allowances (like internet allowance, communications)
          const activeAllowances = (sched.allowances || []).filter((a: any) => a.isActive);
          amount = activeAllowances.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
          summary = `صرف البدلات والمصروفات الشهرية (بدل نت/اتصالات) - ${emp.fullName}`;
          category = 'ALLOWANCE';
        }

        if (amount <= 0) continue;

        const defaultMethod = emp.payoutMethods?.primary || 'BEP20_USDT';

        const order = await PayoutOrder.create({
          beneficiaryId: emp._id,
          amount,
          currency: 'USDT',
          payoutMethod: defaultMethod,
          destinationDetails: {
            bep20Address: emp.payoutMethods?.bep20Address,
            walletPhoneNumber: emp.payoutMethods?.jeebPhoneNumber || emp.payoutMethods?.jawaliPhoneNumber,
            accountHolderName: emp.fullName
          },
          category,
          payrollTranche: trancheType,
          summaryForTreasury: summary,
          executionStatus: 'WAITING_TREASURY',
          requireConfirmation: sched.requireEmployeeReceiptConfirmation,
          sendProofToEmployee: sched.sendProofAttachmentToEmployee
        });

        createdOrders.push(order);

        // Notify Treasury
        SocketService.emitToAdmins('payout:created', {
          orderId: order._id,
          amount: order.amount,
          beneficiaryName: emp.fullName,
          summary: order.summaryForTreasury
        });
      }

      res.json({
        success: true,
        data: createdOrders,
        message: `تم إصدار (${createdOrders.length}) أمر صرف بنجاح وإرسالها لمكتب الصندوق والخزينة 🚀`
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // 10. Generate Monthly Comprehensive Report for Employee
  public static async getEmployeeMonthlyReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { year, month } = req.query;

      const targetYear = Number(year) || new Date().getFullYear();
      const targetMonth = Number(month) || new Date().getMonth() + 1;

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

      const [employee, schedule, ledgerEntries, payoutOrders] = await Promise.all([
        User.findById(employeeId).select('fullName email primaryDepartment jobTitles compensation payoutMethods'),
        PayrollSchedule.findOne({ employeeId }),
        EmployeeLedger.find({
          employeeId,
          createdAt: { $gte: startDate, $lte: endDate }
        }).sort({ createdAt: 1 }),
        PayoutOrder.find({
          beneficiaryId: employeeId,
          createdAt: { $gte: startDate, $lte: endDate }
        }).sort({ createdAt: 1 })
      ]);

      if (!employee) {
        res.status(404).json({ success: false, error: 'الموظف غير موجود' });
        return;
      }

      const totalDisbursed = payoutOrders
        .filter((o) => o.executionStatus === 'DISBURSED')
        .reduce((sum, o) => sum + o.amount, 0);

      const totalPending = payoutOrders
        .filter((o) => o.executionStatus !== 'DISBURSED')
        .reduce((sum, o) => sum + o.amount, 0);

      const report = {
        employee,
        period: { year: targetYear, month: targetMonth },
        baseMonthlySalary: schedule?.baseMonthlySalary ?? (employee as any).compensation?.baseSalary ?? 0,
        cycleType: schedule?.cycleType ?? 'EVERY_10_DAYS',
        allowances: schedule?.allowances ?? [],
        totalDisbursed,
        totalPending,
        ledgerEntries,
        payoutOrders
      };

      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

