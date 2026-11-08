import mongoose from 'mongoose';
import { CompanyVault } from '../models/CompanyVault.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { EmployeeLedger } from '../models/EmployeeLedger.model';
import { User } from '../models/User.model';
import { RecurringExpense } from '../models/RecurringExpense.model';
import { SocketService } from './socket.service';
import { AuditService } from './audit.service';
import { PayoutCategory, LedgerEntryType } from '@lord/shared-types';

export class AccountingService {
  /**
   * Initializes CompanyVault if not created yet
   */
  public static async getOrCreateVault() {
    let vault = await CompanyVault.findOne();
    if (!vault) {
      vault = await CompanyVault.create({
        generalBudget: 0,
        treasuryBalance: 0,
        totalSpentByCategory: {
          salaries: 0,
          bonuses: 0,
          advances: 0,
          telegramOfficialAds: 0,
          telegramChannelPromos: 0,
          softwareSubscriptions: 0,
          otherExpenses: 0
        },
        totalDeductionsApplied: 0,
        manualAdjustmentsLog: []
      });
    }
    return vault;
  }

  /**
   * Deposit new capital or profit into the General Budget
   */
  public static async depositToGeneralBudget(amount: number, reason: string, adminId: string) {
    if (amount <= 0) {
      throw new Error('المبلغ المودع يجب أن يكون أكبر من الصفر');
    }
    const vault = await this.getOrCreateVault();

    vault.generalBudget += amount;

    vault.manualAdjustmentsLog.push({
      adjustedBy: adminId as any,
      targetBalance: 'GENERAL_BUDGET',
      operation: 'DEPOSIT',
      amount,
      reason: reason || 'إيداع رأس مال / أرباح في الميزانية العامة للشركة',
      createdAt: new Date()
    });

    await vault.save();
    SocketService.emitToAdmins('vault:updated', vault);

    // Record audit trail for Surplus Return
    try {
      const adminUser = adminId ? await User.findById(adminId) : null;
      await AuditService.logAction({
        userId: adminId || 'admin',
        userName: adminUser?.fullName || 'القائد الأعلى',
        userEmail: adminUser?.email || 'admin@thelordofcrypto.com',
        userRole: (adminUser?.accessRole as any) || 'SUPER_ADMIN',
        actionType: 'SYSTEM_SECURITY_CONFIG',
        targetName: 'الصندوق والخزينة',
        targetType: 'SYSTEM',
        severity: 'INFO',
        details: {
          action: 'استرجاع فائض سيولة من الصندوق إلى الميزانية العامة',
          amount,
          reason
        }
      });
    } catch (_err) {}
    return vault;
  }

  /**
   * Feed/Transfer funds from General Budget to Treasury Balance
   * Invariant: any addition to Treasury is deducted from General Budget
   */
  public static async fundTreasuryFromGeneralBudget(
    amount: number,
    reason: string,
    adminId: string,
    targetSegment?: 'salaries' | 'marketing' | 'operationalReserve'
  ) {
    if (amount <= 0) {
      throw new Error('المبلغ المطلوب تحويله لتغذية الصندوق يجب أن يكون أكبر من الصفر');
    }
    const vault = await this.getOrCreateVault();

    if (vault.generalBudget < amount) {
      throw new Error(
        `رصيد الميزانية العامة للشركة (${vault.generalBudget.toLocaleString()} USDT) غير كافٍ لتغذية الصندوق بمبلغ (${amount.toLocaleString()} USDT). يرجى إيداع رصيد أولاً في الميزانية العامة.`
      );
    }

    vault.generalBudget -= amount;
    vault.treasuryBalance += amount;

    // Credit the specific sub-vault segment if specified
    if (targetSegment && vault.segmentedVaults && vault.segmentedVaults[targetSegment]) {
      vault.segmentedVaults[targetSegment].balance += amount;
      if (vault.segmentedVaults[targetSegment].balance > vault.segmentedVaults[targetSegment].monthlyAllocated) {
        vault.segmentedVaults[targetSegment].monthlyAllocated = vault.segmentedVaults[targetSegment].balance;
      }
    }

    const segmentLabel =
      targetSegment === 'salaries'
        ? ' (صندوق الرواتب والأجور)'
        : targetSegment === 'marketing'
        ? ' (صندوق التسويق والإعلانات)'
        : targetSegment === 'operationalReserve'
        ? ' (صندوق الاحتياطي التقني والتشغيلي)'
        : '';

    vault.manualAdjustmentsLog.push({
      adjustedBy: adminId as any,
      targetBalance: 'TRANSFER_BETWEEN_BUDGETS',
      operation: 'FUND_TREASURY',
      amount,
      reason: (reason || 'تغذية رصيد الصندوق المتاح للصرف بالخصم من الميزانية العامة') + segmentLabel,
      createdAt: new Date()
    });

    await vault.save();
    SocketService.emitToAdmins('vault:updated', vault);

    // Record audit trail for Surplus Return
    try {
      const adminUser = adminId ? await User.findById(adminId) : null;
      await AuditService.logAction({
        userId: adminId || 'admin',
        userName: adminUser?.fullName || 'القائد الأعلى',
        userEmail: adminUser?.email || 'admin@thelordofcrypto.com',
        userRole: (adminUser?.accessRole as any) || 'SUPER_ADMIN',
        actionType: 'SYSTEM_SECURITY_CONFIG',
        targetName: 'الصندوق والخزينة',
        targetType: 'SYSTEM',
        severity: 'INFO',
        details: {
          action: 'استرجاع فائض سيولة من الصندوق إلى الميزانية العامة',
          amount,
          reason
        }
      });
    } catch (_err) {}
    return vault;
  }

