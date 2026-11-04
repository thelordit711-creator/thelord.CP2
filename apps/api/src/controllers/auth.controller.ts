import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { Invitation } from '../models/Invitation.model';
import { SocketService } from '../services/socket.service';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { AccessRole, WorkStatus } from '@lord/shared-types';

const JWT_SECRET = process.env.JWT_SECRET || 'THE_LORD_OF_CRYPTO_SUPER_SECRET_JWT_KEY_2026_X99';

export class AuthController {
  /**
   * Seed Super Admin Account: thelordit711@gmail.com / thelord777286650
   */
  static async seedAdmin(req: Request, res: Response): Promise<void> {
    try {
      const email = 'thelordit711@gmail.com';
      const password = 'thelord777286650';

      const existingAdmin = await User.findOne({ email: email.toLowerCase() });
      const passwordHash = await bcrypt.hash(password, 10);

      if (existingAdmin) {
        existingAdmin.passwordHash = passwordHash;
        existingAdmin.accessRole = 'SUPER_ADMIN';
        existingAdmin.isOnboarded = true;
        await existingAdmin.save();
        res.json({
          success: true,
          message: 'Admin account verified & updated successfully',
          adminEmail: email
        });
        return;
      }

      const newAdmin = await User.create({
        fullName: 'القائد الأعلى - إدارة THE LORD',
        email: email.toLowerCase(),
        passwordHash,
        phoneNumber: '+967777286650',
        accessRole: 'SUPER_ADMIN',
        isOnboarded: true,
        workStatus: 'LOGGED_OUT',
        presenceStatus: 'ONLINE',
        jobTitles: ['MARKETING_DEV_LEAD'],
        primaryDepartment: 'MANAGEMENT',
        skills: [{ name: 'Executive Management & Quantitative Trading', level: 'EXPERT' }],
        payoutMethods: {
          preferredMethod: 'BEP20_USDT',
          bep20Address: '0x000000000000000000000000000000000000dEaD',
          jeebWallet: { isEnabled: true, registeredPhone: '+967777286650', accountHolderName: 'The Lord Master' },
          jawaliWallet: { isEnabled: true, registeredPhone: '+967777286650', accountHolderName: 'The Lord Master' }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Admin account seeded successfully',
        adminEmail: newAdmin.email
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Direct Credential Login (Admin / Employee / Treasury)
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
        return;
      }

      // Special initial bootstrap check for the admin credentials
      if (email.toLowerCase() === 'thelordit711@gmail.com' && password === 'thelord777286650') {
        let adminUser = await User.findOne({ email: email.toLowerCase() });
        if (!adminUser) {
          const passwordHash = await bcrypt.hash(password, 10);
          adminUser = await User.create({
            fullName: 'القائد الأعلى - إدارة THE LORD',
            email: email.toLowerCase(),
            passwordHash,
            phoneNumber: '+967777286650',
            accessRole: 'SUPER_ADMIN',
            isOnboarded: true,
            workStatus: 'LOGGED_IN',
            workStatusUpdatedAt: new Date(),
            presenceStatus: 'ONLINE',
            jobTitles: ['MARKETING_DEV_LEAD'],
            primaryDepartment: 'MANAGEMENT',
            skills: [{ name: 'Executive Management & Trading', level: 'EXPERT' }]
          });
        }
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        res.status(401).json({ success: false, error: 'بيانات الدخول غير صحيحة أو الحساب غير موجود' });
        return;
      }

      if (user.passwordHash) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
          return;
        }
      } else {
        // Fallback for bootstrap admin if passwordHash wasn't set yet
        if (email.toLowerCase() === 'thelordit711@gmail.com' && password === 'thelord777286650') {
          user.passwordHash = await bcrypt.hash(password, 10);
        } else {
          res.status(401).json({ success: false, error: 'يرجى تسجيل الدخول عبر Kinde أو تعيين كلمة مرور' });
          return;
        }
      }

      // Update workStatus to LOGGED_IN upon login
      user.workStatus = 'LOGGED_IN';
      user.workStatusUpdatedAt = new Date();
      user.presenceStatus = 'ONLINE';
      user.lastActiveAt = new Date();
      await user.save();

      // Emit live status update to all connected clients
      SocketService.getIO()?.emit('STAFF_STATUS_CHANGED', {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        accessRole: user.accessRole,
        workStatus: user.workStatus,
        workStatusUpdatedAt: user.workStatusUpdatedAt,
        presenceStatus: user.presenceStatus
      });

      const token = jwt.sign(
        { userId: user._id, email: user.email, accessRole: user.accessRole },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          accessRole: user.accessRole,
          workStatus: user.workStatus,
          workStatusUpdatedAt: user.workStatusUpdatedAt,
          isOnboarded: user.isOnboarded,
          avatarUrl: user.avatarUrl,
          primaryDepartment: user.primaryDepartment,
          jobTitles: user.jobTitles,
          payoutMethods: user.payoutMethods
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Update Employee Work Status: 'LOGGED_IN' | 'WORKING' | 'ON_BREAK' | 'LOGGED_OUT'
   */
  static async updateWorkStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { workStatus } = req.body as { workStatus: WorkStatus };
      const validStatuses: WorkStatus[] = ['LOGGED_IN', 'WORKING', 'ON_BREAK', 'LOGGED_OUT'];

      if (!validStatuses.includes(workStatus)) {
        res.status(400).json({ success: false, error: 'حالة العمل غير صالحة' });
        return;
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        return;
      }

      user.workStatus = workStatus;
      user.workStatusUpdatedAt = new Date();
      user.lastActiveAt = new Date();
      if (workStatus === 'LOGGED_OUT') {
        user.presenceStatus = 'OFFLINE';
      } else {
        user.presenceStatus = 'ONLINE';
      }

      await user.save();

      // Emit live real-time update
      SocketService.getIO()?.emit('STAFF_STATUS_CHANGED', {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        accessRole: user.accessRole,
        workStatus: user.workStatus,
        workStatusUpdatedAt: user.workStatusUpdatedAt,
        presenceStatus: user.presenceStatus
      });

      res.json({
        success: true,
        message: 'تم تحديث حالة العمل بنجاح',
        workStatus: user.workStatus,
        workStatusUpdatedAt: user.workStatusUpdatedAt
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Admin Invites Employee or Treasury
   */
  static async createInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'هذا الإجراء مخصص للمسؤول التنفيذي فقط' });
        return;
      }

      const { email, role } = req.body as { email: string; role: AccessRole };
      if (!email || !role || !['EMPLOYEE', 'TREASURY'].includes(role)) {
        res.status(400).json({ success: false, error: 'البريد الإلكتروني وتحديد الدور (موظف أو صندوق) مطلوبان' });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ success: false, error: 'المستخدم مسجل بالفعل في النظام بهذا البريد' });
        return;
      }

      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await Invitation.findOneAndUpdate(
        { email: email.toLowerCase() },
        {
          email: email.toLowerCase(),
          role,
          token,
          status: 'PENDING',
          invitedBy: req.user._id,
          expiresAt
        },
        { upsert: true, new: true }
      );

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const inviteUrl = `${clientUrl}/ar/register?token=${token}&role=${role}`;

