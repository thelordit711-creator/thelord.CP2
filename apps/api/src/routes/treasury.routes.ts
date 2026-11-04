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

export default router;

