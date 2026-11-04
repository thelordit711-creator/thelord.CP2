import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { AccountingService } from '../services/accounting.service';
import { SocketService } from '../services/socket.service';
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

      if (!body.txHashOrReferenceNumber) {
        res.status(400).json({
          success: false,
          error: 'TxHash (for BEP20) or Reference/Transfer number (for Jeeb/Jawali) is mandatory'
        });
        return;
      }

      const order = await PayoutOrder.findById(id);
      if (!order) {
        res.status(404).json({ success: false, error: 'Payout order not found' });
        return;
      }

      // Update transfer proof
      order.executionStatus = 'DISBURSED';
      order.disbursedClickedAt = new Date();
      order.transferProof = {
        txHashOrReferenceNumber: body.txHashOrReferenceNumber.trim(),
        receiptScreenshot: body.receiptScreenshot,
        executedByTreasuryId: req.user?._id
      };
      await order.save();

      // Execute atomic accounting deduction from CompanyVault & EmployeeLedger
      const result = await AccountingService.executeDisbursement(id, req.user?._id?.toString() || '');

      res.json({
        success: true,
        message: 'Payout successfully disbursed and settled in Company Vault',
        data: result
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}
