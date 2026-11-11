import mongoose from 'mongoose';
import { CompanyVault } from '../../models/CompanyVault.model';
import { FinancialMath } from '../../utils/financialMath';

/**
 * Core atomic transaction runner and CompanyVault singleton initializer.
 */
export class AccountingCoreService {
  /**
   * Safe financial precision rounding (delegates to BigInt micro-unit FinancialMath)
   */
  public static roundCurrency(value: number): number {
    return FinancialMath.roundCurrency(value, 2);
  }

  /**
   * Executes multi-document financial mutations inside an atomic MongoDB transaction session.
   */
  public static async withFinancialTransaction<T>(
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
}

