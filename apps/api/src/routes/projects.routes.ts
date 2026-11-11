import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { rbacGuard } from '../middlewares/rbacGuard';
import { validateBody, validateParams } from '../middlewares/validateRequest';
import {
  idParamSchema,
  aiGenerateProjectPlanSchema,
  createProjectSchema,
  updateProjectSchema
} from '../schemas/api.schemas';

const router = Router();
router.use(verifyKindeJWT);

// Read & team collaboration endpoints (role-scoped inside controller)
router.get('/', ProjectsController.getAllProjects);
router.get('/:id', validateParams(idParamSchema), ProjectsController.getProjectById);
router.get('/:id/financials', validateParams(idParamSchema), ProjectsController.getProjectFinancials);
router.post('/:id/chat-channel', validateParams(idParamSchema), ProjectsController.openOrCreateProjectChannel);

// Executive Admin-only endpoints
router.post('/ai-generate-plan', rbacGuard(['SUPER_ADMIN']), validateBody(aiGenerateProjectPlanSchema), ProjectsController.aiGeneratePlan);
router.post('/', rbacGuard(['SUPER_ADMIN']), validateBody(createProjectSchema), ProjectsController.createProject);
router.put('/:id', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), validateBody(updateProjectSchema), ProjectsController.updateProject);
router.delete('/:id', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), ProjectsController.deleteProject);
router.post('/:id/decompose-milestone', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), ProjectsController.decomposeMilestoneToTasks);
router.post('/:id/decompose-all', rbacGuard(['SUPER_ADMIN']), validateParams(idParamSchema), ProjectsController.decomposeAllMilestones);

export default router;
