import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User } from '../models/User.model';
import { Invitation } from '../models/Invitation.model';
import { SocketService } from '../services/socket.service';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { AccessRole, WorkStatus } from '@lord/shared-types';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return secret;
};

export class AuthController {
  /**
   * Seed / Bootstrap Initial Super Admin Account from Environment Variables
   */
  static async seedAdmin(req: Request, res: Response): Promise<void> {
    try {
      const existingAdmin = await User.findOne({ accessRole: 'SUPER_ADMIN' });
      if (existingAdmin && process.env.NODE_ENV === 'production') {
        res.status(403).json({ success: false, error: 'Admin account already initialized' });
        return;
      }

      const email = (process.env.INITIAL_ADMIN_EMAIL || req.body?.email || 'thelordit711@gmail.com').toLowerCase();
      const password = process.env.INITIAL_ADMIN_PASSWORD || req.body?.password;

      if (!password) {
        res.status(400).json({
          success: false,
          error: 'INITIAL_ADMIN_PASSWORD environment variable or request body password is required to seed admin.'
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      if (existingAdmin) {
        existingAdmin.passwordHash = passwordHash;
        existingAdmin.accessRole = 'SUPER_ADMIN';
        existingAdmin.isOnboarded = true;
        await existingAdmin.save();
        res.json({
          success: true,
          message: 'Admin account verified & updated successfully',
          adminEmail: existingAdmin.email
        });
        return;
      }

      const newAdmin = await User.create({
        fullName: 'القائد الأعلى - إدارة THE LORD',
        email,
        passwordHash,
        phoneNumber: process.env.INITIAL_ADMIN_PHONE || '+967777286650',
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

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        res.status(401).json({ success: false, error: 'بيانات الدخول غير صحيحة أو الحساب غير موجود' });
        return;
      }

      // Check if user is suspended/banned by management
      if (user.isSuspended) {
        const reasonText = user.suspensionReason ? ` السبب: ${user.suspensionReason}` : '';
        res.status(403).json({
          success: false,
          error: `تم إيقاف هذا الحساب ومنعه من دخول المنظومة بقرار إداري.${reasonText}`
        });
        return;
      }

      if (!user.passwordHash) {
        res.status(401).json({ success: false, error: 'يرجى تسجيل الدخول عبر Kinde أو تعيين كلمة مرور للحساب' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
        return;
      }

      // Zero-Trust Two-Factor Authentication (2FA) Check
      if (user.isTwoFactorEnabled && user.twoFactorSecret) {
        const { twoFactorCode } = req.body;
        if (!twoFactorCode) {
          res.json({
            success: true,
            requiresTwoFactor: true,
            tempUserId: user._id,
            userEmail: user.email,
            message: 'هذا الحساب محمي بالتحقق الثنائي (2FA). يرجى إدخال رمز التحقق المكون من 6 أرقام.'
          });
          return;
        }

        const cleanCode = String(twoFactorCode).trim();
        const isValidTotp = authenticator.verify({
          token: cleanCode,
          secret: user.twoFactorSecret
        });

        const isRecoveryCode = user.twoFactorRecoveryCodes?.includes(cleanCode);

        if (!isValidTotp && !isRecoveryCode) {
          res.status(401).json({ success: false, error: 'رمز التحقق الثنائي (2FA) غير صحيح أو منتهي الصلاحية' });
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
        getJwtSecret(),
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

      // Attendance Session Tracking (Automatic Check-in / Check-out)
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const { AttendanceSession } = await import('../models/AttendanceSession.model');

        if (workStatus === 'WORKING' || workStatus === 'LOGGED_IN') {
          const activeSession = await AttendanceSession.findOne({
            employeeId: user._id,
            status: 'ACTIVE'
          });
          if (!activeSession) {
            await AttendanceSession.create({
              employeeId: user._id,
              checkInTime: new Date(),
              status: 'ACTIVE',
              dateStr: todayStr
            });
          }
        } else if (workStatus === 'LOGGED_OUT') {
          const activeSession = await AttendanceSession.findOne({
            employeeId: user._id,
            status: 'ACTIVE'
          });
          if (activeSession) {
            activeSession.checkOutTime = new Date();
            activeSession.status = 'CLOSED';
            const checkInMs = new Date(activeSession.checkInTime).getTime();
            const checkOutMs = new Date(activeSession.checkOutTime).getTime();
            const duration = Math.round((checkOutMs - checkInMs) / (1000 * 60));
            activeSession.totalDurationMinutes = Math.max(0, duration);
            await activeSession.save();
          }
        }
      } catch (attErr) {
        console.error('Attendance tracking error:', attErr);
      }

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
        getJwtSecret(),
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

  /**
   * Get 2FA Status for current user
   */
  static async get2FAStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مصرح' });
        return;
      }
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        return;
      }
      res.json({
        success: true,
        data: {
          isTwoFactorEnabled: !!user.isTwoFactorEnabled,
          hasRecoveryCodes: !!(user.twoFactorRecoveryCodes && user.twoFactorRecoveryCodes.length > 0)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Generate 2FA Secret & QR Code (Google Authenticator compatible)
   */
  static async generate2FASetup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مصرح' });
        return;
      }
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        return;
      }

      // Generate base32 secret
      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(user.email, 'TheLord ERP', secret);
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

      user.twoFactorTempSecret = secret;
      await user.save();

      res.json({
        success: true,
        data: {
          secret,
          qrCodeDataUrl,
          otpauth
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Enable 2FA after verifying initial TOTP code
   */
  static async enable2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مصرح' });
        return;
      }
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ success: false, error: 'يرجى إدخال رمز التحقق المكون من 6 أرقام' });
        return;
      }

      const user = await User.findById(req.user._id);
      if (!user || !user.twoFactorTempSecret) {
        res.status(400).json({ success: false, error: 'لم يتم بدء إعداد التحقق الثنائي أو انتهت صلاحية الجلسة' });
        return;
      }

      const isValid = authenticator.verify({
        token: String(code).trim(),
        secret: user.twoFactorTempSecret
      });

      if (!isValid) {
        res.status(400).json({ success: false, error: 'رمز التحقق غير صحيح. تأكد من ضبط توقيت جهازك وأعد المحاولة.' });
        return;
      }

      // Generate 6 recovery backup codes
      const recoveryCodes = Array.from({ length: 6 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      user.isTwoFactorEnabled = true;
      user.twoFactorSecret = user.twoFactorTempSecret;
      user.twoFactorTempSecret = undefined;
      user.twoFactorRecoveryCodes = recoveryCodes;
      await user.save();

      await AuditService.logAction({
        userId: user._id.toString(),
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.accessRole,
        actionType: 'SYSTEM_SECURITY_CONFIG',
        targetId: user._id.toString(),
        targetName: user.fullName,
        targetType: 'SECURITY',
        details: { action: 'ENABLED_2FA_TOTP' },
        severity: 'INFO',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'تم تفعيل التحقق الثنائي (2FA) بنجاح وحماية حسابك!',
        data: {
          recoveryCodes
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Disable 2FA
   */
  static async disable2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مصرح' });
        return;
      }
      const { password, code } = req.body;
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        return;
      }

      // Verify either password or current TOTP code for security
      let verified = false;
      if (code && user.twoFactorSecret) {
        verified = authenticator.verify({
          token: String(code).trim(),
          secret: user.twoFactorSecret
        });
      }
      if (!verified && password && user.passwordHash) {
        verified = await bcrypt.compare(password, user.passwordHash);
      }

      if (!verified) {
        res.status(400).json({ success: false, error: 'رمز التحقق أو كلمة المرور غير صحيحة لتأكيد إلغاء التفعيل' });
        return;
      }

      user.isTwoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      user.twoFactorTempSecret = undefined;
      user.twoFactorRecoveryCodes = [];
      await user.save();

      await AuditService.logAction({
        userId: user._id.toString(),
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.accessRole,
        actionType: 'SYSTEM_SECURITY_CONFIG',
        targetId: user._id.toString(),
        targetName: user.fullName,
        targetType: 'SECURITY',
        details: { action: 'DISABLED_2FA_TOTP' },
        severity: 'WARNING',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'تم تعطيل التحقق الثنائي بنجاح'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}
