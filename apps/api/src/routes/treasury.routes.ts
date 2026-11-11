import { Router } from 'express';
import { TreasuryController } from '../controllers/treasury.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';
import { treasuryRateLimiter } from '../middlewares/rateLimiter';
import { validateBody, validateParams } from '../middlewares/validateRequest';
import {
  idParamSchema,
  confirmDisbursedSchema,
  createSubVaultSchema,
  transferSubVaultSchema,
  updateEmployeeSalarySchema,
  createRecurringExpenseSchema
} from '../schemas/api.schemas';

const router = Router();

router.use(verifyKindeJWT);
router.use(rbacGuard(['TREASURY', 'SUPER_ADMIN']));

// Treasury isolation endpoints
router.get('/orders', TreasuryController.getOrders);
router.patch('/orders/:id/processing', validateParams(idParamSchema), TreasuryController.startProcessing);
router.patch('/orders/:id/disbursed', treasuryRateLimiter, validateParams(idParamSchema), validateBody(confirmDisbursedSchema), TreasuryController.confirmDisbursed);
router.post('/audit-receipt', TreasuryController.auditReceipt);
router.post('/verify-txhash', TreasuryController.verifyTxHash);

// Hierarchical sub-vaults (Strictly Super Admin for structural changes & capital allocation)
router.post('/sub-vaults', rbacGuard(['SUPER_ADMIN']), validateBody(createSubVaultSchema), TreasuryController.createCustomSubVault);
router.post('/sub-vaults/transfer', rbacGuard(['SUPER_ADMIN']), validateBody(transferSubVaultSchema), TreasuryController.transferToSubVault);

// Transaction modification / cancellation requests
router.post('/orders/:id/request-modification', validateParams(idParamSchema), TreasuryController.requestOrderModification);
router.patch('/orders/:id/decide-modification', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), TreasuryController.decideOrderModification);

// Employee salary setting (STRICTLY SUPER_ADMIN: موظف الصندوق لا يحق له تعديل الراتب)
router.patch('/employees/:id/salary', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), validateBody(updateEmployeeSalarySchema), TreasuryController.updateEmployeeSalary);

// Master Transactions Ledger & Cascading Management
router.get('/transactions', TreasuryController.getAllTransactions);
router.patch('/transactions/:id', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), TreasuryController.adminUpdateTransaction);
router.delete('/transactions/:id', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), TreasuryController.adminDeleteTransaction);
router.post('/recalculate', rbacGuard(['SUPER_ADMIN']), TreasuryController.recalculateVault);

// Recurring expenses management
router.get('/recurring-expenses', TreasuryController.getRecurringExpenses);
router.post('/recurring-expenses', rbacGuard(['SUPER_ADMIN']), validateBody(createRecurringExpenseSchema), TreasuryController.createRecurringExpense);
router.delete('/recurring-expenses/:id', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), TreasuryController.deleteRecurringExpense);
router.post('/recurring-expenses/:id/execute', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), TreasuryController.executeRecurringExpense);

// Accounting & Category Reports
router.get('/reports', TreasuryController.getAccountingReports);

export default router;

