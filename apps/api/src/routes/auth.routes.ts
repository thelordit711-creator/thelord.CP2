import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';

const router = Router();

// Public auth endpoints
router.post('/seed-admin', AuthController.seedAdmin);
router.post('/login', AuthController.login);
router.get('/verify-invite/:token', AuthController.verifyInvitation);
router.post('/accept-invite', AuthController.acceptInvitation);

// Authenticated session endpoints
router.get('/me', verifyKindeJWT, AuthController.me);
router.post('/work-status', verifyKindeJWT, AuthController.updateWorkStatus);

// Admin-only endpoints
router.post('/invite', verifyKindeJWT, rbacGuard(['SUPER_ADMIN']), AuthController.createInvitation);
router.get('/staff-statuses', verifyKindeJWT, rbacGuard(['SUPER_ADMIN']), AuthController.getStaffStatuses);

export default router;

