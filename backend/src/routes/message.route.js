import express from 'express';
import { getAllContacts,getMessagesByUserId,sendMessage, getChatPartners } from '../controllers/message.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { arcjetProtection } from '../middleware/arcjet.middleware.js';

const router = express.Router();

router.use(arcjetProtection,protectRoute);

//the middleware execute in order - so requests het rate-limited and authenticated first
// this is actually more efficient than adding the middleware to each route individually

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);

export default router;  