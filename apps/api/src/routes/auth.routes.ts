import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';
import { authRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Public auth endpoints with strict rate limiting
router.post('/seed-admin', authRateLimiter, AuthController.seedAdmin);
router.post('/login', authRateLimiter, AuthController.login);
router.get('/verify-invite/:token', AuthController.verifyInvitation);
router.post('/accept-invite', authRateLimiter, AuthController.acceptInvitation);

// Authenticated session endpoints
router.get('/me', verifyKindeJWT, AuthController.me);
router.post('/logout', verifyKindeJWT, AuthController.logout);
router.post('/work-status', verifyKindeJWT, AuthController.updateWorkStatus);

// Zero-Trust Two-Factor Authentication (2FA) endpoints with rate limiting
router.get('/2fa/status', verifyKindeJWT, AuthController.get2FAStatus);
router.post('/2fa/generate', verifyKindeJWT, authRateLimiter, AuthController.generate2FASetup);
router.post('/2fa/enable', verifyKindeJWT, authRateLimiter, AuthController.enable2FA);
router.post('/2fa/disable', verifyKindeJWT, authRateLimiter, AuthController.disable2FA);

// Admin-only endpoints
router.post('/invite', verifyKindeJWT, rbacGuard(['SUPER_ADMIN']), AuthController.createInvitation);
router.get('/staff-statuses', verifyKindeJWT, rbacGuard(['SUPER_ADMIN']), AuthController.getStaffStatuses);

export default router;

