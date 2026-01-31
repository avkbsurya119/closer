import express from "express";
import {
  signup,
  verifySignupOTP,
  login,
  verifyLoginOTP,
  resendOTP,
  logout,
  updateProfile,
  checkAuth,
  storePublicKey,
  getPublicKey,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection);

// Signup flow (2-step with OTP)
router.post("/signup", signup);
router.post("/verify-signup-otp", verifySignupOTP);

// Login flow (2-step with OTP)
router.post("/login", login);
router.post("/verify-login-otp", verifyLoginOTP);

// Resend OTP
router.post("/resend-otp", resendOTP);

// Other
router.post("/logout", logout);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

// Public Key Management (E2E Encryption)
router.post("/public-key", protectRoute, storePublicKey);
router.get("/public-key/:userId", protectRoute, getPublicKey);

export default router;
