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

// Profile management
router.patch('/profile', UsersController.updateProfile);

// Automated Leaderboard & KPIs
router.get('/leaderboard', UsersController.getLeaderboard);

// System Settings
router.get('/system-settings', UsersController.getSystemSettings);
router.put('/system-settings', rbacGuard(['SUPER_ADMIN']), UsersController.updateSystemSettings);

// Team members directory (accessible to all authenticated staff for task assignment, chat, & delegation)
router.get('/team', UsersController.getAllEmployees);
router.get('/admin/all', UsersController.getAllEmployees);
router.get('/admin/:id', rbacGuard(['SUPER_ADMIN']), UsersController.getEmployeeDetails);
router.delete('/admin/:id', rbacGuard(['SUPER_ADMIN']), UsersController.deleteUser);
router.patch('/admin/:id/password', rbacGuard(['SUPER_ADMIN']), UsersController.changeUserPassword);
router.patch('/admin/:id/suspend', rbacGuard(['SUPER_ADMIN']), UsersController.toggleUserSuspension);

export default router;

