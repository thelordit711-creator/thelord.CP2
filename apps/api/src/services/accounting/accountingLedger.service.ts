import mongoose from 'mongoose';
import { PayoutOrder } from '../../models/PayoutOrder.model';
import { EmployeeLedger } from '../../models/EmployeeLedger.model';
import { User } from '../../models/User.model';
import { SocketService } from '../socket.service';
import { AuditService } from '../audit.service';
import { FinancialMath } from '../../utils/financialMath';
import { AccountingCoreService } from './accountingCore.service';

/**
 * Ledger reporting, vault recalculation, unified transaction search, and reversible admin adjustments.
 */
export class AccountingLedgerService {
  /**
   * Reports by Category & Vault
   */
  public static async getAccountingReports() {
    const vault = await AccountingCoreService.getOrCreateVault();
    const orders = await PayoutOrder.find({ executionStatus: 'DISBURSED' });
    const employees = await User.find({ accessRole: 'EMPLOYEE' }).select('fullName email compensation');

    const totalSalaries = orders.filter((o) => o.category === 'SALARY').reduce((sum, o) => sum + o.amount, 0);
    const totalBonuses = orders.filter((o) => o.category === 'BONUS').reduce((sum, o) => sum + o.amount, 0);
    const totalAdvances = orders.filter((o) => o.category === 'ADVANCE').reduce((sum, o) => sum + o.amount, 0);
    const totalAds = orders
      .filter((o) => o.category === 'TG_ADS' || o.category === 'TG_CHANNEL_PROMO')
      .reduce((sum, o) => sum + o.amount, 0);
    const totalSoftware = orders
      .filter((o) => o.category === 'SOFTWARE_SUBSCRIPTION')
      .reduce((sum, o) => sum + o.amount, 0);
    const totalOther = orders
      .filter((o) => (o.category as string) === 'GENERAL' || (o.category as string) === 'ALLOWANCE')
      .reduce((sum, o) => sum + o.amount, 0);

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
    const vault = await AccountingCoreService.getOrCreateVault();
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
    const vault = await AccountingCoreService.getOrCreateVault();
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
   * Cascading Admin Delete Transaction (creates reversible adjustment entry without purging historical payout)
   */
  public static async adminDeleteTransaction(
    id: string,
    type: string,
    adminId: string,
    reason?: string
  ) {
    const adminUser = await User.findById(adminId);

    if (type === 'PAYOUT') {
      const txResult = await AccountingCoreService.withFinancialTransaction(async (session) => {
        const vault = await AccountingCoreService.getOrCreateVault(session);
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
          } else if (
            vault.segmentedVaults?.salaries &&
            (order.category === 'SALARY' || order.category === 'BONUS' || order.category === 'ADVANCE')
          ) {
            vault.segmentedVaults.salaries.balance = FinancialMath.add(vault.segmentedVaults.salaries.balance, order.amount, 2);
            vault.segmentedVaults.salaries.totalSpent = Math.max(
              0,
              FinancialMath.subtract(vault.segmentedVaults.salaries.totalSpent, order.amount, 2)
            );
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
          const { Task } = await import('../../models/Task.model');
          const task = await Task.findById(order.relatedTaskId).session(session);
          if (task && task.financialRequirement) {
            task.financialRequirement.payoutOrderId = undefined as any;
            task.financialRequirement.adminApprovalStatus = 'PENDING_ADMIN';
            await task.save({ session });
          }
          if (wasDisbursed) {
            const { ProjectSyncService } = await import('../projectSync.service');
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
          const { ProjectSyncService } = await import('../projectSync.service');
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
    }

    const { vault, adj } = await AccountingCoreService.withFinancialTransaction(async (session) => {
      const activeVault = await AccountingCoreService.getOrCreateVault(session);
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
      const { vault, order, oldAmount, newAmount } = await AccountingCoreService.withFinancialTransaction(
        async (session) => {
          const activeVault = await AccountingCoreService.getOrCreateVault(session);
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
              targetSegment.totalSpent = Math.max(0, FinancialMath.add(targetSegment.totalSpent, delta, 2));
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
    }

    const vault = await AccountingCoreService.withFinancialTransaction(async (session) => {
      const activeVault = await AccountingCoreService.getOrCreateVault(session);
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

