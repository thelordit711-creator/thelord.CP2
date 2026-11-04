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
   * Atomically executes the disbursement accounting deduction
   */
  public static async executeDisbursement(payoutOrderId: string, treasuryUserId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await PayoutOrder.findById(payoutOrderId).session(session);
      if (!order) throw new Error('Payout order not found');
      if (order.executionStatus === 'DISBURSED') {
        throw new Error('Payout order has already been disbursed');
      }

      const vault = await this.getOrCreateVault();

      // Deduct from Treasury Balance & General Budget
      vault.treasuryBalance -= order.amount;
      vault.generalBudget -= order.amount;

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

      return { vault, order };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

