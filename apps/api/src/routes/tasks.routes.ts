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

// Submit stage by employee
router.post('/:id/stages/:order', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), TasksController.submitStage);

// Review stage by admin
router.patch('/:id/stages/:order/review', rbacGuard(['SUPER_ADMIN']), TasksController.reviewStage);

// Direct report
router.post('/:id/reports', rbacGuard(['EMPLOYEE', 'SUPER_ADMIN']), TasksController.addDirectReport);

export default router;

