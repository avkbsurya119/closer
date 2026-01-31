import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";
import {
  encryptMessage,
  decryptMessage,
  verifySignature,
  getStoredPrivateKey,
  hashMessage,
} from "../lib/crypto";

// Cache for public keys
const publicKeyCache = new Map();

// Fetch and cache public key
const getPublicKey = async (userId) => {
  if (publicKeyCache.has(userId)) {
    return publicKeyCache.get(userId);
  }

  try {
    const res = await axiosInstance.get(`/auth/public-key/${userId}`);
    const publicKey = res.data.publicKey;
    if (publicKey) {
      publicKeyCache.set(userId, publicKey);
    }
    return publicKey;
  } catch (error) {
    console.error("Error fetching public key:", error);
    return null;
  }
};

// Encrypt message for multiple recipients (group members)
const encryptForGroup = async (message, memberIds, senderPrivateKey, senderPublicKey) => {
  try {
    // Generate AES key and encrypt message once
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      messageBuffer
    );

    // Export AES key
    const aesKeyBuffer = await window.crypto.subtle.exportKey("raw", aesKey);

    // Encrypt AES key for each member
    const encryptedKeys = [];
    for (const memberId of memberIds) {
      try {
        const publicKey = await getPublicKey(memberId);
        if (publicKey) {
          const jwk = JSON.parse(publicKey);
          const rsaKey = await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt"]
          );

          const encryptedKey = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            rsaKey,
            aesKeyBuffer
          );

          encryptedKeys.push({
            recipientId: memberId,
            encryptedKey: arrayBufferToBase64(encryptedKey),
          });
        }
      } catch (err) {
        console.error(`Failed to encrypt for member ${memberId}:`, err);
      }
    }

    // Create signature (hash of message)
    const signature = await hashMessage(message);

    return {
      encryptedContent: arrayBufferToBase64(encryptedContent),
      encryptedKeys,
      iv: arrayBufferToBase64(iv),
      signature,
      isEncrypted: encryptedKeys.length > 0,
    };
  } catch (error) {
    console.error("Error encrypting for group:", error);
    return null;
  }
};

// Decrypt group message
const decryptGroupMessage = async (message, privateKey, currentUserId) => {
  if (!message.isEncrypted || !privateKey || message.type === "system") {
    return message;
  }

  try {
    // Find the encrypted key for current user
    const myEncryptedKey = message.encryptedKeys?.find(
      (k) => k.recipientId === currentUserId || k.recipientId?._id === currentUserId
    );

    if (!myEncryptedKey) {
      return {
        ...message,
        text: "[Encrypted - no key for you]",
        decryptionFailed: true,
      };
    }

    // Decrypt AES key with private key
    const jwk = JSON.parse(privateKey);
    const rsaKey = await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["decrypt"]
    );

    const encryptedKeyBuffer = base64ToArrayBuffer(myEncryptedKey.encryptedKey);
    const aesKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      rsaKey,
      encryptedKeyBuffer
    );

    // Import AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyBuffer,
      { name: "AES-GCM", length: 256 },
      true,
      ["decrypt"]
    );

    // Decrypt message
    const ivBuffer = base64ToArrayBuffer(message.iv);
    const encryptedContentBuffer = base64ToArrayBuffer(message.text);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      aesKey,
      encryptedContentBuffer
    );

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedBuffer);

    // Verify signature
    let signatureValid = null;
    if (message.signature) {
      const currentHash = await hashMessage(decryptedText);
      signatureValid = currentHash === message.signature;
    }

    return {
      ...message,
      text: decryptedText,
      decrypted: true,
      signatureValid,
    };
  } catch (error) {
    console.error("Error decrypting group message:", error);
    return {
      ...message,
      text: "[Unable to decrypt message]",
      decryptionFailed: true,
    };
  }
};

// Utility functions
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

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
      const privateKey = getStoredPrivateKey();
      const { authUser } = useAuthStore.getState();

      // Decrypt all encrypted messages
      const decryptedMessages = await Promise.all(
        res.data.map((msg) => decryptGroupMessage(msg, privateKey, authUser._id))
      );

      set({ groupMessages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  // Send a message to a group
  sendGroupMessage: async (groupId, messageData) => {
    const { groupMessages, selectedGroup } = get();
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
      isEncrypted: true,
    };

    // Immediately update UI
    set({ groupMessages: [...groupMessages, optimisticMessage] });

    try {
      let encryptedData = null;

      // Only encrypt text messages
      if (messageData.text && selectedGroup?.members) {
        try {
          const memberIds = selectedGroup.members.map(
            (m) => m.user?._id || m.user
          );
          const senderPrivateKey = getStoredPrivateKey();
          const senderPublicKey = authUser.publicKey;

          if (senderPrivateKey && senderPublicKey) {
            encryptedData = await encryptForGroup(
              messageData.text,
              memberIds,
              senderPrivateKey,
              senderPublicKey
            );
          }
        } catch (encryptError) {
          console.error("Encryption failed, sending unencrypted:", encryptError);
        }
      }

      // Prepare message payload
      const payload = {
        text: encryptedData ? encryptedData.encryptedContent : messageData.text,
        image: messageData.image,
        isEncrypted: encryptedData?.isEncrypted || false,
        encryptedKeys: encryptedData?.encryptedKeys || [],
        iv: encryptedData?.iv,
        signature: encryptedData?.signature,
        senderPublicKey: authUser.publicKey,
      };

      const res = await axiosInstance.post(`/groups/${groupId}/messages`, payload);

      // Replace optimistic message with real one
      const newMessage = {
        ...res.data,
        text: messageData.text, // Show original text for sender
        decrypted: true,
        signatureValid: true,
      };

      set({ groupMessages: groupMessages.concat(newMessage) });
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
    socket.on("newGroupMessage", async ({ groupId, message }) => {
      const { selectedGroup, groupMessages, groups } = get();
      const { authUser } = useAuthStore.getState();

      // Update messages if this group is selected
      if (selectedGroup?._id === groupId) {
        // System messages should always be added
        // Regular messages: don't add if it's our own (already added optimistically)
        const isSystemMessage = message.type === "system";
        const isOwnMessage = message.senderId?._id === authUser._id;

        if (isSystemMessage || !isOwnMessage) {
          // Decrypt incoming message
          const privateKey = getStoredPrivateKey();
          const decryptedMessage = await decryptGroupMessage(message, privateKey, authUser._id);

          set({ groupMessages: [...groupMessages, decryptedMessage] });

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
