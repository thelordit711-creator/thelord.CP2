import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { ChatMessage } from '../models/ChatMessage.model';
import { User } from '../models/User.model';
import { Channel } from '../models/Channel.model';
import { SocketService } from '../services/socket.service';

const DEFAULT_OFFICIAL_CHANNELS = [
  { channelId: 'general', name: 'النقاش-العام-والتوجيهات', description: 'التنسيق العام بين كافة أقسام المؤسسة', isOfficial: true, isPublic: true },
  { channelId: 'trading', name: 'صفقات-التداول-والتحليل', description: 'مناقشة تحليلات SMC وصفقات VIP اليومية', isOfficial: true, isPublic: true },
  { channelId: 'marketing', name: 'حملات-التسويق-والإعلانات', description: 'إعلانات تليجرام الرسمية وتبادل القنوات', isOfficial: true, isPublic: true },
  { channelId: 'development', name: 'تطوير-البوتات-والأنظمة', description: 'برمجة بوتات التداول وأنظمة الـ ERP', isOfficial: true, isPublic: true },
  { channelId: 'treasury', name: 'الخزينة-وحوالات-الصندوق', description: 'متابعة الصرف المالي وإشعارات التحويل', isOfficial: true, isPublic: true }
];

export class ChatController {
  /**
   * Get all active channels (from MongoDB) and all real members strictly from MongoDB database
   */
  public static async getRoomsAndMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?._id;

      // 1. Ensure default channels exist in MongoDB
      const channelCount = await Channel.countDocuments();
      if (channelCount === 0 && currentUserId) {
        for (const ch of DEFAULT_OFFICIAL_CHANNELS) {
          await Channel.create({
            ...ch,
            createdBy: currentUserId
          });
        }
      }

      // 2. Fetch accessible channels from MongoDB
      const channelsFromDb = await Channel.find({
        $or: [
          { isPublic: true },
          { createdBy: currentUserId },
          { members: currentUserId }
        ]
      }).sort({ isOfficial: -1, createdAt: 1 });

      const channelsFormatted = channelsFromDb.map(c => ({
        id: c.channelId,
        name: c.name,
        desc: c.description || '',
        isOfficial: c.isOfficial,
        isPublic: c.isPublic
      }));

      // 3. Fetch only REAL users from MongoDB
      const realUsers = await User.find({})
        .select('_id fullName email accessRole primaryDepartment jobTitles workStatus presenceStatus lastActiveAt avatarUrl')
        .sort({ accessRole: 1, createdAt: 1 });

      res.json({
        success: true,
        channels: channelsFormatted.length > 0 ? channelsFormatted : DEFAULT_OFFICIAL_CHANNELS.map(c => ({ id: c.channelId, name: c.name, desc: c.description, isOfficial: true, isPublic: true })),
        members: realUsers,
        data: {
          channels: channelsFormatted.length > 0 ? channelsFormatted : DEFAULT_OFFICIAL_CHANNELS.map(c => ({ id: c.channelId, name: c.name, desc: c.description, isOfficial: true, isPublic: true })),
          members: realUsers
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Super Admin / Manager: Create a new custom channel and invite members
   */
  public static async createChannel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { name, description, isPublic = true, members = [] } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ success: false, error: 'اسم القناة مطلوب' });
        return;
      }

