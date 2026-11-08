import mongoose from 'mongoose';
import { CompanyVault } from '../models/CompanyVault.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { EmployeeLedger } from '../models/EmployeeLedger.model';
import { User } from '../models/User.model';
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
}

