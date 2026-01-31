import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import {
  generateKeyPair,
  storePrivateKey,
  getStoredPrivateKey,
  removePrivateKey,
  hasEncryptionKeys,
} from "../lib/crypto";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isVerifyingOTP: false,
  isResendingOTP: false,
  socket: null,
  onlineUsers: [],

  // OTP flow state
  pendingUserId: null,
  pendingPhone: null,
  otpStep: null, // 'signup' | 'login' | null

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      // Recover private key from server if not in localStorage
      if (!hasEncryptionKeys() && res.data.privateKey) {
        console.log("Recovering encryption key from server...");
        storePrivateKey(res.data.privateKey);
      }

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // Step 1 of signup: Submit form, receive OTP
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);

      // OTP sent, move to verification step
      set({
        pendingUserId: res.data.userId,
        pendingPhone: res.data.phone,
        otpStep: "signup",
      });

      toast.success("OTP sent to your phone!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  // Step 2 of signup: Verify OTP
  verifySignupOTP: async (otp) => {
    const { pendingUserId } = get();
    if (!pendingUserId) {
      toast.error("Session expired. Please signup again.");
      return false;
    }

    set({ isVerifyingOTP: true });
    try {
      const res = await axiosInstance.post("/auth/verify-signup-otp", {
        userId: pendingUserId,
        otp,
      });

      // Generate encryption key pair for E2E encryption
      console.log("Generating encryption keys...");
      const { publicKey, privateKey } = await generateKeyPair();

      // Store both keys on server (private key for recovery)
      await axiosInstance.post("/auth/public-key", { publicKey, privateKey });

      // Store private key in localStorage
      storePrivateKey(privateKey);

      set({
        authUser: { ...res.data, publicKey },
        pendingUserId: null,
        pendingPhone: null,
        otpStep: null,
      });

      toast.success("Account created with E2E encryption!");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP verification failed");
      return false;
    } finally {
      set({ isVerifyingOTP: false });
    }
  },

  // Step 1 of login: Submit credentials, receive OTP
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);

      // OTP sent, move to verification step
      set({
        pendingUserId: res.data.userId,
        pendingPhone: res.data.phone,
        otpStep: "login",
      });

      toast.success("OTP sent to your phone!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // Step 2 of login: Verify OTP
  verifyLoginOTP: async (otp) => {
    const { pendingUserId } = get();
    if (!pendingUserId) {
      toast.error("Session expired. Please login again.");
      return false;
    }

    set({ isVerifyingOTP: true });
    try {
      const res = await axiosInstance.post("/auth/verify-login-otp", {
        userId: pendingUserId,
        otp,
      });

      let userData = res.data;

      // Check if user has local private key
      if (!hasEncryptionKeys()) {
        // Try to recover private key from server
        if (res.data.privateKey) {
          console.log("Recovering encryption key from server...");
          storePrivateKey(res.data.privateKey);
        } else if (res.data.publicKey) {
          // User has public key but no private key anywhere - can't recover
          console.log("No private key found. E2E encryption disabled for old messages.");
        } else {
          // No keys at all - generate new ones
          console.log("No encryption keys found. Generating new keys...");
          const { publicKey, privateKey } = await generateKeyPair();
          await axiosInstance.post("/auth/public-key", { publicKey, privateKey });
          storePrivateKey(privateKey);
          userData = { ...userData, publicKey };
        }
      }

      set({
        authUser: userData,
        pendingUserId: null,
        pendingPhone: null,
        otpStep: null,
      });

      toast.success("Logged in successfully!");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP verification failed");
      return false;
    } finally {
      set({ isVerifyingOTP: false });
    }
  },

  // Resend OTP
  resendOTP: async () => {
    const { pendingUserId } = get();
    if (!pendingUserId) {
      toast.error("Session expired. Please try again.");
      return false;
    }

    set({ isResendingOTP: true });
    try {
      const res = await axiosInstance.post("/auth/resend-otp", {
        userId: pendingUserId,
      });

      set({ pendingPhone: res.data.phone });
      toast.success("OTP resent to your phone!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
      return false;
    } finally {
      set({ isResendingOTP: false });
    }
  },

  // Cancel OTP flow and go back
  cancelOTPFlow: () => {
    set({
      pendingUserId: null,
      pendingPhone: null,
      otpStep: null,
    });
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      // Note: We keep the private key in localStorage so user can decrypt old messages on re-login
      // Only remove if user explicitly wants to clear keys
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response?.data?.message || "Update failed");
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      withCredentials: true,
    });

    socket.connect();

    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
