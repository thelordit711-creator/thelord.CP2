import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { ChatMessage } from '../models/ChatMessage.model';
import { User } from '../models/User.model';
import { SocketService } from '../services/socket.service';

const CHANNELS = [
  { id: 'general', name: 'النقاش-العام-والتوجيهات', desc: 'التنسيق العام بين كافة أقسام المؤسسة' },
  { id: 'trading', name: 'صفقات-التداول-والتحليل', desc: 'مناقشة تحليلات SMC وصفقات VIP اليومية' },
  { id: 'marketing', name: 'حملات-التسويق-والإعلانات', desc: 'إعلانات تليجرام الرسمية وتبادل القنوات' },
  { id: 'development', name: 'تطوير-البوتات-والأنظمة', desc: 'برمجة بوتات التداول وأنظمة الـ ERP' },
  { id: 'treasury', name: 'الخزينة-وحوالات-الصندوق', desc: 'متابعة الصرف المالي وإشعارات التحويل' }
];

export class ChatController {
  /**
   * Get all active channels and all real members strictly from MongoDB database
   */
  public static async getRoomsAndMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Fetch only REAL users from MongoDB
      const realUsers = await User.find({})
        .select('_id fullName email accessRole primaryDepartment jobTitles workStatus presenceStatus lastActiveAt avatarUrl')
        .sort({ accessRole: 1, createdAt: 1 });

      res.json({
        success: true,
        channels: CHANNELS,
        members: realUsers,
        data: {
          channels: CHANNELS,
          members: realUsers
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Get messages for a channel or DM strictly from MongoDB
   */
  public static async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      const messages = await ChatMessage.find({ chatRoomId: roomId })
        .populate('senderId', 'fullName email accessRole avatarUrl primaryDepartment')
        .sort({ createdAt: 1 })
        .limit(100);

      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Send text message or attachment, persist in MongoDB and emit via Socket.io
   */
  public static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { chatRoomId, content, attachments } = req.body;

      if (!chatRoomId || (!content && (!attachments || attachments.length === 0))) {
        res.status(400).json({ success: false, error: 'محتوى الرسالة ومعرف الغرفة مطلوبان' });
        return;
      }

      // Sanitize attachments to guarantee valid Mongoose schema fields
      const sanitizedAttachments = (attachments || []).map((att: any, idx: number) => {
        let fType = att.fileType;
        if (fType === 'AUDIO') fType = 'VOICE_NOTE';
        if (!fType) fType = 'ANY_FILE';

        const fileUrl = att.fileUrl || att.url || '';
        const fileName = att.fileName || (fType === 'VOICE_NOTE' ? `voice_note_${Date.now()}.webm` : `attachment_${Date.now()}_${idx + 1}`);

        return {
          fileType: fType,
          fileName,
          fileUrl,
          mimeType: att.mimeType || (fType === 'VOICE_NOTE' ? 'audio/webm' : 'application/octet-stream'),
          fileSizeInBytes: att.fileSizeInBytes || (fileUrl ? Math.round(fileUrl.length * 0.75) : 0),
          durationInSeconds: att.durationInSeconds,
          videoTimestampNotes: att.videoTimestampNotes || [],
          uploadedBy: req.user?._id,
          uploadedAt: new Date()
        };
      });

      const newMessage = await ChatMessage.create({
        chatRoomId,
        senderId: req.user._id,
        content: content || '',
        attachments: sanitizedAttachments,
        readBy: [req.user._id]
      });

      const populatedMessage = await ChatMessage.findById(newMessage._id)
        .populate('senderId', 'fullName email accessRole avatarUrl primaryDepartment');

      // Emit live real-time event to everyone in the room
      SocketService.getIO()?.emit(`chat:${chatRoomId}:message`, populatedMessage);
      SocketService.getIO()?.emit('chat:notification', {
        chatRoomId,
        senderName: req.user.fullName,
        content: content?.substring(0, 60)
      });

      res.status(201).json({
        success: true,
        data: populatedMessage
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}
