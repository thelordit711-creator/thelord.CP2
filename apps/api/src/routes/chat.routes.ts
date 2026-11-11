import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { verifyKindeJWT } from '../middlewares/verifyKindeJWT';
import { validateBody, validateParams } from '../middlewares/validateRequest';
import {
  idParamSchema,
  channelUserParamSchema,
  createChannelSchema,
  addChannelMemberSchema,
  sendMessageSchema,
  editMessageSchema
} from '../schemas/api.schemas';

const router = Router();

router.use(verifyKindeJWT);

router.get('/rooms-and-members', ChatController.getRoomsAndMembers);
router.post('/channels', validateBody(createChannelSchema), ChatController.createChannel);
router.get('/channels/:channelId/members', ChatController.getChannelMembers);
router.post('/channels/:channelId/members', validateBody(addChannelMemberSchema), ChatController.addChannelMember);
router.delete('/channels/:channelId/members/:userId', validateParams(channelUserParamSchema), ChatController.removeChannelMember);
router.get('/messages/:roomId', ChatController.getMessages);
router.post('/messages', validateBody(sendMessageSchema), ChatController.sendMessage);
router.patch('/messages/:id', validateParams(idParamSchema), validateBody(editMessageSchema), ChatController.editMessage);
router.delete('/messages/:id', validateParams(idParamSchema), ChatController.deleteMessage);
router.post('/rooms/:roomId/read', ChatController.markRoomAsRead);

export default router;