      const channelId = name
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, '-')
        .replace(/^-+|-+$/g, '') || `channel_${Date.now()}`;

      const existing = await Channel.findOne({ channelId });
      if (existing) {
        res.status(400).json({ success: false, error: 'توجد قناة بنفس هذا الاسم بالفعل' });
        return;
      }

      const newChannel = await Channel.create({
        channelId,
        name: name.trim(),
        description: description?.trim() || '',
        isOfficial: req.user.accessRole === 'SUPER_ADMIN',
        createdBy: req.user._id,
        members: Array.isArray(members) ? members : [],
        isPublic: Boolean(isPublic)
      });

      // Broadcast channel creation to all connected clients
      SocketService.broadcast('channel:created', {
        id: newChannel.channelId,
        name: newChannel.name,
        desc: newChannel.description,
        isOfficial: newChannel.isOfficial,
        isPublic: newChannel.isPublic
      });

      res.status(201).json({
        success: true,
        data: newChannel,
        message: 'تم إنشاء القناة بنجاح'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Get members of a specific channel
   */
  public static async getChannelMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const channel = await Channel.findOne({ channelId }).populate('members', '_id fullName email accessRole primaryDepartment avatarUrl workStatus');
      if (!channel) {
        res.status(404).json({ success: false, error: 'القناة غير موجودة' });
        return;
      }
      res.json({
        success: true,
        data: {
          channelId: channel.channelId,
          name: channel.name,
          members: channel.members,
          isPublic: channel.isPublic
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Add members to channel (Super Admin only)
   */
  public static async addChannelMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح. مخصص للإدارة فقط' });
        return;
      }
      const { channelId } = req.params;
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ success: false, error: 'قائمة المعرفات مطلوبة' });
        return;
      }
      const channel = await Channel.findOneAndUpdate(
        { channelId },
        { $addToSet: { members: { $each: userIds } } },
        { new: true }
      ).populate('members', '_id fullName email accessRole primaryDepartment avatarUrl workStatus');

      if (!channel) {
        res.status(404).json({ success: false, error: 'القناة غير موجودة' });
        return;
      }

      SocketService.broadcast('channel:updated', { channelId: channel.channelId });

      res.json({ success: true, data: channel, message: 'تمت إضافة الأعضاء للقناة بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Remove member from channel (Super Admin only)
   */
  public static async removeChannelMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح. مخصص للإدارة فقط' });
        return;
      }
      const { channelId, userId } = req.params;
      const channel = await Channel.findOneAndUpdate(
        { channelId },
        { $pull: { members: userId } },
        { new: true }
      ).populate('members', '_id fullName email accessRole primaryDepartment avatarUrl workStatus');

      if (!channel) {
        res.status(404).json({ success: false, error: 'القناة غير موجودة' });
        return;
      }

      SocketService.broadcast('channel:updated', { channelId: channel.channelId });

      res.json({ success: true, data: channel, message: 'تم إزالة العضو من القناة' });
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

      const { chatRoomId, content, attachments, replyToId } = req.body;

      if (!chatRoomId || (!content && (!attachments || attachments.length === 0))) {
        res.status(400).json({ success: false, error: 'محتوى الرسالة ومعرف الغرفة مطلوبان' });
        return;
      }

      // If replyToId provided, retrieve the quoted message details
      let replyToData: any = undefined;
      if (replyToId) {
        const originalMsg = await ChatMessage.findById(replyToId).populate('senderId', 'fullName');
        if (originalMsg) {
          replyToData = {
            _id: originalMsg._id,
            content: originalMsg.content ? (originalMsg.content.length > 80 ? originalMsg.content.substring(0, 80) + '...' : originalMsg.content) : 'مرفق أو تسجيل صوتي',
            senderName: (originalMsg.senderId as any)?.fullName || 'مستخدم'
          };
        }
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
        readBy: [req.user._id],
        replyTo: replyToData
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

      // If direct message (DM), dispatch notification to the recipient
      if (chatRoomId.startsWith('dm_') && req.user) {
        const currentId = req.user._id.toString();
        const parts = chatRoomId.replace('dm_', '').split('_');
        const recipientUserId = parts.find((p: string) => p !== currentId);
        if (recipientUserId) {
          SocketService.dispatchNotification({
            recipientId: recipientUserId,
            senderId: currentId,
            title: `💬 رسالة خاصة من ${req.user.fullName}`,
            message: content?.substring(0, 80) || (sanitizedAttachments.length ? '📎 أرسل ملفاً/تسجيلاً جديداً' : 'رسالة جديدة'),
            type: 'CHAT_MESSAGE',
            relatedEntityId: chatRoomId,
            relatedUrl: '/chat',
            priority: 'HIGH'
          });
        }
      }

      res.status(201).json({
        success: true,
        data: populatedMessage
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Edit an existing message (author only)
   */
  public static async editMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { id } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: 'محتوى الرسالة مطلوب' });
        return;
      }

      const message = await ChatMessage.findById(id);
      if (!message) {
        res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
        return;
      }

      if (message.senderId.toString() !== req.user._id.toString() && req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح بتعديل هذه الرسالة' });
        return;
      }

      message.content = content.trim();
      message.isEdited = true;
      await message.save();

      const populated = await ChatMessage.findById(message._id)
        .populate('senderId', 'fullName email accessRole avatarUrl primaryDepartment');

      // Real-time broadcast message edit to all room participants
      SocketService.getIO()?.emit(`chat:${message.chatRoomId}:message_updated`, populated);

      res.json({ success: true, data: populated });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Delete a message for everyone (author or Super Admin)
   */
  public static async deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { id } = req.params;
      const message = await ChatMessage.findById(id);
      if (!message) {
        res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
        return;
      }

      if (message.senderId.toString() !== req.user._id.toString() && req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'غير مصرح بحذف هذه الرسالة' });
        return;
      }

      message.content = '🚫 تم حذف هذه الرسالة';
      message.attachments = [];
      message.isDeleted = true;
      await message.save();

      SocketService.getIO()?.emit(`chat:${message.chatRoomId}:message_deleted`, {
        messageId: message._id,
        chatRoomId: message.chatRoomId
      });

      res.json({ success: true, message: 'تم حذف الرسالة بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Mark all messages in room as read by current user (Read Receipts)
   */
  public static async markRoomAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { roomId } = req.params;
      const currentUserId = req.user._id;

      await ChatMessage.updateMany(
        { chatRoomId: roomId, readBy: { $ne: currentUserId } },
        { $addToSet: { readBy: currentUserId } }
      );

      SocketService.getIO()?.emit(`chat:${roomId}:read`, {
        chatRoomId: roomId,
        readByUserId: currentUserId
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}
