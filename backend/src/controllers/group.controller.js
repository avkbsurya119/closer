import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";

// Helper function to emit to all group members
const emitToGroupMembers = (group, event, data, excludeUserId = null) => {
  group.members.forEach((member) => {
    // Handle both populated (object) and unpopulated (ObjectId) user field
    const memberId = member.user?._id?.toString() || member.user?.toString();
    if (!memberId) return;

    if (excludeUserId && memberId === excludeUserId.toString()) {
      return;
    }
    const socketId = getReceiverSocketId(memberId);
    if (socketId) {
      io.to(socketId).emit(event, data);
    }
  });
};

// Helper function to create and emit system notification message
const createSystemNotification = async (groupId, text, systemAction, group) => {
  const systemMessage = new GroupMessage({
    groupId,
    text,
    type: "system",
    systemAction,
  });

  await systemMessage.save();

  // Emit to all group members
  emitToGroupMembers(group, "newGroupMessage", {
    groupId,
    message: systemMessage,
  });

  return systemMessage;
};

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, icon, memberIds } = req.body;
    const creatorId = req.user._id;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: "Group name must be at least 3 characters" });
    }

    // Upload icon if provided
    let iconUrl = "";
    if (icon) {
      const uploadResponse = await cloudinary.uploader.upload(icon);
      iconUrl = uploadResponse.secure_url;
    }

    // Initialize members array with creator
    const members = [
      {
        user: creatorId,
        role: "creator",
        joinedAt: new Date(),
      },
    ];

    // Add other members if provided
    if (memberIds && Array.isArray(memberIds)) {
      // Verify all member IDs are valid users
      const validUsers = await User.find({ _id: { $in: memberIds } }).select("_id");
      const validUserIds = validUsers.map((u) => u._id.toString());

      memberIds.forEach((memberId) => {
        if (memberId !== creatorId.toString() && validUserIds.includes(memberId)) {
          members.push({
            user: memberId,
            role: "member",
            joinedAt: new Date(),
          });
        }
      });
    }

    const newGroup = new Group({
      name: name.trim(),
      description: description?.trim() || "",
      icon: iconUrl,
      members,
      createdBy: creatorId,
    });

    await newGroup.save();

    // Populate member details for response
    await newGroup.populate("members.user", "fullName email profilePic");

    // Notify all members about the new group
    emitToGroupMembers(newGroup, "groupCreated", newGroup, creatorId);

    res.status(201).json(newGroup);
  } catch (error) {
    console.log("Error in createGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all groups the user is a member of
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ "members.user": userId })
      .populate("members.user", "fullName email profilePic")
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.log("Error in getMyGroups:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single group by ID
export const getGroupById = async (req, res) => {
  try {
    // req.group is set by isMember middleware
    const group = await Group.findById(req.group._id).populate(
      "members.user",
      "fullName email profilePic"
    );

    res.status(200).json(group);
  } catch (error) {
    console.log("Error in getGroupById:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update group settings (creator only)
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, icon } = req.body;

    const updateData = {};

    if (name) {
      if (name.trim().length < 3) {
        return res.status(400).json({ message: "Group name must be at least 3 characters" });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (icon) {
      const uploadResponse = await cloudinary.uploader.upload(icon);
      updateData.icon = uploadResponse.secure_url;
    }

    const updatedGroup = await Group.findByIdAndUpdate(groupId, updateData, { new: true }).populate(
      "members.user",
      "fullName email profilePic"
    );

    // Notify all members about the update
    emitToGroupMembers(updatedGroup, "groupUpdated", updatedGroup);

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in updateGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete group (creator only)
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = req.group;

    // Delete all messages in the group
    await GroupMessage.deleteMany({ groupId });

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    // Notify all members about deletion
    emitToGroupMembers(group, "groupDeleted", { groupId });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.log("Error in deleteGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add members to group (admin or creator)
export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const addedBy = req.user;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "Please provide member IDs to add" });
    }

    const group = await Group.findById(groupId);
    const existingMemberIds = group.members.map((m) => m.user.toString());

    // Verify all member IDs are valid users
    const validUsers = await User.find({ _id: { $in: memberIds } }).select("_id fullName");
    const validUserMap = new Map(validUsers.map((u) => [u._id.toString(), u.fullName]));

    const newMembers = [];
    const addedNames = [];
    memberIds.forEach((memberId) => {
      if (!existingMemberIds.includes(memberId) && validUserMap.has(memberId)) {
        newMembers.push({
          user: memberId,
          role: "member",
          joinedAt: new Date(),
        });
        addedNames.push(validUserMap.get(memberId));
      }
    });

    if (newMembers.length === 0) {
      return res.status(400).json({ message: "No new valid members to add" });
    }

    group.members.push(...newMembers);
    await group.save();

    await group.populate("members.user", "fullName email profilePic");

    // Create system notification
    const namesText = addedNames.join(", ");
    const notificationText = `${addedBy.fullName} added ${namesText} to the group`;
    await createSystemNotification(groupId, notificationText, "member_added", group);

    // Notify existing members about new members
    emitToGroupMembers(group, "membersAdded", {
      groupId,
      newMembers: newMembers.map((m) => m.user),
      group,
    });

    res.status(200).json(group);
  } catch (error) {
    console.log("Error in addMembers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove a member from group (admin or creator)
// Admins can remove other admins, but nobody can remove the creator
export const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const removedBy = req.user;

    const group = await Group.findById(groupId);

    const memberToRemove = group.members.find((m) => m.user.toString() === userId);
    if (!memberToRemove) {
      return res.status(404).json({ message: "User is not a member of this group" });
    }

    // Cannot remove the creator
    if (memberToRemove.role === "creator") {
      return res.status(403).json({ message: "Cannot remove the group creator" });
    }

    // Get removed user's name before removing
    const removedUser = await User.findById(userId).select("fullName");
    const removedUserName = removedUser?.fullName || "A member";

    group.members = group.members.filter((m) => m.user.toString() !== userId);
    await group.save();

    await group.populate("members.user", "fullName email profilePic");

    // Create system notification
    const notificationText = `${removedBy.fullName} removed ${removedUserName} from the group`;
    await createSystemNotification(groupId, notificationText, "member_removed", group);

    // Notify the removed user
    const removedUserSocketId = getReceiverSocketId(userId);
    if (removedUserSocketId) {
      io.to(removedUserSocketId).emit("removedFromGroup", { groupId });
    }

    // Notify remaining members
    emitToGroupMembers(group, "memberRemoved", { groupId, userId, group });

    res.status(200).json(group);
  } catch (error) {
    console.log("Error in removeMember:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update member role (admin or creator)
// Admins can promote/demote other members and admins, but cannot change the creator's role
export const updateMemberRole = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { role } = req.body;
    const changedBy = req.user;

    if (!role || !["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'member'" });
    }

    const group = await Group.findById(groupId);

    const memberIndex = group.members.findIndex((m) => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ message: "User is not a member of this group" });
    }

    // Cannot change creator's role
    if (group.members[memberIndex].role === "creator") {
      return res.status(403).json({ message: "Cannot change the creator's role" });
    }

    const previousRole = group.members[memberIndex].role;
    group.members[memberIndex].role = role;
    await group.save();

    await group.populate("members.user", "fullName email profilePic");

    // Get changed user's name
    const changedUser = await User.findById(userId).select("fullName");
    const changedUserName = changedUser?.fullName || "A member";

    // Create system notification
    const isPromotion = role === "admin" && previousRole === "member";
    const actionText = isPromotion ? "promoted" : "demoted";
    const roleText = isPromotion ? "admin" : "member";
    const notificationText = `${changedBy.fullName} ${actionText} ${changedUserName} to ${roleText}`;
    const systemAction = isPromotion ? "member_promoted" : "member_demoted";
    await createSystemNotification(groupId, notificationText, systemAction, group);

    // Notify all members about role change
    emitToGroupMembers(group, "memberRoleUpdated", { groupId, userId, newRole: role, group });

    res.status(200).json(group);
  } catch (error) {
    console.log("Error in updateMemberRole:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Leave group (member or admin, not creator)
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const leavingUser = req.user;

    const group = await Group.findById(groupId);

    group.members = group.members.filter((m) => m.user.toString() !== leavingUser._id.toString());
    await group.save();

    await group.populate("members.user", "fullName email profilePic");

    // Create system notification
    const notificationText = `${leavingUser.fullName} left the group`;
    await createSystemNotification(groupId, notificationText, "member_left", group);

    // Notify remaining members
    emitToGroupMembers(group, "memberLeft", { groupId, userId: leavingUser._id.toString(), group });

    res.status(200).json({ message: "Successfully left the group" });
  } catch (error) {
    console.log("Error in leaveGroup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get messages for a group
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await GroupMessage.find({ groupId })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send a message to a group
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image } = req.body;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new GroupMessage({
      groupId,
      senderId,
      text,
      image: imageUrl,
    });

    await newMessage.save();
    await newMessage.populate("senderId", "fullName profilePic");

    // Update group's updatedAt timestamp
    await Group.findByIdAndUpdate(groupId, { updatedAt: new Date() });

    // Emit to all group members
    const group = req.group;
    emitToGroupMembers(group, "newGroupMessage", {
      groupId,
      message: newMessage,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a message from a group
export const deleteGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;

    // req.messageToDelete is set by canDeleteMessage middleware
    await GroupMessage.findByIdAndDelete(messageId);

    // Notify all group members
    const group = req.group;
    emitToGroupMembers(group, "groupMessageDeleted", { groupId, messageId });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteGroupMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};
