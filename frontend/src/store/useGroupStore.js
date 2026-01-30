import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  isCreatingGroup: false,

  setSelectedGroup: (group) => {
    // Clear selected user when selecting a group
    useChatStore.getState().setSelectedUser(null);
    set({ selectedGroup: group });
  },

  clearSelectedGroup: () => set({ selectedGroup: null, groupMessages: [] }),

  // Fetch all groups the user is a member of
  getMyGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  // Create a new group
  createGroup: async (data) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups", data);
      set({ groups: [res.data, ...get().groups] });
      toast.success("Group created successfully!");

      // Join the socket room for this group
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("joinGroup", res.data._id);
      }

      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return null;
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  // Update group settings (creator only)
  updateGroup: async (groupId, data) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, data);
      set({
        groups: get().groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup,
      });
      toast.success("Group updated successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
      return null;
    }
  },

  // Delete group (creator only)
  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
        groupMessages: get().selectedGroup?._id === groupId ? [] : get().groupMessages,
      });

      // Leave the socket room
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("leaveGroup", groupId);
      }

      toast.success("Group deleted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  },

  // Add members to group
  addMembers: async (groupId, memberIds) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { memberIds });
      set({
        groups: get().groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup,
      });
      toast.success("Members added successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
      return null;
    }
  },

  // Remove a member from group
  removeMember: async (groupId, userId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);
      set({
        groups: get().groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup,
      });
      toast.success("Member removed successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      return null;
    }
  },

  // Update member role (creator only)
  updateMemberRole: async (groupId, userId, role) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/members/${userId}/role`, { role });
      set({
        groups: get().groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup,
      });
      toast.success(`Member ${role === "admin" ? "promoted to admin" : "demoted to member"}!`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update member role");
      return null;
    }
  },

  // Leave group
  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
        groupMessages: get().selectedGroup?._id === groupId ? [] : get().groupMessages,
      });

      // Leave the socket room
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("leaveGroup", groupId);
      }

      toast.success("Left the group successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  },

  // Get messages for a group
  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  // Send a message to a group
  sendGroupMessage: async (groupId, messageData) => {
    const { groupMessages } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      groupId,
      senderId: {
        _id: authUser._id,
        fullName: authUser.fullName,
        profilePic: authUser.profilePic,
      },
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // Immediately update UI
    set({ groupMessages: [...groupMessages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/groups/${groupId}/messages`, messageData);
      // Replace optimistic message with real one
      set({ groupMessages: groupMessages.concat(res.data) });
    } catch (error) {
      // Remove optimistic message on failure
      set({ groupMessages: groupMessages });
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Delete a message from group
  deleteGroupMessage: async (groupId, messageId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/messages/${messageId}`);
      set({
        groupMessages: get().groupMessages.filter((m) => m._id !== messageId),
      });
      toast.success("Message deleted!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  // Subscribe to group socket events
  subscribeToGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    const { isSoundEnabled } = useChatStore.getState();

    // New message in a group
    socket.on("newGroupMessage", ({ groupId, message }) => {
      const { selectedGroup, groupMessages, groups } = get();
      const { authUser } = useAuthStore.getState();

      // Update messages if this group is selected
      if (selectedGroup?._id === groupId) {
        // System messages should always be added
        // Regular messages: don't add if it's our own (already added optimistically)
        const isSystemMessage = message.type === "system";
        const isOwnMessage = message.senderId?._id === authUser._id;

        if (isSystemMessage || !isOwnMessage) {
          set({ groupMessages: [...groupMessages, message] });

          // Play sound for messages from others (not for system messages)
          if (!isSystemMessage && isSoundEnabled) {
            const notificationSound = new Audio("/sounds/notification.mp3");
            notificationSound.currentTime = 0;
            notificationSound.play().catch((e) => console.log("Audio play failed:", e));
          }
        }
      }

      // Move this group to top of list
      const updatedGroups = groups.filter((g) => g._id !== groupId);
      const currentGroup = groups.find((g) => g._id === groupId);
      if (currentGroup) {
        set({ groups: [currentGroup, ...updatedGroups] });
      }
    });

    // Group was created (user was added to a new group)
    socket.on("groupCreated", (group) => {
      set({ groups: [group, ...get().groups] });
      socket.emit("joinGroup", group._id);
      toast.success(`You were added to group "${group.name}"`);
    });

    // Group settings were updated
    socket.on("groupUpdated", (updatedGroup) => {
      set({
        groups: get().groups.map((g) => (g._id === updatedGroup._id ? updatedGroup : g)),
        selectedGroup:
          get().selectedGroup?._id === updatedGroup._id ? updatedGroup : get().selectedGroup,
      });
    });

    // Group was deleted
    socket.on("groupDeleted", ({ groupId }) => {
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
        groupMessages: get().selectedGroup?._id === groupId ? [] : get().groupMessages,
      });
      socket.emit("leaveGroup", groupId);
      toast.info("A group you were in was deleted");
    });

    // Members were added
    socket.on("membersAdded", ({ groupId, group }) => {
      set({
        groups: get().groups.map((g) => (g._id === groupId ? group : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? group : get().selectedGroup,
      });
    });

    // Member was removed
    socket.on("memberRemoved", ({ groupId, userId, group }) => {
      const { authUser } = useAuthStore.getState();
      if (userId === authUser._id) {
        // Current user was removed
        set({
          groups: get().groups.filter((g) => g._id !== groupId),
          selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
          groupMessages: get().selectedGroup?._id === groupId ? [] : get().groupMessages,
        });
        socket.emit("leaveGroup", groupId);
        toast.info("You were removed from a group");
      } else {
        set({
          groups: get().groups.map((g) => (g._id === groupId ? group : g)),
          selectedGroup: get().selectedGroup?._id === groupId ? group : get().selectedGroup,
        });
      }
    });

    // Current user was removed from group
    socket.on("removedFromGroup", ({ groupId }) => {
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
        groupMessages: get().selectedGroup?._id === groupId ? [] : get().groupMessages,
      });
      socket.emit("leaveGroup", groupId);
      toast.info("You were removed from a group");
    });

    // Member left the group
    socket.on("memberLeft", ({ groupId, userId, group }) => {
      set({
        groups: get().groups.map((g) => (g._id === groupId ? group : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? group : get().selectedGroup,
      });
    });

    // Member role was updated
    socket.on("memberRoleUpdated", ({ groupId, userId, newRole, group }) => {
      const { authUser } = useAuthStore.getState();
      set({
        groups: get().groups.map((g) => (g._id === groupId ? group : g)),
        selectedGroup: get().selectedGroup?._id === groupId ? group : get().selectedGroup,
      });
      if (userId === authUser._id) {
        toast.info(`Your role was changed to ${newRole}`);
      }
    });

    // Message was deleted
    socket.on("groupMessageDeleted", ({ groupId, messageId }) => {
      if (get().selectedGroup?._id === groupId) {
        set({
          groupMessages: get().groupMessages.filter((m) => m._id !== messageId),
        });
      }
    });
  },

  // Unsubscribe from group socket events
  unsubscribeFromGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newGroupMessage");
    socket.off("groupCreated");
    socket.off("groupUpdated");
    socket.off("groupDeleted");
    socket.off("membersAdded");
    socket.off("memberRemoved");
    socket.off("removedFromGroup");
    socket.off("memberLeft");
    socket.off("memberRoleUpdated");
    socket.off("groupMessageDeleted");
  },

  // Helper to get current user's role in a group
  getMyRole: (group) => {
    if (!group) return null;
    const { authUser } = useAuthStore.getState();
    const member = group.members?.find((m) => m.user?._id === authUser._id || m.user === authUser._id);
    return member?.role || null;
  },
}));
