import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { MeetingRoom } from '../models/MeetingRoom.model';
import { Task } from '../models/Task.model';
import { User } from '../models/User.model';
import { SocketService } from '../services/socket.service';

export class MeetingController {
  /**
   * Get or initialize the company's active meeting room in MongoDB
   */
  public static async getActiveMeeting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let room = await MeetingRoom.findOne({ status: 'ACTIVE' })
        .populate('hostId', 'fullName email accessRole avatarUrl')
        .populate('participants.userId', 'fullName email accessRole avatarUrl primaryDepartment');

      if (!room) {
        const adminUser = await User.findOne({ accessRole: 'SUPER_ADMIN' });
        room = await MeetingRoom.create({
          title: 'غرفة البث والاجتماعات المركزية — THE LORD',
          hostId: adminUser?._id,
          status: 'ACTIVE',
          agenda: 'مناقشة خطة التداول الأسبوعية وإعلانات القنوات ومشاريع البوتات',
          meetingNotes: '1. متابعة مستويات السيولة وصرف المستحقات عبر BEP20.\n2. إطلاق استراتيجية صفقات VIP اليومية.\n3. مراجعة إحصائيات التفاعل ونمو القنوات.',
          participants: []
        });

        room = await MeetingRoom.findById(room._id)
          .populate('hostId', 'fullName email accessRole avatarUrl');
      }

      res.json({
        success: true,
        data: room
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Register user joining the live meeting in MongoDB
   */
  public static async joinMeeting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      let room = await MeetingRoom.findOne({ status: 'ACTIVE' });
      if (!room) {
        room = await MeetingRoom.create({
          title: 'غرفة البث والاجتماعات المركزية — THE LORD',
          hostId: req.user._id,
          status: 'ACTIVE',
          participants: []
        });
      }

      // Check if user is already in participants
      const existingIndex = room.participants.findIndex(
        (p: any) => p.userId?.toString() === req.user?._id.toString()
      );

      if (existingIndex === -1) {
        room.participants.push({
          userId: req.user._id,
          fullName: req.user.fullName,
          accessRole: req.user.accessRole,
          avatarUrl: req.user.avatarUrl,
          joinedAt: new Date(),
          isSpeaking: false,
          isCameraOn: true,
          isMuted: false
        } as any);
        await room.save();
      }

      const updatedRoom = await MeetingRoom.findById(room._id)
        .populate('hostId', 'fullName email accessRole')
        .populate('participants.userId', 'fullName email accessRole avatarUrl primaryDepartment');

      // Emit live real-time update to all room listeners
      SocketService.getIO()?.emit('meeting:participants-updated', updatedRoom?.participants);

      res.json({
        success: true,
        data: updatedRoom
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Leave meeting and remove from MongoDB participants
   */
  public static async leaveMeeting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const room = await MeetingRoom.findOne({ status: 'ACTIVE' });
      if (room) {
        room.participants = room.participants.filter(
          (p: any) => p.userId?.toString() !== req.user?._id.toString()
        ) as any;
        await room.save();

        SocketService.getIO()?.emit('meeting:participants-updated', room.participants);
      }

      res.json({ success: true, message: 'غادرت الاجتماع بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Invite a specific member to the live meeting
   */
  public static async inviteMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'targetUserId مطلوب' });
        return;
      }

      SocketService.getIO()?.emit('meeting:invite', {
        targetUserId,
        inviterName: req.user?.fullName || 'المسؤول'
      });

      res.json({ success: true, message: 'تم إرسال دعوة الانضمام للاجتماع بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Officially start the meeting and notify everyone
   */
  public static async startMeeting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let room = await MeetingRoom.findOne({ status: 'ACTIVE' });
      if (!room) {
        room = await MeetingRoom.create({
          title: 'غرفة البث والاجتماعات المركزية — THE LORD',
          hostId: req.user?._id,
          status: 'ACTIVE',
          participants: []
        });
      }

      SocketService.getIO()?.emit('meeting:started', {
        startedBy: req.user?.fullName || 'المسؤول',
        timestamp: new Date()
      });

      res.json({ success: true, message: 'تم بدء الاجتماع وبث الإشعار لكافة الموظفين', data: room });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Save meeting notes and agenda in MongoDB
   */
  public static async updateNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { meetingNotes, agenda } = req.body;

      const room = await MeetingRoom.findOneAndUpdate(
        { status: 'ACTIVE' },
        { 
          ...(meetingNotes !== undefined ? { meetingNotes } : {}),
          ...(agenda !== undefined ? { agenda } : {})
        },
        { new: true }
      );

      SocketService.getIO()?.emit('meeting:notes-updated', {
        meetingNotes: room?.meetingNotes,
        agenda: room?.agenda
      });

      res.json({ success: true, data: room });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * AI-Powered Meeting-to-Tasks Conversion: Creates REAL tasks in MongoDB from meeting notes
   */
  public static async convertToTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const room = await MeetingRoom.findOne({ status: 'ACTIVE' });
      const notes = room?.meetingNotes || req.body.notes || '1. تنفيذ حملة صفقات VIP.\n2. تحديث مؤشرات التداول.';

      // Parse lines from notes into separate real tasks in MongoDB
      const taskLines = notes
        .split('\n')
        .map((l: string) => l.replace(/^[0-9]+[.\-)]\s*/, '').trim())
        .filter((l: string) => l.length > 5);

      const createdTasks = [];

      for (const line of taskLines) {
        const task = await Task.create({
          title: line,
          description: `مهمة مستخرجة رسمياً من محضر اجتماع مجلس العمل المباشر المنعقد بتاريخ ${new Date().toLocaleDateString('ar-YE')}`,
          targetPlatform: 'GENERAL_SYSTEM',
          priority: 'HIGH',
          createdBy: req.user._id,
          executionType: 'ADMIN_ASSIGNED',
          assignedTo: [req.user._id],
          status: 'TODO',
          stages: [
            {
              stageOrder: 1,
              stageTitle: 'المرحلة 1: التحضير والدراسة الأولية',
              instructions: 'إعداد الخطة التنفيذية الأولية ومشاركتها مع المسؤول',
              status: 'IN_PROGRESS',
              requiredInputs: [{ fieldLabel: 'تقرير الدراسة الأولية', expectedType: 'TEXT', isMandatory: true }]
            },
            {
              stageOrder: 2,
              stageTitle: 'المرحلة 2: التنفيذ النهائي والتوثيق',
              instructions: 'رفع الإثبات النهائي أو رابط المنشور للاعتماد والصرف',
              status: 'LOCKED',
              requiredInputs: [{ fieldLabel: 'إثبات الإنجاز النهائي', expectedType: 'ANY_FILE', isMandatory: true }]
            }
          ]
        });
        createdTasks.push(task);
      }

      res.status(201).json({
        success: true,
        message: `تم تحويل محضر الاجتماع إلى ${createdTasks.length} مهام حقيقية معتمدة بمراحلها في قاعدة البيانات!`,
        tasksCount: createdTasks.length,
        tasks: createdTasks
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

