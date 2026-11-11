import { Router, Response } from 'express';
import { verifyKindeJWT, AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { TheLordAIService } from '../services/theLordAI.service';
import { validateBody } from '../middlewares/validateRequest';
import {
  aiChatSchema,
  aiVoiceToTaskSchema,
  aiGenerateProjectPlanSchema,
  aiQualityReviewSchema,
  aiSummarizeMeetingSchema
} from '../schemas/api.schemas';

const router = Router();
router.use(verifyKindeJWT);

router.post('/chat', validateBody(aiChatSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;

    const role = req.user?.accessRole || 'EMPLOYEE';
    const userId = req.user?._id?.toString() || 'anonymous';

    const reply = await TheLordAIService.chat(message, role, userId, history);

    res.json({
      success: true,
      data: { reply }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/voice-to-task', validateBody(aiVoiceToTaskSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { transcript, audioText } = req.body;
    const text = (transcript || audioText || '').trim();

    const { User } = await import('../models/User.model');
    const members = await User.find({}).select('_id fullName primaryDepartment jobTitles');
    const teamFormatted = members.map(m => ({
      _id: m._id.toString(),
      fullName: m.fullName,
      department: m.primaryDepartment
    }));

    const result = await TheLordAIService.parseVoiceToTask({
      audioTranscriptOrText: text.trim(),
      existingTeamMembers: teamFormatted
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/generate-project', validateBody(aiGenerateProjectPlanSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, budget, targetDays } = req.body;

    const { User } = await import('../models/User.model');
    const members = await User.find({}).select('_id fullName primaryDepartment jobTitles');
    const teamFormatted = members.map(m => ({
      _id: m._id.toString(),
      fullName: m.fullName,
      department: m.primaryDepartment,
      jobTitles: m.jobTitles
    }));

    const result = await TheLordAIService.generateProjectPlan({
      title,
      description,
      budget: budget ? Number(budget) : 1000,
      targetDays: targetDays ? Number(targetDays) : 14,
      teamMembers: teamFormatted
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/quality-review', validateBody(aiQualityReviewSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskTitle, stageTitle, submissionText, attachmentsCount } = req.body;

    const result = await TheLordAIService.reviewTaskSubmissionQuality({
      taskTitle: taskTitle || 'مهمة بدون عنوان',
      stageTitle: stageTitle || 'مرحلة تنفيذية',
      submissionText,
      attachmentsCount: Number(attachmentsCount) || 0
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/summarize-meeting', validateBody(aiSummarizeMeetingSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { meetingTitle, notesOrTranscript } = req.body;

    const result = await TheLordAIService.summarizeMeeting({
      meetingTitle: meetingTitle || 'اجتماع تنفيذي',
      notesOrTranscript
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/cashflow-forecast', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { CompanyVault } = await import('../models/CompanyVault.model');
    const { RecurringExpense } = await import('../models/RecurringExpense.model');
    const { User } = await import('../models/User.model');

    const vault = await CompanyVault.findOne({});
    const recurring = await RecurringExpense.find({ isActive: true });
    const employees = await User.find({ isSuspended: { $ne: true } });

    const totalSubscriptions = recurring.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalPayroll = employees.reduce((sum, e) => sum + (e.compensation?.baseSalary || 0), 0);

    const forecast = await TheLordAIService.generateCashflowForecast({
      generalBudget: vault?.generalBudget || 0,
      treasuryBalance: vault?.treasuryBalance || 0,
      committedPayroll: totalPayroll,
      committedSubscriptions: totalSubscriptions
    });

    res.json({ success: true, data: forecast });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;

