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
}
