import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';

const router = Router();

router.use(verifyKindeJWT);

router.get('/active', MeetingController.getActiveMeeting);
router.post('/join', MeetingController.joinMeeting);
router.post('/leave', MeetingController.leaveMeeting);
router.post('/invite', MeetingController.inviteMember);
router.post('/start', MeetingController.startMeeting);
router.post('/notes', MeetingController.updateNotes);
router.post('/convert-to-tasks', MeetingController.convertToTasks);

export default router;

