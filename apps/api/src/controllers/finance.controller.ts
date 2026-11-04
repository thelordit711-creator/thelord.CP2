import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { Task } from '../models/Task.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { CompanyVault } from '../models/CompanyVault.model';
import { EmployeeLedger } from '../models/EmployeeLedger.model';
import { User } from '../models/User.model';
import { AccountingService } from '../services/accounting.service';
import { SocketService } from '../services/socket.service';
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
      const vault = await AccountingService.getOrCreateVault();

      if (body.targetBalance === 'GENERAL_BUDGET') {
        if (body.operation === 'INCREASE') vault.generalBudget += body.amount;
        else if (body.operation === 'DECREASE') vault.generalBudget -= body.amount;
        else if (body.operation === 'SET') vault.generalBudget = body.amount;
      } else {
        if (body.operation === 'INCREASE') vault.treasuryBalance += body.amount;
        else if (body.operation === 'DECREASE') vault.treasuryBalance -= body.amount;
        else if (body.operation === 'SET') vault.treasuryBalance = body.amount;
      }

      vault.manualAdjustmentsLog.push({
        adjustedBy: req.user?._id as any,
        targetBalance: body.targetBalance,
        operation: body.operation,
        amount: body.amount,
        reason: body.reason,
        createdAt: new Date()
      });

      await vault.save();

      SocketService.emitToAdmins('vault:updated', vault);

      res.json({ success: true, message: 'Vault balance adjusted successfully', data: vault });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
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
}

