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

// Zero-Trust Two-Factor Authentication (2FA) endpoints
router.get('/2fa/status', verifyKindeJWT, AuthController.get2FAStatus);
router.post('/2fa/generate', verifyKindeJWT, AuthController.generate2FASetup);
router.post('/2fa/enable', verifyKindeJWT, AuthController.enable2FA);
router.post('/2fa/disable', verifyKindeJWT, AuthController.disable2FA);

// Admin-only endpoints
router.post('/invite', verifyKindeJWT, rbacGuard(['SUPER_ADMIN']), AuthController.createInvitation);
router.get('/staff-statuses', verifyKindeJWT, rbacGuard(['SUPER_ADMIN']), AuthController.getStaffStatuses);

export default router;

