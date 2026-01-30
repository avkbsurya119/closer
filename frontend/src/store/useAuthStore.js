import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

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

      set({
        authUser: res.data,
        pendingUserId: null,
        pendingPhone: null,
        otpStep: null,
      });

      toast.success("Account created successfully!");
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

      set({
        authUser: res.data,
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
