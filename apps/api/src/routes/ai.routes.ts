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

export default router;

