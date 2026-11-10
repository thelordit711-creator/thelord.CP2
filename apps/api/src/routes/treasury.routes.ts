import { Router } from 'express';
import { TreasuryController } from '../controllers/treasury.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';
import { treasuryRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(verifyKindeJWT);
router.use(rbacGuard(['TREASURY', 'SUPER_ADMIN']));

// Treasury isolation endpoints
router.get('/orders', TreasuryController.getOrders);
router.patch('/orders/:id/processing', TreasuryController.startProcessing);
router.patch('/orders/:id/disbursed', treasuryRateLimiter, TreasuryController.confirmDisbursed);
router.post('/audit-receipt', TreasuryController.auditReceipt);
router.post('/verify-txhash', TreasuryController.verifyTxHash);

// Hierarchical sub-vaults (Strictly Super Admin for structural changes & capital allocation)
router.post('/sub-vaults', rbacGuard(['SUPER_ADMIN']), TreasuryController.createCustomSubVault);
router.post('/sub-vaults/transfer', rbacGuard(['SUPER_ADMIN']), TreasuryController.transferToSubVault);

// Transaction modification / cancellation requests
router.post('/orders/:id/request-modification', TreasuryController.requestOrderModification);
router.patch('/orders/:id/decide-modification', rbacGuard(['SUPER_ADMIN']), TreasuryController.decideOrderModification);

// Employee salary setting (STRICTLY SUPER_ADMIN: موظف الصندوق لا يحق له تعديل الراتب)
router.patch('/employees/:id/salary', rbacGuard(['SUPER_ADMIN']), TreasuryController.updateEmployeeSalary);

// Master Transactions Ledger & Cascading Management
router.get('/transactions', TreasuryController.getAllTransactions);
router.patch('/transactions/:id', rbacGuard(['SUPER_ADMIN']), TreasuryController.adminUpdateTransaction);
router.delete('/transactions/:id', rbacGuard(['SUPER_ADMIN']), TreasuryController.adminDeleteTransaction);
router.post('/recalculate', rbacGuard(['SUPER_ADMIN']), TreasuryController.recalculateVault);

// Recurring expenses management
router.get('/recurring-expenses', TreasuryController.getRecurringExpenses);
router.post('/recurring-expenses', rbacGuard(['SUPER_ADMIN']), TreasuryController.createRecurringExpense);
router.delete('/recurring-expenses/:id', rbacGuard(['SUPER_ADMIN']), TreasuryController.deleteRecurringExpense);
router.post('/recurring-expenses/:id/execute', rbacGuard(['SUPER_ADMIN']), TreasuryController.executeRecurringExpense);

// Accounting & Category Reports
router.get('/reports', TreasuryController.getAccountingReports);

export default router;

