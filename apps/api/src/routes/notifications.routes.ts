import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { validateParams } from '../middlewares/validateRequest';
import { idParamSchema } from '../schemas/api.schemas';

const router = Router();

router.use(verifyKindeJWT);

// Get my notifications
router.get('/', NotificationsController.getMyNotifications);

// Mark all as read
router.patch('/read-all', NotificationsController.markAllAsRead);

// Mark single notification as read
router.patch('/:id/read', validateParams(idParamSchema), NotificationsController.markAsRead);

// Delete notification
router.delete('/:id', validateParams(idParamSchema), NotificationsController.deleteNotification);

export default router;

