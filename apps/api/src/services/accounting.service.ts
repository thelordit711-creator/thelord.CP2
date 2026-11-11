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

export class AccountingService {
  /**
   * Safe financial precision rounding (delegates to BigInt micro-unit FinancialMath)
   */
  public static roundCurrency(value: number): number {
    return FinancialMath.roundCurrency(value, 2);
  }

  /**
   * Executes multi-document financial mutations inside an atomic MongoDB transaction session.
   */
  private static async withFinancialTransaction<T>(
    work: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await work(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {}
      session.endSession();
      throw error;
    }
  }

  /**
   * Initializes CompanyVault if not created yet
   */
  public static async getOrCreateVault(session?: mongoose.ClientSession) {
    let vault = session
      ? await CompanyVault.findOne().session(session)
      : await CompanyVault.findOne();

    if (!vault) {
      const defaultData = {
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
      };

      if (session) {
        const created = await CompanyVault.create([defaultData], { session });
        vault = created[0];
      } else {
        vault = await CompanyVault.create(defaultData);
      }
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

  /**
   * Recalculates all vault metrics dynamically from real operations (no mock or static numbers)
   */
  public static async recalculateVaultFromRealOperations() {
    const vault = await this.getOrCreateVault();
    const disbursedOrders = await PayoutOrder.find({ executionStatus: 'DISBURSED' });
    const employees = await User.find({ accessRole: 'EMPLOYEE' }).select('compensation');

    const catSpent = {
      salaries: 0,
      bonuses: 0,
      advances: 0,
      telegramOfficialAds: 0,
      telegramChannelPromos: 0,
      softwareSubscriptions: 0,
      otherExpenses: 0
    };

    const subVaultSpent: Record<string, number> = {
      salaries: 0,
      marketing: 0,
      operationalReserve: 0
    };

    for (const order of disbursedOrders) {
      switch (order.category) {
        case 'SALARY':
          catSpent.salaries += order.amount;
          break;
        case 'BONUS':
          catSpent.bonuses += order.amount;
          break;
        case 'ADVANCE':
          catSpent.advances += order.amount;
          break;
        case 'TG_ADS':
          catSpent.telegramOfficialAds += order.amount;
          break;
        case 'TG_CHANNEL_PROMO':
          catSpent.telegramChannelPromos += order.amount;
          break;
        case 'SOFTWARE_SUBSCRIPTION':
          catSpent.softwareSubscriptions += order.amount;
          break;
        default:
          catSpent.otherExpenses += order.amount;
          break;
      }

      const seg = (order as any).targetVaultSegment;
      if (seg && subVaultSpent[seg] !== undefined) {
        subVaultSpent[seg] += order.amount;
      } else if (order.category === 'SALARY' || order.category === 'BONUS' || order.category === 'ADVANCE') {
        subVaultSpent.salaries += order.amount;
      } else if (order.category === 'TG_ADS' || order.category === 'TG_CHANNEL_PROMO') {
        subVaultSpent.marketing += order.amount;
      } else {
        subVaultSpent.operationalReserve += order.amount;
      }
    }

    vault.totalSpentByCategory = catSpent;

    const realCommittedPayroll = employees.reduce((sum, e) => sum + (e.compensation?.baseSalary || 0), 0);

    if (vault.segmentedVaults) {
      if (vault.segmentedVaults.salaries) {
        vault.segmentedVaults.salaries.monthlyAllocated = realCommittedPayroll;
        vault.segmentedVaults.salaries.totalSpent = subVaultSpent.salaries;
      }
      if (vault.segmentedVaults.marketing) {
        vault.segmentedVaults.marketing.totalSpent = subVaultSpent.marketing;
      }
      if (vault.segmentedVaults.operationalReserve) {
        vault.segmentedVaults.operationalReserve.totalSpent = subVaultSpent.operationalReserve;
      }
    }

    if (vault.customSubVaults && vault.customSubVaults.length > 0) {
      for (const custom of vault.customSubVaults) {
        const spent = disbursedOrders
          .filter((o: any) => o.targetVaultSegment === custom.code || o.targetVaultSegment === custom.name)
          .reduce((sum, o) => sum + o.amount, 0);
        custom.totalSpent = spent;
      }
    }

    await vault.save();
    SocketService.emitToAdmins('vault:updated', vault);
    return vault;
  }

  /**
   * Unified Transactions Ledger with Search & Filtering
   */
  public static async getAllTransactions(filters?: {
    type?: string;
    category?: string;
    search?: string;
  }) {
    const vault = await this.getOrCreateVault();
    const orders = await PayoutOrder.find()
      .populate('beneficiaryId', 'fullName email phoneNumber avatarUrl')
      .populate('transferProof.executedByTreasuryId', 'fullName email')
      .sort({ createdAt: -1 });

    const transactions: any[] = [];

    for (const order of orders) {
      const beneficiary = order.beneficiaryId as any;
      transactions.push({
        _id: order._id.toString(),
        type: 'PAYOUT',
        amount: order.amount,
        currency: order.currency,
        category: order.category,
        targetVault: order.targetVaultSegment || 'صندوق الصرف الرئيسي',
        beneficiaryName: beneficiary?.fullName || 'عضو الفريق',
        beneficiaryEmail: beneficiary?.email,
        description: order.summaryForTreasury,
        status: order.executionStatus,
        payoutMethod: order.payoutMethod,
        referenceNumber: order.transferProof?.txHashOrReferenceNumber,
        executedBy: (order.transferProof?.executedByTreasuryId as any)?.fullName || 'أمين الصندوق',
        relatedTaskId: order.relatedTaskId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        modificationRequest: order.modificationRequest
      });
    }

    for (const adj of vault.manualAdjustmentsLog || []) {
      const adjObj = adj as any;
      const isDeposit = adjObj.operation === 'DEPOSIT';
      const isFund = adjObj.operation === 'FUND_TREASURY';
      const isReturn = adjObj.operation === 'RETURN_TO_BUDGET';

      transactions.push({
        _id: adjObj._id ? adjObj._id.toString() : new mongoose.Types.ObjectId().toString(),
        type: isDeposit ? 'DEPOSIT' : isFund ? 'TRANSFER' : isReturn ? 'RETURN' : 'ADJUSTMENT',
        amount: adjObj.amount,
        currency: 'USDT',
        category: isDeposit ? 'CAPITAL_DEPOSIT' : 'INTERNAL_TRANSFER',
        targetVault: isDeposit
          ? 'الميزانية العامة للشركة'
          : isFund
          ? 'صندوق الصرف المركزي'
          : 'الميزانية العامة',
        beneficiaryName: 'خزينة المنظومة المركزية',
        beneficiaryEmail: 'admin@thelordofcrypto.com',
        description: adjObj.reason || (isDeposit ? 'إيداع رأس مال / أرباح' : 'تغذية صندوق الصرف'),
        status: 'COMPLETED',
        payoutMethod: 'SYSTEM_INTERNAL',
        referenceNumber: `ADJ-${adjObj.amount}`,
        executedBy: 'القائد الأعلى (المدير العام)',
        createdAt: adjObj.createdAt,
        updatedAt: adjObj.createdAt
      });
    }

    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let filtered = transactions;
    if (filters?.type && filters.type !== 'ALL') {
      filtered = filtered.filter((t) => t.type === filters.type);
    }
    if (filters?.category && filters.category !== 'ALL') {
      filtered = filtered.filter((t) => t.category === filters.category);
    }
    if (filters?.search && filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.beneficiaryName?.toLowerCase().includes(query) ||
          t.targetVault?.toLowerCase().includes(query) ||
          t.referenceNumber?.toLowerCase().includes(query)
      );
    }

    return filtered;
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
    const adminUser = await User.findById(adminId);

    if (type === 'PAYOUT') {
      const txResult = await this.withFinancialTransaction(async (session) => {
        const vault = await this.getOrCreateVault(session);
        const order = await PayoutOrder.findById(id).session(session);
        if (!order) throw new Error('أمر الصرف غير موجود');
        if (order.executionStatus === 'CANCELLED') {
          throw new Error('أمر الصرف ملغي ومعكوس مسبقاً ولا يمكن عكس رصيده مرتين');
        }

        const wasDisbursed = order.executionStatus === 'DISBURSED';

        if (wasDisbursed) {
          vault.treasuryBalance = FinancialMath.add(vault.treasuryBalance, order.amount, 2);

          const seg = (order as any).targetVaultSegment;
          if (seg && vault.segmentedVaults && vault.segmentedVaults[seg as 'salaries' | 'marketing' | 'operationalReserve']) {
            const segment = vault.segmentedVaults[seg as 'salaries' | 'marketing' | 'operationalReserve'];
            segment.balance = FinancialMath.add(segment.balance, order.amount, 2);
            segment.totalSpent = Math.max(0, FinancialMath.subtract(segment.totalSpent, order.amount, 2));
          } else if (vault.segmentedVaults?.salaries && (order.category === 'SALARY' || order.category === 'BONUS' || order.category === 'ADVANCE')) {
            vault.segmentedVaults.salaries.balance = FinancialMath.add(vault.segmentedVaults.salaries.balance, order.amount, 2);
            vault.segmentedVaults.salaries.totalSpent = Math.max(0, FinancialMath.subtract(vault.segmentedVaults.salaries.totalSpent, order.amount, 2));
          }

          if (vault.totalSpentByCategory && (vault.totalSpentByCategory as any)[order.category.toLowerCase()]) {
            (vault.totalSpentByCategory as any)[order.category.toLowerCase()] = Math.max(
              0,
              FinancialMath.subtract((vault.totalSpentByCategory as any)[order.category.toLowerCase()], order.amount, 2)
            );
          }
        }

        const existingEntries = await EmployeeLedger.find({ relatedPayoutOrderId: order._id }).session(session);
        for (const entry of existingEntries) {
          entry.isReversed = true;
          entry.reversalReason = reason || 'إلغاء وعكس العملية بقرار إداري من المدير العام';
          await entry.save({ session });

          await EmployeeLedger.create(
            [
              {
                employeeId: entry.employeeId,
                entryType: 'ADJUSTMENT_REVERSAL',
                amount: -Math.abs(entry.amount),
                payoutMethodUsed: entry.payoutMethodUsed,
                reason: `[قيد تسوية عكسي] إلغاء واسترجاع القيد #${entry._id}: ${entry.reason}`,
                warningLevel: 'NONE',
                relatedPayoutOrderId: order._id,
                recordedBy: adminId,
                reversalEntryId: entry._id
              }
            ],
            { session }
          );
        }

        let updatedProjectId: any = null;
        if (order.relatedTaskId) {
          const { Task } = await import('../models/Task.model');
          const task = await Task.findById(order.relatedTaskId).session(session);
          if (task && task.financialRequirement) {
            task.financialRequirement.payoutOrderId = undefined as any;
            task.financialRequirement.adminApprovalStatus = 'PENDING_ADMIN';
            await task.save({ session });
          }
          if (wasDisbursed) {
            const { ProjectSyncService } = await import('./projectSync.service');
            const project = await ProjectSyncService.findProjectForTask(order.relatedTaskId, session);
            if (project) {
              project.spentBudget = Math.max(0, FinancialMath.subtract(project.spentBudget, order.amount, 2));
              await project.save({ session });
              updatedProjectId = project._id;
            }
          }
        }

        order.executionStatus = 'CANCELLED';
        order.summaryForTreasury = `[ملغي بقيد عكسي] ${order.summaryForTreasury} (${reason || 'إلغاء إداري'})`;
        await order.save({ session });
        await vault.save({ session });

        return { vault, order, wasDisbursed, updatedProjectId };
      });

      if (txResult.updatedProjectId) {
        try {
          const { ProjectSyncService } = await import('./projectSync.service');
          const populatedProj = await ProjectSyncService.getPopulatedProjectById(txResult.updatedProjectId);
          if (populatedProj) {
            SocketService.broadcast('project:updated', populatedProj);
          }
        } catch {}
      }

      await AuditService.logAction({
        userId: adminId,
        userName: adminUser?.fullName || 'القائد الأعلى',
        userEmail: adminUser?.email || 'admin@thelordofcrypto.com',
        userRole: 'SUPER_ADMIN',
        actionType: 'TRANSACTION_DELETED',
        targetName: `عكس وإلغاء أمر الصرف #${txResult.order._id}`,
        targetType: 'PAYOUT',
        severity: 'CRITICAL',
        details: {
          action: 'إلغاء أمر صرف وإنشاء قيد تسوية عكسي دون حذف السجل التاريخي',
          orderAmount: txResult.order.amount,
          refundedToTreasury: txResult.wasDisbursed,
          reason: reason || 'إلغاء بقرار إداري من المدير العام'
        }
      });

      SocketService.emitToAdmins('vault:updated', txResult.vault);
      SocketService.broadcast('payout:cancelled', { orderId: id });

      return {
        success: true,
        message: 'تم حذف أمر الصرف واسترجاع المبالغ للخزينة وتعديل المعاملات المرتبطة بنجاح'
      };
    } else {
      const { vault, adj } = await this.withFinancialTransaction(async (session) => {
        const activeVault = await this.getOrCreateVault(session);
        const idx = activeVault.manualAdjustmentsLog.findIndex((a: any) => a._id?.toString() === id);
        if (idx === -1) throw new Error('عملية التعديل غير موجودة');

        const activeAdj = activeVault.manualAdjustmentsLog[idx] as any;

        if (activeAdj.operation === 'DEPOSIT') {
          activeVault.generalBudget = Math.max(0, FinancialMath.subtract(activeVault.generalBudget, activeAdj.amount, 2));
        } else if (activeAdj.operation === 'FUND_TREASURY') {
          activeVault.treasuryBalance = Math.max(0, FinancialMath.subtract(activeVault.treasuryBalance, activeAdj.amount, 2));
          activeVault.generalBudget = FinancialMath.add(activeVault.generalBudget, activeAdj.amount, 2);
        } else if (activeAdj.operation === 'RETURN_TO_BUDGET') {
          activeVault.generalBudget = Math.max(0, FinancialMath.subtract(activeVault.generalBudget, activeAdj.amount, 2));
          activeVault.treasuryBalance = FinancialMath.add(activeVault.treasuryBalance, activeAdj.amount, 2);
        }

        const snapshot = { amount: activeAdj.amount, operation: activeAdj.operation };
        activeVault.manualAdjustmentsLog.splice(idx, 1);
        await activeVault.save({ session });
        return { vault: activeVault, adj: snapshot };
      });

      await AuditService.logAction({
        userId: adminId,
        userName: adminUser?.fullName || 'القائد الأعلى',
        userEmail: adminUser?.email || 'admin@thelordofcrypto.com',
        userRole: 'SUPER_ADMIN',
        actionType: 'SYSTEM_SECURITY_CONFIG',
        targetName: `حذف قيد تسوية #${id}`,
        targetType: 'SYSTEM',
        severity: 'CRITICAL',
        details: {
          action: 'حذف عملية إيداع/تحويل مع عكس الأثر المالي',
          amount: adj.amount,
          operation: adj.operation,
          reason: reason || 'حذف بقرار إداري'
        }
      });

      SocketService.emitToAdmins('vault:updated', vault);

      return {
        success: true,
        message: 'تم حذف العملية وعكس أثرها المالي على الأرصدة بنجاح'
      };
    }
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
    const adminUser = await User.findById(adminId);

    if (type === 'PAYOUT') {
      const { vault, order, oldAmount, newAmount } = await this.withFinancialTransaction(
        async (session) => {
          const activeVault = await this.getOrCreateVault(session);
          const activeOrder = await PayoutOrder.findById(id).session(session);
          if (!activeOrder) throw new Error('أمر الصرف غير موجود');

          const prevAmount = activeOrder.amount;
          const nextAmount = data.amount !== undefined ? Number(data.amount) : prevAmount;

          if (activeOrder.executionStatus === 'DISBURSED' && nextAmount !== prevAmount) {
            const delta = FinancialMath.subtract(nextAmount, prevAmount, 2);
            if (delta > 0 && activeVault.treasuryBalance < delta) {
              throw new Error(
                `رصيد الصندوق (${activeVault.treasuryBalance} USDT) لا يكفي لزيادة مبلغ الصرف بمقدار (${delta} USDT)`
              );
            }

            activeVault.treasuryBalance = FinancialMath.subtract(activeVault.treasuryBalance, delta, 2);

            const seg = (activeOrder as any).targetVaultSegment;
            if (
              seg &&
              activeVault.segmentedVaults &&
              activeVault.segmentedVaults[seg as 'salaries' | 'marketing' | 'operationalReserve']
            ) {
              const targetSegment =
                activeVault.segmentedVaults[seg as 'salaries' | 'marketing' | 'operationalReserve'];
              targetSegment.balance = FinancialMath.subtract(targetSegment.balance, delta, 2);
              targetSegment.totalSpent = Math.max(
                0,
                FinancialMath.add(targetSegment.totalSpent, delta, 2)
              );
            }

            await EmployeeLedger.create(
              [
                {
                  employeeId: activeOrder.beneficiaryId,
                  entryType: delta > 0 ? 'ADJUSTMENT_CREDIT' : 'ADJUSTMENT_REVERSAL',
                  amount: delta,
                  payoutMethodUsed: activeOrder.payoutMethod,
                  reason: `[قيد تسوية فروقات] تعديل مبلغ أمر الصرف #${activeOrder._id} من ${prevAmount} إلى ${nextAmount} USDT`,
                  warningLevel: 'NONE',
                  relatedPayoutOrderId: activeOrder._id,
                  recordedBy: adminId
                }
              ],
              { session }
            );
          }

          activeOrder.amount = nextAmount;
          if (data.category) activeOrder.category = data.category as any;
          if (data.summary) activeOrder.summaryForTreasury = data.summary;
          if (data.targetVault) (activeOrder as any).targetVaultSegment = data.targetVault;

          if (activeOrder.modificationRequest && activeOrder.modificationRequest.status === 'PENDING') {
            activeOrder.modificationRequest.status = 'APPROVED';
            activeOrder.modificationRequest.adminDecisionNote = 'تم تنفيذ التعديل بنجاح بواسطة المدير العام';
            activeOrder.modificationRequest.decidedAt = new Date();
          }

          await activeOrder.save({ session });
          await activeVault.save({ session });
          return { vault: activeVault, order: activeOrder, oldAmount: prevAmount, newAmount: nextAmount };
        }
      );

      await AuditService.logAction({
        userId: adminId,
        userName: adminUser?.fullName || 'القائد الأعلى',
        userEmail: adminUser?.email || 'admin@thelordofcrypto.com',
        userRole: 'SUPER_ADMIN',
        actionType: 'SYSTEM_SECURITY_CONFIG',
        targetName: `تعديل متسلسل لأمر الصرف #${order._id}`,
        targetType: 'SYSTEM',
        severity: 'CRITICAL',
        details: {
          oldAmount,
          newAmount,
          newCategory: order.category,
          adminNote: data.reason || 'تعديل بقرار إداري'
        }
      });

      SocketService.emitToAdmins('vault:updated', vault);
      SocketService.broadcast('payout:updated', order);

      return { success: true, message: 'تم تعديل العملية وضبط الأرصدة المتسلسلة بنجاح', data: order };
    } else {
      const vault = await this.withFinancialTransaction(async (session) => {
        const activeVault = await this.getOrCreateVault(session);
        const idx = activeVault.manualAdjustmentsLog.findIndex((a: any) => a._id?.toString() === id);
        if (idx === -1) throw new Error('عملية التعديل غير موجودة');

        const adj = activeVault.manualAdjustmentsLog[idx] as any;
        const oldAmount = adj.amount;
        const newAmount = data.amount !== undefined ? Number(data.amount) : oldAmount;
        const delta = FinancialMath.subtract(newAmount, oldAmount, 2);

        if (adj.operation === 'DEPOSIT') {
          activeVault.generalBudget = FinancialMath.add(activeVault.generalBudget, delta, 2);
        } else if (adj.operation === 'FUND_TREASURY') {
          activeVault.treasuryBalance = FinancialMath.add(activeVault.treasuryBalance, delta, 2);
          activeVault.generalBudget = FinancialMath.subtract(activeVault.generalBudget, delta, 2);
        }

        adj.amount = newAmount;
        if (data.reason) adj.reason = data.reason;

        await activeVault.save({ session });
        return activeVault;
      });

      SocketService.emitToAdmins('vault:updated', vault);

      return { success: true, message: 'تم تعديل قيد الإيداع/التحويل وضبط الأرصدة بنجاح' };
    }
  }
}


