import { Router } from 'express';
import { TreasuryController } from '../controllers/treasury.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';

const router = Router();

router.use(verifyKindeJWT);
router.use(rbacGuard(['TREASURY', 'SUPER_ADMIN']));

// Treasury isolation endpoints
router.get('/orders', TreasuryController.getOrders);
router.patch('/orders/:id/processing', TreasuryController.startProcessing);
router.patch('/orders/:id/disbursed', TreasuryController.confirmDisbursed);
router.post('/audit-receipt', TreasuryController.auditReceipt);

// Hierarchical sub-vaults
router.post('/sub-vaults', TreasuryController.createCustomSubVault);
router.post('/sub-vaults/transfer', TreasuryController.transferToSubVault);

// Transaction modification / cancellation requests
router.post('/orders/:id/request-modification', TreasuryController.requestOrderModification);
router.patch('/orders/:id/decide-modification', rbacGuard(['SUPER_ADMIN']), TreasuryController.decideOrderModification);

// Employee salary setting
router.patch('/employees/:id/salary', TreasuryController.updateEmployeeSalary);

// Recurring expenses management
router.get('/recurring-expenses', TreasuryController.getRecurringExpenses);
router.post('/recurring-expenses', TreasuryController.createRecurringExpense);
router.delete('/recurring-expenses/:id', TreasuryController.deleteRecurringExpense);
router.post('/recurring-expenses/:id/execute', TreasuryController.executeRecurringExpense);

// Accounting & Category Reports
router.get('/reports', TreasuryController.getAccountingReports);

export default router;

