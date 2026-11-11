import mongoose from 'mongoose';
import { CompanyVault } from '../models/CompanyVault.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { EmployeeLedger } from '../models/EmployeeLedger.model';
import { User } from '../models/User.model';
import { RecurringExpense } from '../models/RecurringExpense.model';
import { SocketService } from './socket.service';
import { AuditService } from './audit.service';
import { FinancialMath } from '../utils/financialMath';
import { PayoutCategory, LedgerEntryType } from '@lord/shared-types';
import { AccountingCoreService } from './accounting/accountingCore.service';
import { AccountingLedgerService } from './accounting/accountingLedger.service';

export class AccountingService {
  /**
   * Safe financial precision rounding (delegates to BigInt micro-unit FinancialMath)
   */
  public static roundCurrency(value: number): number {
    return AccountingCoreService.roundCurrency(value);
  }

  /**
   * Executes multi-document financial mutations inside an atomic MongoDB transaction session.
   */
  private static async withFinancialTransaction<T>(
    work: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    return AccountingCoreService.withFinancialTransaction(work);
  }

  /**
   * Initializes CompanyVault if not created yet
   */
  public static async getOrCreateVault(session?: mongoose.ClientSession) {
    return AccountingCoreService.getOrCreateVault(session);
  }

  /**
   * Deposit new capital or profit into the General Budget
   */
  public static async depositToGeneralBudget(amount: number, reason: string, adminId: string) {
    if (amount <= 0) {
      throw new Error('المبلغ المودع يجب أن يكون أكبر من الصفر');
    }

    const vault = await this.withFinancialTransaction(async (session) => {
      const activeVault = await this.getOrCreateVault(session);
      activeVault.generalBudget = FinancialMath.add(activeVault.generalBudget, amount, 2);

      activeVault.manualAdjustmentsLog.push({
        adjustedBy: adminId as any,
        targetBalance: 'GENERAL_BUDGET',
        operation: 'DEPOSIT',
        amount,
        reason: reason || 'إيداع رأس مال / أرباح في الميزانية العامة للشركة',
        createdAt: new Date()
      });

      await activeVault.save({ session });
      return activeVault;
    });

    SocketService.emitToAdmins('vault:updated', vault);

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
          action: 'إيداع سيولة في الميزانية العامة للشركة',
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

    const vault = await this.withFinancialTransaction(async (session) => {
      const activeVault = await this.getOrCreateVault(session);

      if (activeVault.generalBudget < amount) {
        throw new Error(
          `رصيد الميزانية العامة للشركة (${activeVault.generalBudget.toLocaleString()} USDT) غير كافٍ لتغذية الصندوق بمبلغ (${amount.toLocaleString()} USDT). يرجى إيداع رصيد أولاً في الميزانية العامة.`
        );
      }

      activeVault.generalBudget = FinancialMath.subtract(activeVault.generalBudget, amount, 2);
      activeVault.treasuryBalance = FinancialMath.add(activeVault.treasuryBalance, amount, 2);

      if (targetSegment && activeVault.segmentedVaults && activeVault.segmentedVaults[targetSegment]) {
        activeVault.segmentedVaults[targetSegment].balance = FinancialMath.add(
          activeVault.segmentedVaults[targetSegment].balance,
          amount,
          2
        );
        if (
          activeVault.segmentedVaults[targetSegment].balance >
          activeVault.segmentedVaults[targetSegment].monthlyAllocated
        ) {
          activeVault.segmentedVaults[targetSegment].monthlyAllocated =
            activeVault.segmentedVaults[targetSegment].balance;
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

      activeVault.manualAdjustmentsLog.push({
        adjustedBy: adminId as any,
        targetBalance: 'TRANSFER_BETWEEN_BUDGETS',
        operation: 'FUND_TREASURY',
        amount,
        reason: (reason || 'تغذية رصيد الصندوق المتاح للصرف بالخصم من الميزانية العامة') + segmentLabel,
        createdAt: new Date()
      });

      await activeVault.save({ session });
      return activeVault;
    });

    SocketService.emitToAdmins('vault:updated', vault);

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
          action: 'تغذية صندوق الصرف من الميزانية العامة',
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

    const vault = await this.withFinancialTransaction(async (session) => {
      const activeVault = await this.getOrCreateVault(session);

      if (activeVault.treasuryBalance < amount) {
        throw new Error(
          `رصيد الصندوق المتاح للصرف (${activeVault.treasuryBalance.toLocaleString()} USDT) أقل من المبلغ المطلوب استرجاعه (${amount.toLocaleString()} USDT).`
        );
      }

      activeVault.treasuryBalance = FinancialMath.subtract(activeVault.treasuryBalance, amount, 2);
      activeVault.generalBudget = FinancialMath.add(activeVault.generalBudget, amount, 2);

      activeVault.manualAdjustmentsLog.push({
        adjustedBy: adminId as any,
        targetBalance: 'TRANSFER_BETWEEN_BUDGETS',
        operation: 'RETURN_TO_BUDGET',
        amount,
        reason: reason || 'استرجاع فائض سيولة من الصندوق إلى الميزانية العامة',
        createdAt: new Date()
      });

      await activeVault.save({ session });
      return activeVault;
    });

    SocketService.emitToAdmins('vault:updated', vault);

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
    proofData?: { txHashOrReferenceNumber: string; receiptScreenshot?: any },
    idempotencyKey?: string
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Idempotency Key Concurrency Protection
      if (idempotencyKey) {
        const existingWithKey = await PayoutOrder.findOne({ idempotencyKey }).session(session);
        if (existingWithKey && String(existingWithKey._id) !== String(payoutOrderId)) {
          throw new Error('مفتاح عدم التكرار (Idempotency Key) مستخدم في عملية صرف أخرى مسبقاً');
        }
      }

      // 2. Atomic State Transition with Concurrency Lock
      const validStatuses = ['WAITING_TREASURY', 'IN_PROGRESS', 'AWAITING_VERIFICATION'];
      const order = await PayoutOrder.findOneAndUpdate(
        {
          _id: payoutOrderId,
          executionStatus: { $in: validStatuses }
        },
        {
          $set: {
            executionStatus: 'DISBURSED',
            disbursedClickedAt: new Date(),
            idempotencyKey: idempotencyKey || undefined,
            ...(proofData ? {
              transferProof: {
                txHashOrReferenceNumber: proofData.txHashOrReferenceNumber?.trim() || '',
                receiptScreenshot: proofData.receiptScreenshot,
                executedByTreasuryId: treasuryUserId as any
              }
            } : {})
          }
        },
        { session, new: false }
      );

      if (!order) {
        throw new Error('أمر الصرف غير متاح للتنفيذ (إما تم صرفه بالفعل من قبل محاسب آخر أو تم إلغاؤه أو غير موجود)');
      }

      // 3. Bind CompanyVault to transaction session
      const vault = await this.getOrCreateVault(session);

      // Enforce strict business rule: All payouts are disbursed ONLY via Treasury
      if (vault.treasuryBalance < order.amount) {
        throw new Error(
          `رصيد الصندوق المتاح للصرف (${vault.treasuryBalance.toLocaleString()} USDT) غير كافٍ لتنفيذ هذا الصرف (${order.amount.toLocaleString()} USDT). يجب تغذية الصندوق أولاً بخصم المبلغ من الميزانية العامة للشركة!`
        );
      }

      // Deduct ONLY from Treasury Balance (do not deduct from General Budget, as it was already deducted upon funding)
      vault.treasuryBalance -= order.amount;

      // Project Budget Hard Ceiling Enforcement (via milestone link or direct task.projectId)
      if (order.relatedTaskId) {
        const { ProjectSyncService } = await import('./projectSync.service');
        const project = await ProjectSyncService.findProjectForTask(order.relatedTaskId, session);
        if (project && project.allocatedBudget > 0) {
          const projectedSpend = FinancialMath.add(project.spentBudget, order.amount, 2);
          if (projectedSpend > project.allocatedBudget) {
            const remainingBudget = Math.max(0, FinancialMath.subtract(project.allocatedBudget, project.spentBudget, 2));
            throw new Error(
              `المبلغ المطلوب صرفه (${order.amount} USDT) يتجاوز السقف المالي المتبقي لميزانية هذا المشروع (${remainingBudget} USDT)!`
            );
          }
          project.spentBudget = projectedSpend;
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

      if (order.relatedTaskId) {
        try {
          const { ProjectSyncService } = await import('./projectSync.service');
          const updatedProj = await ProjectSyncService.findProjectForTask(order.relatedTaskId);
          if (updatedProj) {
            const populatedProj = await ProjectSyncService.getPopulatedProjectById(updatedProj._id);
            if (populatedProj) {
              SocketService.broadcast('project:updated', populatedProj);
            }
          }
        } catch {}
      }

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

    const vault = await this.withFinancialTransaction(async (session) => {
      const activeVault = await this.getOrCreateVault(session);
      if (activeVault.treasuryBalance < amount) {
        throw new Error(`رصيد صندوق الصرف المتاح (${activeVault.treasuryBalance} USDT) لا يكفي لنقل (${amount} USDT)`);
      }

      if (subVaultCode === 'salaries' && activeVault.segmentedVaults?.salaries) {
        activeVault.segmentedVaults.salaries.balance = FinancialMath.add(
          activeVault.segmentedVaults.salaries.balance,
          amount,
          2
        );
      } else if (subVaultCode === 'marketing' && activeVault.segmentedVaults?.marketing) {
        activeVault.segmentedVaults.marketing.balance = FinancialMath.add(
          activeVault.segmentedVaults.marketing.balance,
          amount,
          2
        );
      } else if (subVaultCode === 'operationalReserve' && activeVault.segmentedVaults?.operationalReserve) {
        activeVault.segmentedVaults.operationalReserve.balance = FinancialMath.add(
          activeVault.segmentedVaults.operationalReserve.balance,
          amount,
          2
        );
      } else {
        const customSub = activeVault.customSubVaults?.find((v: any) => v.code === subVaultCode);
        if (!customSub) {
          throw new Error(`الصندوق الفرعي (${subVaultCode}) غير موجود`);
        }
        customSub.balance = FinancialMath.add(customSub.balance, amount, 2);
      }

      activeVault.manualAdjustmentsLog.push({
        adjustedBy: userId as any,
        targetBalance: 'TRANSFER_BETWEEN_BUDGETS',
        operation: 'SET',
        amount,
        reason: reason || `تخصيص سيولة إلى الصندوق الفرعي: ${subVaultCode}`,
        createdAt: new Date()
      });

      await activeVault.save({ session });
      return activeVault;
    });

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
   * Uses immutable cancellation and reversal ledger entries instead of hard deletion.
   */
  public static async decideOrderModification(
    orderId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminDecisionNote: string,
    adminId: string
  ) {
    const order = await PayoutOrder.findById(orderId);
    if (!order) throw new Error('أمر الصرف غير موجود');
    if (!order.modificationRequest || order.modificationRequest.status !== 'PENDING') {
      throw new Error('لا يوجد طلب تعديل معلق لهذا الأمر');
    }

    order.modificationRequest.status = decision;
    order.modificationRequest.adminDecisionNote = adminDecisionNote;
    order.modificationRequest.decidedAt = new Date();
    await order.save();

    if (decision === 'APPROVED' && order.modificationRequest.requestedAction === 'CANCEL') {
      if (
        order.executionStatus === 'WAITING_TREASURY' ||
        order.executionStatus === 'IN_PROGRESS' ||
        order.executionStatus === 'DISBURSED'
      ) {
        return await this.adminDeleteTransaction(
          orderId,
          'PAYOUT',
          adminId,
          adminDecisionNote || 'إلغاء وعكس أمر الصرف بناءً على طلب تعديل معتمد'
        );
      }
    }

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
    const { expense, vault } = await this.withFinancialTransaction(async (session) => {
      const activeExpense = await RecurringExpense.findById(id).session(session);
      if (!activeExpense) throw new Error('المصروف الدوري غير موجود');

      const activeVault = await this.getOrCreateVault(session);
      if (activeVault.treasuryBalance < activeExpense.amount) {
        throw new Error(
          `رصيد الصندوق (${activeVault.treasuryBalance} USDT) لا يكفي لصرف المصروف (${activeExpense.amount} USDT)`
        );
      }

      activeVault.treasuryBalance = FinancialMath.subtract(
        activeVault.treasuryBalance,
        activeExpense.amount,
        2
      );
      activeVault.totalSpentByCategory.otherExpenses = FinancialMath.add(
        activeVault.totalSpentByCategory.otherExpenses,
        activeExpense.amount,
        2
      );
      await activeVault.save({ session });

      activeExpense.lastDisbursedAt = new Date();
      await activeExpense.save({ session });
      return { expense: activeExpense, vault: activeVault };
    });

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
    return AccountingLedgerService.getAccountingReports();
  }

  /**
   * Recalculates all vault metrics dynamically from real operations (no mock or static numbers)
   */
  public static async recalculateVaultFromRealOperations() {
    return AccountingLedgerService.recalculateVaultFromRealOperations();
  }

  /**
   * Unified Transactions Ledger with Search & Filtering
   */
  public static async getAllTransactions(filters?: {
    type?: string;
    category?: string;
    search?: string;
  }) {
    return AccountingLedgerService.getAllTransactions(filters);
  }

  /**
   * Cascading Admin Delete Transaction
   */
  public static async adminDeleteTransaction(
    id: string,
    type: string,
    adminId: string,
    reason?: string
  ) {
    return AccountingLedgerService.adminDeleteTransaction(id, type, adminId, reason);
  }

  /**
   * Cascading Admin Update Transaction
   */
  public static async adminUpdateTransaction(
    id: string,
    type: string,
    data: {
      amount?: number;
      category?: string;
      summary?: string;
      targetVault?: string;
      reason?: string;
    },
    adminId: string
  ) {
    return AccountingLedgerService.adminUpdateTransaction(id, type, data, adminId);
  }
}