      res.status(201).json({
        success: true,
        message: 'تم إنشاء رابط الدعوة بنجاح وإرساله للموظف',
        inviteUrl,
        email: email.toLowerCase(),
        role,
        expiresAt
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Verify an invitation token before showing registration form
   */
  static async verifyInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const invitation = await Invitation.findOne({ token, status: 'PENDING' });

      if (!invitation) {
        res.status(404).json({ success: false, error: 'رابط الدعوة غير صالح أو تم استخدامه مسبقاً' });
        return;
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        res.status(410).json({ success: false, error: 'عذراً، انتهت صلاحية رابط الدعوة' });
        return;
      }

      res.json({
        success: true,
        email: invitation.email,
        role: invitation.role
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Complete Registration from Invitation
   */
  static async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const {
        token,
        password,
        fullName,
        phoneNumber,
        primaryDepartment,
        jobTitles,
        skills,
        toolsUsed,
        payoutMethods
      } = req.body;

      const invitation = await Invitation.findOne({ token, status: 'PENDING' });
      if (!invitation) {
        res.status(400).json({ success: false, error: 'الدعوة غير صالحة أو تم تفعيلها' });
        return;
      }

      if (!fullName || !password) {
        res.status(400).json({ success: false, error: 'الاسم الكامل وكلمة المرور مطلوبان' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        kindeId: `lord_${crypto.randomBytes(12).toString('hex')}`,
        fullName,
        email: invitation.email.toLowerCase(),
        passwordHash,
        phoneNumber: phoneNumber || '',
        accessRole: invitation.role,
        isOnboarded: true,
        workStatus: 'LOGGED_IN',
        workStatusUpdatedAt: new Date(),
        presenceStatus: 'ONLINE',
        primaryDepartment: primaryDepartment || (invitation.role === 'TREASURY' ? 'MANAGEMENT' : 'DEVELOPMENT'),
        jobTitles: jobTitles || [],
        skills: skills || [],
        toolsUsed: toolsUsed || [],
        payoutMethods: payoutMethods || {
          preferredMethod: 'BEP20_USDT',
          jeebWallet: { isEnabled: false },
          jawaliWallet: { isEnabled: false }
        }
      });

      invitation.status = 'ACCEPTED';
      await invitation.save();

      // Emit live status update
      SocketService.getIO()?.emit('STAFF_STATUS_CHANGED', {
        userId: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        accessRole: newUser.accessRole,
        workStatus: newUser.workStatus,
        workStatusUpdatedAt: newUser.workStatusUpdatedAt,
        presenceStatus: newUser.presenceStatus
      });

      const authToken = jwt.sign(
        { userId: newUser._id, email: newUser.email, accessRole: newUser.accessRole },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        message: 'تم التسجيل وتفعيل الحساب بنجاح',
        token: authToken,
        user: {
          _id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          accessRole: newUser.accessRole,
          workStatus: newUser.workStatus,
          isOnboarded: newUser.isOnboarded
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Real-time Staff Statuses for Super Admin Monitoring
   */
  static async getStaffStatuses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'مخصص للمسؤول التنفيذي فقط' });
        return;
      }

      const staff = await User.find({ accessRole: { $ne: 'SUPER_ADMIN' } })
        .select('fullName email accessRole primaryDepartment jobTitles workStatus workStatusUpdatedAt presenceStatus lastActiveAt avatarUrl')
        .sort({ workStatusUpdatedAt: -1 });

      res.json({
        success: true,
        data: staff
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Get Current Session User
   */
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }
      res.json({ success: true, user: req.user });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}
