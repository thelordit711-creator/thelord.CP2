import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User } from '../models/User.model';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';

/**
 * Dedicated controller for TOTP 2FA setup, verification, and lifecycle management.
 */
export class AuthTwoFactorController {
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
        data: { recoveryCodes }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

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

