import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { Notification } from '../models/Notification.model';

export class NotificationsController {
  /**
   * Get user notifications (scoped to authenticated user)
   */
  public static async getMyNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 30;
      const skip = (page - 1) * limit;

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find({ recipientId: req.user._id })
          .populate('senderId', 'fullName email avatarUrl accessRole')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments({ recipientId: req.user._id }),
        Notification.countDocuments({ recipientId: req.user._id, readStatus: false })
      ]);

      res.json({
        success: true,
        data: notifications,
        meta: {
          total,
          unreadCount,
          page,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Mark single notification as read
   */
  public static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await Notification.findOneAndUpdate(
        { _id: id, recipientId: req.user?._id },
        { readStatus: true },
        { new: true }
      );

      if (!notification) {
        res.status(404).json({ success: false, error: 'الإشعار غير موجود' });
        return;
      }

      res.json({ success: true, data: notification });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Mark all notifications as read for current user
   */
  public static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await Notification.updateMany(
        { recipientId: req.user?._id, readStatus: false },
        { readStatus: true }
      );

      res.json({ success: true, message: 'تم تحديد جميع الإشعارات كمقروءة' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Delete single notification
   */
  public static async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await Notification.findOneAndDelete({
        _id: id,
        recipientId: req.user?._id
      });

      if (!deleted) {
        res.status(404).json({ success: false, error: 'الإشعار غير موجود' });
        return;
      }

      res.json({ success: true, message: 'تم حذف الإشعار بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

