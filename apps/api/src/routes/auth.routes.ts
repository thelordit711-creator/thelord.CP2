import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { validateBody } from '../middlewares/validateRequest';
import {
  loginSchema,
  acceptInvitationSchema,
  updateWorkStatusSchema,
  twoFactorCodeSchema,
  createInvitationSchema
} from '../schemas/api.schemas';

const router = Router();

// Public auth endpoints with strict rate limiting
router.post('/seed-admin', authRateLimiter, AuthController.seedAdmin);
router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
router.get('/verify-invite/:token', AuthController.verifyInvitation);
router.post('/accept-invite', authRateLimiter, validateBody(acceptInvitationSchema), AuthController.acceptInvitation);

// Authenticated session endpoints
router.get('/me', verifyKindeJWT, AuthController.me);
router.post('/logout', verifyKindeJWT, AuthController.logout);
router.post('/work-status', verifyKindeJWT, validateBody(updateWorkStatusSchema), AuthController.updateWorkStatus);

// Zero-Trust Two-Factor Authentication (2FA) endpoints with rate limiting
router.get('/2fa/status', verifyKindeJWT, AuthController.get2FAStatus);
router.post('/2fa/generate', verifyKindeJWT, authRateLimiter, AuthController.generate2FASetup);
router.post('/2fa/enable', verifyKindeJWT, authRateLimiter, validateBody(twoFactorCodeSchema), AuthController.enable2FA);
router.post('/2fa/disable', verifyKindeJWT, authRateLimiter, AuthController.disable2FA);

// Admin-only endpoints
router.post('/invite', verifyKindeJWT, rbacGuard(['SUPER_ADMIN']), validateBody(createInvitationSchema), AuthController.createInvitation);
router.get('/staff-statuses', verifyKindeJWT, rbacGuard(['SUPER_ADMIN']), AuthController.getStaffStatuses);

export default router;

