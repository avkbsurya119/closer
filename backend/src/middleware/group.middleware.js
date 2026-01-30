import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";

// Helper function to get member info from group
const getMemberInfo = (group, userId) => {
  return group.members.find((m) => m.user.toString() === userId.toString());
};

// Check if user is a member of the group
export const isMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const member = getMemberInfo(group, userId);
    if (!member) {
      return res.status(403).json({ message: "Access denied - Not a member of this group" });
    }

    req.group = group;
    req.memberRole = member.role;
    next();
  } catch (error) {
    console.log("Error in isMember middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Check if user is admin or creator of the group
export const isAdminOrCreator = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const member = getMemberInfo(group, userId);
    if (!member) {
      return res.status(403).json({ message: "Access denied - Not a member of this group" });
    }

    if (member.role !== "admin" && member.role !== "creator") {
      return res.status(403).json({ message: "Access denied - Admin or Creator role required" });
    }

    req.group = group;
    req.memberRole = member.role;
    next();
  } catch (error) {
    console.log("Error in isAdminOrCreator middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Check if user is the creator of the group
export const isCreator = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const member = getMemberInfo(group, userId);
    if (!member || member.role !== "creator") {
      return res.status(403).json({ message: "Access denied - Creator role required" });
    }

    req.group = group;
    req.memberRole = member.role;
    next();
  } catch (error) {
    console.log("Error in isCreator middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Ensure user is not the creator (for leave group - creator must delete instead)
export const notCreator = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const member = getMemberInfo(group, userId);
    if (!member) {
      return res.status(403).json({ message: "Access denied - Not a member of this group" });
    }

    if (member.role === "creator") {
      return res.status(403).json({ message: "Creator cannot leave the group. Delete the group instead." });
    }

    req.group = group;
    req.memberRole = member.role;
    next();
  } catch (error) {
    console.log("Error in notCreator middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Check if user can delete a specific message
// Creator/Admin can delete any message, Member can only delete their own
export const canDeleteMessage = async (req, res, next) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const member = getMemberInfo(group, userId);
    if (!member) {
      return res.status(403).json({ message: "Access denied - Not a member of this group" });
    }

    const message = await GroupMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.groupId.toString() !== groupId) {
      return res.status(400).json({ message: "Message does not belong to this group" });
    }

    // Creator and Admin can delete any message
    if (member.role === "creator" || member.role === "admin") {
      req.group = group;
      req.memberRole = member.role;
      req.messageToDelete = message;
      return next();
    }

    // Member can only delete their own message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Access denied - You can only delete your own messages" });
    }

    req.group = group;
    req.memberRole = member.role;
    req.messageToDelete = message;
    next();
  } catch (error) {
    console.log("Error in canDeleteMessage middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
