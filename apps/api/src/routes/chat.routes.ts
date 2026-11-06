import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';

const router = Router();

router.use(verifyKindeJWT);

router.get('/rooms-and-members', ChatController.getRoomsAndMembers);
router.post('/channels', ChatController.createChannel);
router.get('/channels/:channelId/members', ChatController.getChannelMembers);
router.post('/channels/:channelId/members', ChatController.addChannelMember);
router.delete('/channels/:channelId/members/:userId', ChatController.removeChannelMember);
router.get('/messages/:roomId', ChatController.getMessages);
router.post('/messages', ChatController.sendMessage);
router.patch('/messages/:id', ChatController.editMessage);
router.delete('/messages/:id', ChatController.deleteMessage);
router.post('/rooms/:roomId/read', ChatController.markRoomAsRead);

export default router;

