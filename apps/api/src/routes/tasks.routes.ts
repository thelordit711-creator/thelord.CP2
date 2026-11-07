import { Router } from 'express';
import { TasksController } from '../controllers/tasks.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';

const router = Router();

router.use(verifyKindeJWT);

// Create task or propose task
router.post('/', rbacGuard(['SUPER_ADMIN', 'EMPLOYEE']), TasksController.createOrProposeTask);

// Get tasks list (scoped)
router.get('/', rbacGuard(['SUPER_ADMIN', 'EMPLOYEE']), TasksController.getTasks);

// Get single task
router.get('/:id', rbacGuard(['SUPER_ADMIN', 'EMPLOYEE']), TasksController.getTaskById);

// Update task (admin only)
router.patch('/:id', rbacGuard(['SUPER_ADMIN']), TasksController.updateTask);

// Delete task (admin only)
router.delete('/:id', rbacGuard(['SUPER_ADMIN']), TasksController.deleteTask);

// Submit stage by employee
router.post('/:id/stages/:order', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), TasksController.submitStage);

// Review stage by admin
router.patch('/:id/stages/:order/review', rbacGuard(['SUPER_ADMIN']), TasksController.reviewStage);

// Direct report
router.post('/:id/reports', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), TasksController.addDirectReport);

// Settle task budget and record expense breakdown
router.post('/:id/settle-budget', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), TasksController.settleTaskBudget);

// Claim open bounty task
router.post('/:id/claim-bounty', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), TasksController.claimBounty);

export default router;

