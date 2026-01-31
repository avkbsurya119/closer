import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import {
  encryptMessage,
  decryptMessage,
  verifySignature,
  getStoredPrivateKey,
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

// Decrypt a single message
const decryptSingleMessage = async (message, privateKey, currentUserId) => {
  if (!message.isEncrypted || !privateKey) {
    return message;
  }

  try {
    // Determine which encrypted key to use based on who's viewing
    const isSender = message.senderId === currentUserId || message.senderId?._id === currentUserId;
    const encryptedKeyToUse = isSender ? message.senderEncryptedKey : message.encryptedKey;

    if (!encryptedKeyToUse) {
      return {
        ...message,
        text: "[Encrypted message]",
        decryptionFailed: true,
      };
    }

    const decryptedText = await decryptMessage(
      {
        encryptedContent: message.text,
        encryptedKey: encryptedKeyToUse,
        iv: message.iv,
      },
      privateKey
    );

    // Verify signature if present
    let signatureValid = null;
    if (message.signature && message.senderPublicKey) {
      signatureValid = await verifySignature(
        decryptedText,
        message.signature,
        message.senderPublicKey
      );
    }

    return {
      ...message,
      text: decryptedText,
      decrypted: true,
      signatureValid,
    };
  } catch (error) {
    console.error("Error decrypting message:", error);
    return {
      ...message,
      text: "[Unable to decrypt message]",
      decryptionFailed: true,
    };
  }
};

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set({
        messages: get().messages.filter((m) => m._id !== messageId),
      });
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const privateKey = getStoredPrivateKey();
      const { authUser } = useAuthStore.getState();

      // Decrypt all encrypted messages
      const decryptedMessages = await Promise.all(
        res.data.map((msg) => decryptSingleMessage(msg, privateKey, authUser._id))
      );

      set({ messages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      isEncrypted: true,
    };

    // Immediately update the UI
    set({ messages: [...messages, optimisticMessage] });

    try {
      let encryptedData = null;

      // Only encrypt text messages (not images)
      if (messageData.text) {
        try {
          const recipientPublicKey = await getPublicKey(selectedUser._id);
          const senderPrivateKey = getStoredPrivateKey();
          const senderPublicKey = authUser.publicKey;

          if (recipientPublicKey && senderPrivateKey && senderPublicKey) {
            encryptedData = await encryptMessage(
              messageData.text,
              recipientPublicKey,
              senderPrivateKey,
              senderPublicKey
            );
          } else {
            console.log("Encryption skipped - missing keys:", {
              hasRecipientKey: !!recipientPublicKey,
              hasSenderPrivateKey: !!senderPrivateKey,
              hasSenderPublicKey: !!senderPublicKey,
            });
          }
        } catch (encryptError) {
          console.error("Encryption failed, sending unencrypted:", encryptError);
          // Continue without encryption
        }
      }

      // Prepare message payload
      const payload = {
        text: encryptedData ? encryptedData.encryptedContent : messageData.text,
        image: messageData.image,
        isEncrypted: !!encryptedData,
        encryptedKey: encryptedData?.encryptedKey,
        senderEncryptedKey: encryptedData?.senderEncryptedKey,
        iv: encryptedData?.iv,
        signature: encryptedData?.signature,
        senderPublicKey: authUser.publicKey,
      };

      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);

      // Replace optimistic message with real one (already decrypted for sender)
      const newMessage = {
        ...res.data,
        text: messageData.text, // Show original text for sender
        decrypted: true,
        signatureValid: true,
      };

      set({ messages: messages.concat(newMessage) });
    } catch (error) {
      // Remove optimistic message on failure
      set({ messages: messages });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", async (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      // Decrypt the incoming message
      const privateKey = getStoredPrivateKey();
      const { authUser } = useAuthStore.getState();
      const decryptedMessage = await decryptSingleMessage(newMessage, privateKey, authUser._id);

      const currentMessages = get().messages;
      set({ messages: [...currentMessages, decryptedMessage] });

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    // Listen for message deletions
    socket.on("messageDeleted", ({ messageId, senderId }) => {
      const isFromSelectedUser = senderId === selectedUser._id;
      if (!isFromSelectedUser) return;

      set({
        messages: get().messages.filter((m) => m._id !== messageId),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeleted");
  },
}));