  /**
   * Return surplus funds from Treasury back to General Budget
   */
  public static async returnFromTreasuryToGeneralBudget(amount: number, reason: string, adminId: string) {
    if (amount <= 0) {
      throw new Error('المبلغ المطلوب استرجاعه يجب أن يكون أكبر من الصفر');
    }
    const vault = await this.getOrCreateVault();

    if (vault.treasuryBalance < amount) {
      throw new Error(
        `رصيد الصندوق المتاح للصرف (${vault.treasuryBalance.toLocaleString()} USDT) أقل من المبلغ المطلوب استرجاعه (${amount.toLocaleString()} USDT).`
      );
    }

    vault.treasuryBalance -= amount;
    vault.generalBudget += amount;

    vault.manualAdjustmentsLog.push({
      adjustedBy: adminId as any,
      targetBalance: 'TRANSFER_BETWEEN_BUDGETS',
      operation: 'RETURN_TO_BUDGET',
      amount,
      reason: reason || 'استرجاع فائض سيولة من الصندوق إلى الميزانية العامة',
      createdAt: new Date()
    });

    await vault.save();
    SocketService.emitToAdmins('vault:updated', vault);

    // Record audit trail for Surplus Return
    try {
      const adminUser = adminId ? await User.findById(adminId) : null;
      await AuditService.logAction({
        userId: adminId || 'admin',
        userName: adminUser?.fullName || 'القائد الأعلى',
        userEmail: adminUser?.email || 'admin@thelordofcrypto.com',
        userRole: (adminUser?.accessRole as any) || 'SUPER_ADMIN',
        actionType: 'SYSTEM_SECURITY_CONFIG',
        targetName: 'الصندوق والخزينة',
        targetType: 'SYSTEM',
        severity: 'INFO',
        details: {
          action: 'استرجاع فائض سيولة من الصندوق إلى الميزانية العامة',
          amount,
          reason
        }
      });
    } catch (_err) {}
    return vault;
  }

