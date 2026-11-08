import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { AccountingService } from '../services/accounting.service';
import { SocketService } from '../services/socket.service';
import { TheLordAIService } from '../services/theLordAI.service';
import { IConfirmDisbursedDto } from '@lord/shared-types';

export class TreasuryController {
  public static async getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const filter: Record<string, unknown> = {};

      if (status && status !== 'ALL') {
        filter.executionStatus = status;
      }

      const orders = await PayoutOrder.find(filter)
        .populate('beneficiaryId', 'fullName email phoneNumber avatarUrl')
        .sort({ createdAt: -1 });

      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async startProcessing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await PayoutOrder.findById(id).populate('beneficiaryId', 'fullName');

      if (!order) {
        res.status(404).json({ success: false, error: 'Payout order not found' });
        return;
      }

      if (order.executionStatus !== 'WAITING_TREASURY') {
        res.status(400).json({ 
          success: false, 
          error: `Cannot start processing order in state ${order.executionStatus}` 
        });
        return;
      }

      order.executionStatus = 'IN_PROGRESS';
      order.inProgressClickedAt = new Date();
      await order.save();

      const beneficiaryObj = order.beneficiaryId as any;
      const beneficiaryIdStr = beneficiaryObj?._id ? beneficiaryObj._id.toString() : order.beneficiaryId.toString();

      // Emit real-time Toast + Socket to employee & admins
      const payload = {
        orderId: order._id,
        amount: order.amount,
        currency: order.currency,
        beneficiaryId: beneficiaryIdStr,
        payoutMethod: order.payoutMethod,
        status: 'IN_PROGRESS'
      };

      SocketService.emitToUser(beneficiaryIdStr, 'payout:processing', payload);
      SocketService.emitToAdmins('payout:processing', payload);

