import mongoose from 'mongoose';
import { CompanyVault } from '../models/CompanyVault.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { EmployeeLedger } from '../models/EmployeeLedger.model';
import { User } from '../models/User.model';
import { SocketService } from './socket.service';
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
    return vault;
  }

  /**
   * Feed/Transfer funds from General Budget to Treasury Balance
   * Invariant: any addition to Treasury is deducted from General Budget
   */
  public static async fundTreasuryFromGeneralBudget(amount: number, reason: string, adminId: string) {
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

    vault.manualAdjustmentsLog.push({
      adjustedBy: adminId as any,
      targetBalance: 'TRANSFER_BETWEEN_BUDGETS',
      operation: 'FUND_TREASURY',
      amount,
      reason: reason || 'تغذية رصيد الصندوق المتاح للصرف بالخصم من الميزانية العامة',
      createdAt: new Date()
    });

    await vault.save();
    SocketService.emitToAdmins('vault:updated', vault);
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

      // Notify employee & admin via Socket
      const beneficiary = await User.findById(order.beneficiaryId);
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

      return { vault, order };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