  /**
   * Atomically executes the disbursement deduction EXCLUSIVELY through Treasury Balance
   */
  public static async executeDisbursement(
    payoutOrderId: string,
    treasuryUserId: string,
    proofData?: { txHashOrReferenceNumber: string; receiptScreenshot?: any }
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await PayoutOrder.findById(payoutOrderId).session(session);
      if (!order) throw new Error('أمر الصرف غير موجود في النظام');
      if (order.executionStatus === 'DISBURSED') {
        throw new Error('تم تنفيذ وصرف هذا الأمر مسبقاً');
      }

      const vault = await this.getOrCreateVault();

      // Enforce strict business rule: All payouts are disbursed ONLY via Treasury
      if (vault.treasuryBalance < order.amount) {
        throw new Error(
          `رصيد الصندوق المتاح للصرف (${vault.treasuryBalance.toLocaleString()} USDT) غير كافٍ لتنفيذ هذا الصرف (${order.amount.toLocaleString()} USDT). يجب تغذية الصندوق أولاً بخصم المبلغ من الميزانية العامة للشركة!`
        );
      }

      // Deduct ONLY from Treasury Balance (do not deduct from General Budget, as it was already deducted upon funding)
      vault.treasuryBalance -= order.amount;

      // Project Budget Hard Ceiling Enforcement
      if (order.relatedTaskId) {
        const { Project } = await import('../models/Project.model');
        const project = await Project.findOne({ 'wbsMilestones.assignedTasks': order.relatedTaskId }).session(session);
        if (project && project.allocatedBudget > 0) {
          if (project.spentBudget + order.amount > project.allocatedBudget) {
            throw new Error(
              `المبلغ المطلوب صرفه (${order.amount} USDT) يتجاوز السقف المالي المتبقي لميزانية هذا المشروع (${(project.allocatedBudget - project.spentBudget)} USDT)!`
            );
          }
          project.spentBudget += order.amount;
          await project.save({ session });
        }
      }

      // Deduct from segmented sub-vaults
      if (vault.segmentedVaults) {
        const seg = (order as any).targetVaultSegment;
        if (seg && vault.segmentedVaults[seg as 'salaries' | 'marketing' | 'operationalReserve']) {
          vault.segmentedVaults[seg as 'salaries' | 'marketing' | 'operationalReserve'].totalSpent += order.amount;
          vault.segmentedVaults[seg as 'salaries' | 'marketing' | 'operationalReserve'].balance = Math.max(
            0,
            vault.segmentedVaults[seg as 'salaries' | 'marketing' | 'operationalReserve'].balance - order.amount
          );
        } else if (vault.customSubVaults && vault.customSubVaults.length > 0) {
          const customSub = vault.customSubVaults.find((v: any) => v.code === seg || v.name === seg);
          if (customSub) {
            customSub.totalSpent += order.amount;
            customSub.balance = Math.max(0, customSub.balance - order.amount);
          }
        } else if (order.category === 'SALARY' || order.category === 'BONUS' || order.category === 'ADVANCE') {
          if (vault.segmentedVaults.salaries) {
            vault.segmentedVaults.salaries.totalSpent += order.amount;
            vault.segmentedVaults.salaries.balance = Math.max(0, vault.segmentedVaults.salaries.balance - order.amount);
          }
        } else if (order.category === 'TG_ADS' || order.category === 'TG_CHANNEL_PROMO') {
          if (vault.segmentedVaults.marketing) {
            vault.segmentedVaults.marketing.totalSpent += order.amount;
            vault.segmentedVaults.marketing.balance = Math.max(0, vault.segmentedVaults.marketing.balance - order.amount);
          }
        } else {
          if (vault.segmentedVaults.operationalReserve) {
            vault.segmentedVaults.operationalReserve.totalSpent += order.amount;
            vault.segmentedVaults.operationalReserve.balance = Math.max(0, vault.segmentedVaults.operationalReserve.balance - order.amount);
          }
        }
      }

      // Map category to vault accumulator
      switch (order.category as PayoutCategory) {
        case 'SALARY':
          vault.totalSpentByCategory.salaries += order.amount;
          break;
        case 'BONUS':
          vault.totalSpentByCategory.bonuses += order.amount;
          break;
        case 'ADVANCE':
          vault.totalSpentByCategory.advances += order.amount;
          break;
        case 'TG_ADS':
          vault.totalSpentByCategory.telegramOfficialAds += order.amount;
          break;
        case 'TG_CHANNEL_PROMO':
          vault.totalSpentByCategory.telegramChannelPromos += order.amount;
          break;
        case 'SOFTWARE_SUBSCRIPTION':
          vault.totalSpentByCategory.softwareSubscriptions += order.amount;
          break;
        default:
          vault.totalSpentByCategory.otherExpenses += order.amount;
          break;
      }

      await vault.save({ session });

      // Update Order Status & Proof
      order.executionStatus = 'DISBURSED';
      order.disbursedClickedAt = new Date();
      if (proofData) {
        order.transferProof = {
          txHashOrReferenceNumber: proofData.txHashOrReferenceNumber?.trim() || '',
          receiptScreenshot: proofData.receiptScreenshot,
          executedByTreasuryId: treasuryUserId as any
        };
      }
      await order.save({ session });

      // Record in EmployeeLedger if this belongs to employee salary/bonus/advance
      let ledgerType: LedgerEntryType | null = null;
      if (order.category === 'SALARY') ledgerType = 'BASE_SALARY';
      else if (order.category === 'BONUS') ledgerType = 'BONUS';
      else if (order.category === 'ADVANCE') ledgerType = 'ADVANCE_REQUEST';

      if (ledgerType) {
        await EmployeeLedger.create(
          [
            {
              employeeId: order.beneficiaryId,
              entryType: ledgerType,
              amount: order.amount,
              payoutMethodUsed: order.payoutMethod,
              reason: order.summaryForTreasury,
              relatedPayoutOrderId: order._id,
              recordedBy: treasuryUserId
            }
          ],
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      // Retrieve beneficiary & treasury executor for audit & sockets
      const beneficiary = await User.findById(order.beneficiaryId);
      const treasuryUser = treasuryUserId ? await User.findById(treasuryUserId) : null;

      // Record immutable Audit Trail Entry for Financial Disbursement (يظهر في التدقيق)
      try {
        const segmentNames: Record<string, string> = {
          salaries: 'صندوق الرواتب والأجور',
          marketing: 'صندوق التسويق والإعلانات',
          operationalReserve: 'صندوق الاحتياطي التشغيلي'
        };
        const vaultName = (order as any).targetVaultSegment
          ? segmentNames[(order as any).targetVaultSegment] || (order as any).targetVaultSegment
          : order.category === 'SALARY' || order.category === 'BONUS' || order.category === 'ADVANCE'
          ? 'صندوق الرواتب والأجور'
          : order.category === 'TG_ADS' || order.category === 'TG_CHANNEL_PROMO'
          ? 'صندوق التسويق والإعلانات'
          : 'صندوق الاحتياطي التشغيلي';

        await AuditService.logAction({
          userId: treasuryUserId || 'system',
          userName: treasuryUser?.fullName || 'أمين الصندوق والخزينة',
          userEmail: treasuryUser?.email || 'treasury@thelordofcrypto.com',
          userRole: (treasuryUser?.accessRole as any) || 'TREASURY',
          actionType: 'DISBURSE_PAYOUT',
          targetId: order._id.toString(),
          targetName: beneficiary?.fullName || 'مستفيد مالي',
          targetType: 'PAYOUT',
          severity: 'INFO',
          details: {
            amount: order.amount,
            currency: order.currency,
            payoutMethod: order.payoutMethod,
            category: order.category,
            sourceVault: vaultName,
            txHashOrReferenceNumber: proofData?.txHashOrReferenceNumber || '',
            beneficiaryName: beneficiary?.fullName,
            beneficiaryEmail: beneficiary?.email,
            summary: order.summaryForTreasury
          }
        });
      } catch (auditErr) {
        console.error('[AccountingService] Failed to record payout audit entry:', auditErr);
      }

      // Notify employee & admin via Socket
      const payload = {
        orderId: order._id,
        amount: order.amount,
        currency: order.currency,
        beneficiaryName: beneficiary?.fullName,
        payoutMethod: order.payoutMethod
      };

      SocketService.emitToUser(order.beneficiaryId.toString(), 'payout:disbursed', payload);
      SocketService.emitToAdmins('payout:disbursed', payload);
      SocketService.emitToAdmins('vault:updated', vault);

      // Realtime task update if related to a task
      if (order.relatedTaskId) {
        try {
          const { Task } = await import('../models/Task.model');
          const updatedTask = await Task.findById(order.relatedTaskId)
            .populate('assignedTo', 'fullName email avatarUrl jobTitles')
            .populate('createdBy', 'fullName email avatarUrl')
            .populate('financialRequirement.payoutOrderId');
          if (updatedTask) {
            SocketService.broadcast('task:updated', updatedTask);
          }
        } catch {
          // Ignore silently
        }
      }

      return { vault, order };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Create a dynamic custom sub-vault
   */
  public static async createCustomSubVault(
    name: string,
    code: string,
    parentVault: string,
    monthlyAllocated: number,
    alertThresholdPercent: number,
    _userId: string
  ) {
    const vault = await this.getOrCreateVault();
    if (!vault.customSubVaults) {
      vault.customSubVaults = [] as any;
    }
    const subVaults = vault.customSubVaults || [];
    const cleanCode = code.toUpperCase().replace(/\s+/g, '_');
    const existing = subVaults.find((v: any) => v.code === cleanCode);
    if (existing) {
      throw new Error(`الصندوق الفرعي ذو الرمز (${cleanCode}) موجود بالفعل`);
    }

    subVaults.push({
      name,
      code: cleanCode,
      parentVault: parentVault || 'صندوق الصرف الرئيسي',
      balance: 0,
      monthlyAllocated: monthlyAllocated || 0,
      totalSpent: 0,
      alertThresholdPercent: alertThresholdPercent || 20,
      createdAt: new Date()
    } as any);
    vault.customSubVaults = subVaults;

    await vault.save();
    SocketService.emitToAdmins('vault:updated', vault);
    return vault;
  }

  /**
   * Transfer liquidity from Master Treasury to a Sub-Vault
   */
  public static async transferToSubVault(
    subVaultCode: string,
    amount: number,
    reason: string,
    userId: string
  ) {
    if (amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من الصفر');
    const vault = await this.getOrCreateVault();
    if (vault.treasuryBalance < amount) {
      throw new Error(`رصيد صندوق الصرف المتاح (${vault.treasuryBalance} USDT) لا يكفي لنقل (${amount} USDT)`);
    }

    if (subVaultCode === 'salaries' && vault.segmentedVaults?.salaries) {
      vault.segmentedVaults.salaries.balance += amount;
    } else if (subVaultCode === 'marketing' && vault.segmentedVaults?.marketing) {
      vault.segmentedVaults.marketing.balance += amount;
    } else if (subVaultCode === 'operationalReserve' && vault.segmentedVaults?.operationalReserve) {
      vault.segmentedVaults.operationalReserve.balance += amount;
    } else {
      const customSub = vault.customSubVaults?.find((v: any) => v.code === subVaultCode);
      if (!customSub) {
        throw new Error(`الصندوق الفرعي (${subVaultCode}) غير موجود`);
      }
      customSub.balance += amount;
    }

    vault.manualAdjustmentsLog.push({
      adjustedBy: userId as any,
      targetBalance: 'TRANSFER_BETWEEN_BUDGETS',
      operation: 'SET',
      amount,
      reason: reason || `تخصيص سيولة إلى الصندوق الفرعي: ${subVaultCode}`,
      createdAt: new Date()
    });

    await vault.save();
    SocketService.emitToAdmins('vault:updated', vault);
    return vault;
  }

  /**
   * Request modification or cancellation of a transaction (treasury -> admin)
   */
  public static async requestOrderModification(
    orderId: string,
    requestedAction: 'CANCEL' | 'EDIT_DETAILS',
    reason: string,
    proposedNote: string,
    userId: string
  ) {
    const order = await PayoutOrder.findById(orderId);
    if (!order) throw new Error('أمر الصرف غير موجود');

    order.modificationRequest = {
      status: 'PENDING',
      requestedAction,
      requestedBy: userId as any,
      reason,
      proposedNote: proposedNote || '',
      decidedAt: undefined
    };

    await order.save();

    SocketService.emitToAdmins('payout:modification_requested', {
      orderId: order._id,
      requestedAction,
      reason,
      amount: order.amount
    });

    return order;
  }

  /**
   * Decide modification request (admin approves or rejects)
   */
  public static async decideOrderModification(
    orderId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminDecisionNote: string,
    _adminId: string
  ) {
    const order = await PayoutOrder.findById(orderId);
    if (!order) throw new Error('أمر الصرف غير موجود');
    if (!order.modificationRequest || order.modificationRequest.status !== 'PENDING') {
      throw new Error('لا يوجد طلب تعديل معلق لهذا الأمر');
    }

    order.modificationRequest.status = decision;
    order.modificationRequest.adminDecisionNote = adminDecisionNote;
    order.modificationRequest.decidedAt = new Date();

    if (decision === 'APPROVED') {
      if (order.modificationRequest.requestedAction === 'CANCEL') {
        if (order.executionStatus === 'WAITING_TREASURY' || order.executionStatus === 'IN_PROGRESS') {
          await PayoutOrder.findByIdAndDelete(orderId);
          return { message: 'تم إلغاء وحذف العملية بنجاح بعد موافقة المسؤول' };
        } else if (order.executionStatus === 'DISBURSED') {
          const vault = await this.getOrCreateVault();
          vault.treasuryBalance += order.amount;
          await vault.save();
          await PayoutOrder.findByIdAndDelete(orderId);
          return { message: 'تم إلغاء العملية واسترداد المبلغ لخزينة الصندوق بنجاح' };
        }
      }
    }

    await order.save();
    return order;
  }

  /**
   * Update Employee Base Salary & Compensation (Treasury / Admin)
   */
  public static async updateEmployeeCompensation(
    employeeId: string,
    baseSalary: number,
    salaryCurrency: 'USDT' | 'USD' | 'SAR' | 'YER',
    payoutDayOfMonth: number,
    _updaterId: string
  ) {
    const user = await User.findById(employeeId);
    if (!user) throw new Error('الموظف غير موجود');

    if (!user.compensation) {
      user.compensation = {
        baseSalary: 0,
        salaryCurrency: 'USDT',
        payoutDayOfMonth: 1,
        activeBonuses: 0,
        activeDeductions: 0,
        activeAdvances: 0,
        warningsCount: 0
      };
    }

    user.compensation.baseSalary = baseSalary;
    user.compensation.salaryCurrency = salaryCurrency || 'USDT';
    user.compensation.payoutDayOfMonth = payoutDayOfMonth || 1;

    await user.save();
    SocketService.broadcast('employee:salary_updated', {
      employeeId: user._id,
      baseSalary,
      currency: salaryCurrency
    });

    return user;
  }

  /**
   * Recurring Expenses Management
   */
  public static async getRecurringExpenses() {
    return RecurringExpense.find().sort({ dueDayOfMonth: 1 });
  }

  public static async createRecurringExpense(data: any, _userId: string) {
    const expense = await RecurringExpense.create(data);
    return expense;
  }

  public static async deleteRecurringExpense(id: string) {
    return RecurringExpense.findByIdAndDelete(id);
  }

  public static async executeRecurringExpense(id: string, treasuryUserId: string) {
    const expense = await RecurringExpense.findById(id);
    if (!expense) throw new Error('المصروف الدوري غير موجود');

    const vault = await this.getOrCreateVault();
    if (vault.treasuryBalance < expense.amount) {
      throw new Error(`رصيد الصندوق (${vault.treasuryBalance} USDT) لا يكفي لصرف المصروف (${expense.amount} USDT)`);
    }

    vault.treasuryBalance -= expense.amount;
    vault.totalSpentByCategory.otherExpenses += expense.amount;
    await vault.save();

    expense.lastDisbursedAt = new Date();
    await expense.save();

    try {
      const treasuryUser = await User.findById(treasuryUserId);
      await AuditService.logAction({
        userId: treasuryUserId,
        userName: treasuryUser?.fullName || 'أمين الصندوق',
        userEmail: treasuryUser?.email || 'treasury@thelordofcrypto.com',
        userRole: 'TREASURY',
        actionType: 'SYSTEM_SECURITY_CONFIG',
        targetName: `صرف دوري: ${expense.title}`,
        targetType: 'SYSTEM',
        severity: 'INFO',
        details: {
          expenseId: expense._id,
          amount: expense.amount,
          category: expense.category,
          beneficiary: expense.beneficiaryName
        }
      });
    } catch {}

    SocketService.emitToAdmins('vault:updated', vault);
    return { expense, vault };
  }

  /**
   * Reports by Category & Vault
   */
  public static async getAccountingReports() {
    const vault = await this.getOrCreateVault();
    const orders = await PayoutOrder.find({ executionStatus: 'DISBURSED' });
    const employees = await User.find({ accessRole: 'EMPLOYEE' }).select('fullName email compensation');

    const totalSalaries = orders.filter(o => o.category === 'SALARY').reduce((sum, o) => sum + o.amount, 0);
    const totalBonuses = orders.filter(o => o.category === 'BONUS').reduce((sum, o) => sum + o.amount, 0);
    const totalAdvances = orders.filter(o => o.category === 'ADVANCE').reduce((sum, o) => sum + o.amount, 0);
    const totalAds = orders.filter(o => o.category === 'TG_ADS' || o.category === 'TG_CHANNEL_PROMO').reduce((sum, o) => sum + o.amount, 0);
    const totalSoftware = orders.filter(o => o.category === 'SOFTWARE_SUBSCRIPTION').reduce((sum, o) => sum + o.amount, 0);
    const totalOther = orders.filter(o => (o.category as string) === 'GENERAL' || (o.category as string) === 'ALLOWANCE').reduce((sum, o) => sum + o.amount, 0);

    const monthlyCommittedPayroll = employees.reduce((sum, e) => sum + (e.compensation?.baseSalary || 0), 0);

    return {
      vaultOverview: {
        generalBudget: vault.generalBudget,
        treasuryBalance: vault.treasuryBalance,
        totalDisbursedAllTime: orders.reduce((sum, o) => sum + o.amount, 0),
        monthlyCommittedPayroll
      },
      categoryBreakdown: {
        salaries: totalSalaries,
        bonuses: totalBonuses,
        advances: totalAdvances,
        ads: totalAds,
        software: totalSoftware,
        other: totalOther
      },
      segmentedVaults: vault.segmentedVaults,
      customSubVaults: vault.customSubVaults || []
    };
  }
}

