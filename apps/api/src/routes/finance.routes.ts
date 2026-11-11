import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';
import { validateBody, validateParams } from '../middlewares/validateRequest';
import {
  idParamSchema,
  orderIdParamSchema,
  decideFinancialRequestSchema,
  adjustVaultSchema,
  manageEmployeeLedgerSchema,
  generateTrancheSchema
} from '../schemas/api.schemas';

const router = Router();

router.use(verifyKindeJWT);

// Employee statement (view own statement)
router.get('/my-statement', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), FinanceController.getMyStatement);

// Employee confirms payout receipt (Optional or mandatory based on admin setting)
router.post('/payouts/:orderId/confirm-receipt', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), validateParams(orderIdParamSchema), FinanceController.confirmPayoutReceipt);

// Employee / Admin gets comprehensive monthly report
router.get('/monthly-report/:employeeId', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), FinanceController.getEmployeeMonthlyReport);

// Admin Finance & Payroll Endpoints
router.get('/requests', rbacGuard(['SUPER_ADMIN']), FinanceController.getFinancialRequests);
router.patch('/requests/:id', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), validateBody(decideFinancialRequestSchema), FinanceController.decideFinancialRequest);
router.get('/vault', rbacGuard(['SUPER_ADMIN']), FinanceController.getVault);
router.patch('/vault', rbacGuard(['SUPER_ADMIN']), validateBody(adjustVaultSchema), FinanceController.adjustVault);
router.post('/ledger/:id', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), validateBody(manageEmployeeLedgerSchema), FinanceController.manageEmployeeLedger);

// 10-Day Tranches Payroll & Allowances Management (Admin only)
router.get('/payroll-schedules', rbacGuard(['SUPER_ADMIN']), FinanceController.getPayrollSchedules);
router.put('/payroll-schedules/:employeeId', rbacGuard(['SUPER_ADMIN']), FinanceController.updatePayrollSchedule);
router.post('/payroll/generate-tranche', rbacGuard(['SUPER_ADMIN']), validateBody(generateTrancheSchema), FinanceController.generateTranchePayouts);

export default router;

