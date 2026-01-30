import express from "express";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMember,
  updateMemberRole,
  leaveGroup,
  getGroupMessages,
  sendGroupMessage,
  deleteGroupMessage,
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import {
  isMember,
  isAdminOrCreator,
  isCreator,
  notCreator,
  canDeleteMessage,
} from "../middleware/group.middleware.js";

const router = express.Router();

// Apply rate limiting and authentication to all routes
router.use(arcjetProtection, protectRoute);

// Group CRUD operations
router.post("/", createGroup);
router.get("/", getMyGroups);
router.get("/:groupId", isMember, getGroupById);
router.put("/:groupId", isCreator, updateGroup);
router.delete("/:groupId", isCreator, deleteGroup);

// Member management
router.post("/:groupId/members", isAdminOrCreator, addMembers);
router.delete("/:groupId/members/:userId", isAdminOrCreator, removeMember);
router.put("/:groupId/members/:userId/role", isAdminOrCreator, updateMemberRole);
router.post("/:groupId/leave", notCreator, leaveGroup);

// Group messages
router.get("/:groupId/messages", isMember, getGroupMessages);
router.post("/:groupId/messages", isMember, sendGroupMessage);
router.delete("/:groupId/messages/:messageId", canDeleteMessage, deleteGroupMessage);

export default router;