      res.json({
        success: true,
        message: 'Order marked as processing',
        data: order
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async confirmDisbursed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const body = req.body as IConfirmDisbursedDto;

      if (!body.txHashOrReferenceNumber || !body.txHashOrReferenceNumber.trim()) {
        res.status(400).json({
          success: false,
          error: 'TxHash (for BEP20) or Reference/Transfer number (for Jeeb/Jawali) is mandatory'
        });
        return;
      }

      // Execute atomic accounting deduction from CompanyVault & EmployeeLedger with Liquidity Check
      const result = await AccountingService.executeDisbursement(
        id,
        req.user?._id?.toString() || '',
        {
          txHashOrReferenceNumber: body.txHashOrReferenceNumber.trim(),
          receiptScreenshot: body.receiptScreenshot
        }
      );

      res.json({
        success: true,
        message: 'تم تأكيد الصرف بنجاح وخصمه من رصيد الصندوق وتوثيقه محاسبياً',
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Gemini Vision Receipt Auditor
   * Inspects uploaded receipt screenshot, extracts transaction reference, amount & recipient
   */
  public static async auditReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { imageBase64, mimeType, orderId } = req.body;
      if (!imageBase64) {
        res.status(400).json({ success: false, error: 'صورة السند مطلوبة لإجراء الفحص' });
        return;
      }

      let expectedAmount: number | undefined;
      let expectedCurrency: string | undefined;
      let expectedRecipientName: string | undefined;
      let payoutMethod: string | undefined;

      if (orderId) {
        const order = await PayoutOrder.findById(orderId).populate('beneficiaryId', 'fullName');
        if (order) {
          expectedAmount = order.amount;
          expectedCurrency = order.currency;
          expectedRecipientName = (order.beneficiaryId as any)?.fullName;
          payoutMethod = order.payoutMethod;
        }
      }

      const auditResult = await TheLordAIService.auditReceiptImage({
        imageBase64,
        mimeType,
        expectedAmount,
        expectedCurrency,
        expectedRecipientName,
        payoutMethod
      });

      res.json({
        success: true,
        data: auditResult
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async createCustomSubVault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, code, parentVault, monthlyAllocated, alertThresholdPercent } = req.body;
      const vault = await AccountingService.createCustomSubVault(
        name,
        code,
        parentVault,
        Number(monthlyAllocated),
        Number(alertThresholdPercent),
        req.user?._id?.toString() || ''
      );
      res.json({ success: true, message: 'تم إنشاء الصندوق الفرعي بنجاح', data: vault });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async transferToSubVault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { subVaultCode, amount, reason } = req.body;
      const vault = await AccountingService.transferToSubVault(
        subVaultCode,
        Number(amount),
        reason,
        req.user?._id?.toString() || ''
      );
      res.json({ success: true, message: 'تم تخصيص السيولة للصندوق الفرعي بنجاح', data: vault });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async requestOrderModification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { requestedAction, reason, proposedNote } = req.body;
      const order = await AccountingService.requestOrderModification(
        id,
        requestedAction,
        reason,
        proposedNote,
        req.user?._id?.toString() || ''
      );
      res.json({ success: true, message: 'تم رفع طلب التعديل/الإلغاء إلى المسؤول بنجاح', data: order });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async decideOrderModification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { decision, adminDecisionNote } = req.body;
      const result = await AccountingService.decideOrderModification(
        id,
        decision,
        adminDecisionNote,
        req.user?._id?.toString() || ''
      );
      res.json({ success: true, message: 'تم تسجيل قرار الإدارة بنجاح', data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async updateEmployeeSalary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { baseSalary, salaryCurrency, payoutDayOfMonth } = req.body;
      const user = await AccountingService.updateEmployeeCompensation(
        id,
        Number(baseSalary),
        salaryCurrency,
        Number(payoutDayOfMonth),
        req.user?._id?.toString() || ''
      );
      res.json({ success: true, message: 'تم تحديث راتب الموظف بنجاح', data: user });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async getRecurringExpenses(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const expenses = await AccountingService.getRecurringExpenses();
      res.json({ success: true, data: expenses });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async createRecurringExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const expense = await AccountingService.createRecurringExpense(req.body, req.user?._id?.toString() || '');
      res.json({ success: true, message: 'تمت إضافة المصروف الدوري بنجاح', data: expense });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async deleteRecurringExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AccountingService.deleteRecurringExpense(id);
      res.json({ success: true, message: 'تم حذف المصروف الدوري بنجاح' });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async executeRecurringExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await AccountingService.executeRecurringExpense(id, req.user?._id?.toString() || '');
      res.json({ success: true, message: 'تم صرف المصروف الدوري وخصمه من رصيد الصندوق بنجاح', data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async getAccountingReports(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reports = await AccountingService.getAccountingReports();
      res.json({ success: true, data: reports });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async getAllTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, category, search } = req.query;
      const transactions = await AccountingService.getAllTransactions({
        type: type as string,
        category: category as string,
        search: search as string
      });
      res.json({ success: true, data: transactions });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async adminUpdateTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, amount, category, summary, targetVault, reason } = req.body;
      const result = await AccountingService.adminUpdateTransaction(
        id,
        type || 'PAYOUT',
        { amount, category, summary, targetVault, reason },
        req.user?._id?.toString() || ''
      );
      res.json({ success: true, message: 'تم تعديل العملية وضبط الأرصدة المرتبطة بنجاح', data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async adminDeleteTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, reason } = req.body;
      const result = await AccountingService.adminDeleteTransaction(
        id,
        type || 'PAYOUT',
        req.user?._id?.toString() || '',
        reason
      );
      res.json({ success: true, message: 'تم حذف العملية واسترجاع الأرصدة وتعديل المعاملات المرتبطة بنجاح', data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }

  public static async recalculateVault(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vault = await AccountingService.recalculateVaultFromRealOperations();
      res.json({ success: true, message: 'تمت إعادة احتساب وتدقيق كافة الأرصدة من العمليات الحقيقية بنجاح', data: vault });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}
