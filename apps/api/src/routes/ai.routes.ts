import { Router, Response } from 'express';
import { verifyKindeJWT, AuthenticatedRequest } from '../middlewares/verifyKindeJWT';
import { TheLordAIService } from '../services/theLordAI.service';

const router = Router();
router.use(verifyKindeJWT);

router.post('/chat', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ success: false, error: 'Message content is required' });
      return;
    }

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

router.post('/voice-to-task', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { transcript, audioText } = req.body;
    const text = transcript || audioText;
    if (!text || !text.trim()) {
      res.status(400).json({ success: false, error: 'النص الصوتي مطلوب لتحليله عبر الذكاء الاصطناعي' });
      return;
    }

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

router.post('/generate-project', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, budget, targetDays } = req.body;
    if (!title || !description) {
      res.status(400).json({ success: false, error: 'عنوان المشروع ووصفه مطلوبان' });
      return;
    }

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

export default router;

