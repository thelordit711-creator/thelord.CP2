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
}

