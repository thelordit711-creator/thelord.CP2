import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';

const router = Router();

router.use(verifyKindeJWT);

// Get current authenticated user
router.get('/me', UsersController.getMe);

// Complete 5-step onboarding wizard
router.post('/onboarding', UsersController.completeOnboarding);

// Admin only: view all team members
router.get('/admin/all', rbacGuard(['SUPER_ADMIN']), UsersController.getAllEmployees);
router.get('/admin/:id', rbacGuard(['SUPER_ADMIN']), UsersController.getEmployeeDetails);

export default router;

