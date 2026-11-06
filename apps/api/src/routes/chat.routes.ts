import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';

const router = Router();

router.use(verifyKindeJWT);

router.get('/rooms-and-members', ChatController.getRoomsAndMembers);
router.post('/channels', ChatController.createChannel);
router.get('/messages/:roomId', ChatController.getMessages);
router.post('/messages', ChatController.sendMessage);

export default router;

