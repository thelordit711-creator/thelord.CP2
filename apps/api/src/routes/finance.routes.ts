import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';

const router = Router();

router.use(verifyKindeJWT);

// Employee statement (view own statement)
router.get('/my-statement', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), FinanceController.getMyStatement);

// Admin Finance Endpoints
router.get('/requests', rbacGuard(['SUPER_ADMIN']), FinanceController.getFinancialRequests);
router.patch('/requests/:id', rbacGuard(['SUPER_ADMIN']), FinanceController.decideFinancialRequest);
router.get('/vault', rbacGuard(['SUPER_ADMIN']), FinanceController.getVault);
router.patch('/vault', rbacGuard(['SUPER_ADMIN']), FinanceController.adjustVault);
router.post('/ledger/:id', rbacGuard(['SUPER_ADMIN']), FinanceController.manageEmployeeLedger);

export default router;

