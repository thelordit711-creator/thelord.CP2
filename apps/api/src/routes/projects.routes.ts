import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';

const router = Router();
router.use(verifyKindeJWT);

router.get('/', ProjectsController.getAllProjects);
router.get('/:id', ProjectsController.getProjectById);
router.post('/', ProjectsController.createProject);
router.put('/:id', ProjectsController.updateProject);
router.delete('/:id', ProjectsController.deleteProject);
router.post('/:id/decompose-milestone', ProjectsController.decomposeMilestoneToTasks);
router.post('/:id/decompose-all', ProjectsController.decomposeAllMilestones);

export default router;

