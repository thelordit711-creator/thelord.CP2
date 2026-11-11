import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';

const router = Router();
router.use(verifyKindeJWT);

// Read & team collaboration endpoints (role-scoped inside controller)
router.get('/', ProjectsController.getAllProjects);
router.get('/:id', ProjectsController.getProjectById);
router.get('/:id/financials', ProjectsController.getProjectFinancials);
router.post('/:id/chat-channel', ProjectsController.openOrCreateProjectChannel);

// Executive Admin-only endpoints
router.post('/ai-generate-plan', rbacGuard(['SUPER_ADMIN']), ProjectsController.aiGeneratePlan);
router.post('/', rbacGuard(['SUPER_ADMIN']), ProjectsController.createProject);
router.put('/:id', rbacGuard(['SUPER_ADMIN']), ProjectsController.updateProject);
router.delete('/:id', rbacGuard(['SUPER_ADMIN']), ProjectsController.deleteProject);
router.post('/:id/decompose-milestone', rbacGuard(['SUPER_ADMIN']), ProjectsController.decomposeMilestoneToTasks);
router.post('/:id/decompose-all', rbacGuard(['SUPER_ADMIN']), ProjectsController.decomposeAllMilestones);

export default router;
