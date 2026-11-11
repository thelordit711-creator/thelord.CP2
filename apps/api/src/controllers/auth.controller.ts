import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { User } from '../models/User.model';
import { Invitation } from '../models/Invitation.model';
import { SocketService } from '../services/socket.service';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { AccessRole, WorkStatus } from '@lord/shared-types';
import { logger } from '../utils/logger';
import { clearAuthCookie, getJwtSecret, setAuthCookie } from '../utils/authCookie';
import { AuthTwoFactorController } from './authTwoFactor.controller';

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

      // 1. Account Lockout Protection (Brute Force Defense)
      if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
        res.status(429).json({
          success: false,
          error: `تم قفل الحساب مؤقتاً لحمايته بسبب تكرار محاولات الدخول الخاطئة. يرجى المحاولة بعد ${remainingMinutes} دقيقة.`
        });
        return;
      }

      // 2. Check if user is suspended/banned by management
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
        const attempts = (user.failedLoginAttempts || 0) + 1;
        user.failedLoginAttempts = attempts;
        if (attempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
          await user.save();
          logger.security(`Account locked due to 5 failed login attempts: ${user.email}`);
          res.status(429).json({
            success: false,
            error: 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول (5 محاولات). تم قفل الحساب لمدة 15 دقيقة لدواعي الأمان.'
          });
          return;
        }
        await user.save();
        const remaining = 5 - attempts;
        res.status(401).json({
          success: false,
          error: `كلمة المرور غير صحيحة. متبقي ${remaining} محاولات قبل قفل الحساب مؤقتاً.`
        });
        return;
      }

      // Password matches -> reset failed attempts and unlock
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;

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

      // Set HttpOnly Secure SameSite Cookie
      setAuthCookie(res, token);

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
   * Secure Logout - Clears HttpOnly Cookie and updates work presence
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      clearAuthCookie(res);

      if (req.user) {
        const user = await User.findById(req.user._id);
        if (user) {
          user.workStatus = 'LOGGED_OUT';
          user.workStatusUpdatedAt = new Date();
          user.presenceStatus = 'OFFLINE';
          await user.save();

          SocketService.getIO()?.emit('STAFF_STATUS_CHANGED', {
            userId: user._id,
            fullName: user.fullName,
            email: user.email,
            accessRole: user.accessRole,
            workStatus: user.workStatus,
            workStatusUpdatedAt: user.workStatusUpdatedAt,
            presenceStatus: user.presenceStatus
          });
        }
      }

      res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
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

      setAuthCookie(res, authToken);

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
   * 2FA Management (delegated to AuthTwoFactorController)
   */
  static get2FAStatus = AuthTwoFactorController.get2FAStatus;
  static generate2FASetup = AuthTwoFactorController.generate2FASetup;
  static enable2FA = AuthTwoFactorController.enable2FA;
  static disable2FA = AuthTwoFactorController.disable2FA;
}
