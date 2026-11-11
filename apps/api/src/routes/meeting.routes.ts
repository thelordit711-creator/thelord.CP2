import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { validateBody } from '../middlewares/validateRequest';
import {
  inviteMemberSchema,
  startMeetingSchema,
  updateMeetingNotesSchema,
  convertMeetingTasksSchema
} from '../schemas/api.schemas';

const router = Router();

router.use(verifyKindeJWT);

router.get('/active', MeetingController.getActiveMeeting);
router.post('/join', MeetingController.joinMeeting);
router.post('/leave', MeetingController.leaveMeeting);
router.post('/invite', validateBody(inviteMemberSchema), MeetingController.inviteMember);
router.post('/start', validateBody(startMeetingSchema), MeetingController.startMeeting);
router.post('/notes', validateBody(updateMeetingNotesSchema), MeetingController.updateNotes);
router.post('/convert-to-tasks', validateBody(convertMeetingTasksSchema), MeetingController.convertToTasks);

export default router;

