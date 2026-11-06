import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';

const router = Router();

router.use(verifyKindeJWT);

// Get my notifications
router.get('/', NotificationsController.getMyNotifications);

// Mark all as read
router.patch('/read-all', NotificationsController.markAllAsRead);

// Mark single notification as read
router.patch('/:id/read', NotificationsController.markAsRead);

// Delete notification
router.delete('/:id', NotificationsController.deleteNotification);

export default router;

