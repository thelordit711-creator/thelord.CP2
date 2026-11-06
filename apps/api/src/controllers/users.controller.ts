import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { User } from '../models/User.model';
import { ValidationService } from '../services/validation.service';
import { ICompleteOnboardingDto } from '@lord/shared-types';

export class UsersController {
  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user && req.kindeUser) {
        // First time entering after Kinde sign in
        let user = await User.findOne({ kindeId: req.kindeUser.id });
        if (!user) {
          user = await User.create({
            kindeId: req.kindeUser.id,
            fullName: `${req.kindeUser.given_name || ''} ${req.kindeUser.family_name || ''}`.trim() || 'New Member',
            email: req.kindeUser.email || 'user@thelordofcrypto.com',
            phoneNumber: '',
            accessRole: 'EMPLOYEE',
            isOnboarded: false
          });
        }
        res.json({ success: true, data: user });
        return;
      }

      res.json({ success: true, data: req.user });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async completeOnboarding(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const kindeId = req.user?.kindeId || req.kindeUser?.id;
      if (!kindeId) {
        res.status(401).json({ success: false, error: 'Unauthorized session' });
        return;
      }

      const body = req.body as ICompleteOnboardingDto;

      // Validate BEP20 if enabled/provided
      if (body.payoutMethods?.bep20Address) {
        if (!ValidationService.isValidBEP20Address(body.payoutMethods.bep20Address)) {
          res.status(400).json({ 
            success: false, 
            error: 'Invalid BEP20 address. Must be a valid 40-character hex address starting with 0x' 
          });
          return;
        }
      }

      // Validate Jeeb Wallet phone if enabled
      if (body.payoutMethods?.jeebWallet?.isEnabled) {
        const jeebPhone = body.payoutMethods.jeebWallet.registeredPhone;
        if (!ValidationService.isValidLocalWalletPhone(jeebPhone)) {
          res.status(400).json({ 
            success: false, 
            error: 'Invalid phone number for Jeeb Wallet (محفظة جيب). Must be a valid 9-digit mobile number.' 
          });
          return;
        }
        body.payoutMethods.jeebWallet.registeredPhone = ValidationService.sanitizeLocalPhone(jeebPhone!);
      }

      // Validate Jawali Wallet phone if enabled
      if (body.payoutMethods?.jawaliWallet?.isEnabled) {
        const jawaliPhone = body.payoutMethods.jawaliWallet.registeredPhone;
        if (!ValidationService.isValidLocalWalletPhone(jawaliPhone)) {
          res.status(400).json({ 
            success: false, 
            error: 'Invalid phone number for Jawali Wallet (محفظة جوالي). Must be a valid 9-digit mobile number.' 
          });
          return;
        }
        body.payoutMethods.jawaliWallet.registeredPhone = ValidationService.sanitizeLocalPhone(jawaliPhone!);
      }

      const updatedUser = await User.findOneAndUpdate(
        { kindeId },
        {
          primaryDepartment: body.primaryDepartment,
          jobTitles: body.jobTitles,
          skills: body.skills,
          toolsUsed: body.toolsUsed,
          capableTaskTypes: body.capableTaskTypes,
          payoutMethods: body.payoutMethods,
          isOnboarded: true
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Onboarding completed successfully',
        data: updatedUser
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async getAllEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employees = await User.find({ accessRole: { $ne: 'TREASURY' } }).sort({ createdAt: -1 });
      res.json({ success: true, data: employees });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  public static async getEmployeeDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await User.findById(id);
      if (!employee) {
        res.status(404).json({ success: false, error: 'Employee not found' });
        return;
      }
      res.json({ success: true, data: employee });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Update current user profile (Wallets, phone number, avatar)
   */
  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مسجل' });
        return;
      }

      const { phoneNumber, avatarUrl, payoutMethods } = req.body;
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
        return;
      }

      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
      if (payoutMethods) {
        if (payoutMethods.bep20Address !== undefined) {
          user.payoutMethods.bep20Address = payoutMethods.bep20Address;
        }
        if (payoutMethods.preferredMethod) {
          user.payoutMethods.preferredMethod = payoutMethods.preferredMethod;
        }
        if (payoutMethods.jeebWallet) {
          user.payoutMethods.jeebWallet = {
            ...user.payoutMethods.jeebWallet,
            ...payoutMethods.jeebWallet
          };
        }
        if (payoutMethods.jawaliWallet) {
          user.payoutMethods.jawaliWallet = {
            ...user.payoutMethods.jawaliWallet,
            ...payoutMethods.jawaliWallet
          };
        }
      }

      await user.save();

      res.json({
        success: true,
        data: user,
        message: 'تم تحديث الملف الشخصي وبيانات المحافظ بنجاح! 💾'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Automated 3-Factor Leaderboard Scoring Engine
   * Total Score = (C * 40) + (S * 30) + (Q * 30)
   */
  public static async getLeaderboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { Task } = await import('../models/Task.model');
      const employees = await User.find({ accessRole: 'EMPLOYEE' })
        .select('_id fullName email primaryDepartment jobTitles avatarUrl presenceStatus');

      const allTasks = await Task.find({}).select('assignedTo status dueDate stages createdAt');

      const leaderboard = employees.map(emp => {
        const empId = emp._id.toString();
        const empTasks = allTasks.filter(t => t.assignedTo.some((id: any) => id.toString() === empId));
        const totalAssigned = empTasks.length;
        const completedTasks = empTasks.filter(t => t.status === 'COMPLETED');
        const completedCount = completedTasks.length;

        // Factor C: Completion Rate (0 - 100)
        const C = totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 100;

        // Factor S: Speed Efficiency (Completed before or on dueDate)
        let onTimeCount = 0;
        completedTasks.forEach(t => {
          if (!t.dueDate) {
            onTimeCount++;
          } else {
            const due = new Date(t.dueDate).getTime();
            const created = new Date(t.createdAt).getTime();
            // If completed reasonably within deadline
            if (Date.now() <= due || due > created) {
              onTimeCount++;
            }
          }
        });
        const S = completedCount > 0 ? (onTimeCount / completedCount) * 100 : 90;

        // Factor Q: Quality & First-Time Approval Rate
        let approvedStages = 0;
        let totalReviewedStages = 0;
        empTasks.forEach(t => {
          (t.stages || []).forEach(st => {
            if (st.status === 'APPROVED') {
              approvedStages++;
              totalReviewedStages++;
            } else if (st.status === 'NEEDS_REVISION') {
              totalReviewedStages++;
            }
          });
        });
        const Q = totalReviewedStages > 0 ? (approvedStages / totalReviewedStages) * 100 : 95;

        // Master 3-Factor Formula
        const totalScore = Math.min(100, Math.round((C * 0.4) + (S * 0.3) + (Q * 0.3)));

        return {
          user: emp,
          stats: {
            totalAssigned,
            completedCount,
            completionRate: Math.round(C),
            speedRate: Math.round(S),
            qualityRate: Math.round(Q),
            totalScore
          }
        };
      });

      // Sort by totalScore descending
      leaderboard.sort((a, b) => b.stats.totalScore - a.stats.totalScore);

      // Add ranks (1: Gold, 2: Silver, 3: Bronze, etc.)
      const ranked = leaderboard.map((item, index) => ({
        rank: index + 1,
        badge: index === 0 ? 'GOLD_MEDAL' : index === 1 ? 'SILVER_MEDAL' : index === 2 ? 'BRONZE_MEDAL' : 'MEMBER',
        ...item
      }));

      res.json({
        success: true,
        data: ranked
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * System Settings: Get
   */
  public static async getSystemSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { SystemSettings } = await import('../models/SystemSettings.model');
      let settings = await SystemSettings.findOne();
      if (!settings) {
        settings = await SystemSettings.create({});
      }
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * System Settings: Update (Admin only)
   */
  public static async updateSystemSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.accessRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'صلاحية تعديل إعدادات المنظومة للإدارة فقط' });
        return;
      }

      const { SystemSettings } = await import('../models/SystemSettings.model');
      let settings = await SystemSettings.findOne();
      if (!settings) {
        settings = await SystemSettings.create({ ...req.body, updatedBy: req.user._id });
      } else {
        Object.assign(settings, req.body, { updatedBy: req.user._id });
        await settings.save();
      }

      res.json({
        success: true,
        data: settings,
        message: 'تم حفظ إعدادات المنظومة بنجاح! ⚙️'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

