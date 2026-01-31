import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { generateToken } from "../lib/utils.js";
import { generateOTP, sendOTP, verifyOTP } from "../lib/sms.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";

// OTP expiry time in minutes
const OTP_EXPIRY_MINUTES = 5;

// Helper to set OTP on user
const setUserOTP = async (user) => {
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();

  return otp;
};

// Helper to clear OTP from user
const clearUserOTP = async (user) => {
  user.otp = null;
  user.otpExpiry = null;
  await user.save();
};

// Validate phone number format (+91XXXXXXXXXX)
const validatePhone = (phone) => {
  const phoneRegex = /^\+91[0-9]{10}$/;
  return phoneRegex.test(phone);
};

// ==================== SIGNUP FLOW ====================

// Step 1: Register user and send OTP
export const signup = async (req, res) => {
  const { fullName, email, password, phone } = req.body;

  try {
    // Validation
    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ message: "Invalid phone format. Use +91XXXXXXXXXX" });
    }

    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      // If user exists but not verified, allow re-registration
      if (!existingUser.isVerified) {
        // Update the existing unverified user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        existingUser.fullName = fullName;
        existingUser.email = email;
        existingUser.password = hashedPassword;
        existingUser.phone = phone;

        const otp = await setUserOTP(existingUser);

        // Send OTP
        await sendOTP(phone, otp);

        return res.status(200).json({
          message: "OTP sent to your phone",
          phone: phone,
          userId: existingUser._id,
        });
      }

      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already registered" });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({ message: "Phone number already registered" });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new unverified user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      phone,
      isVerified: false,
    });

    const otp = await setUserOTP(newUser);

    // Send OTP
    await sendOTP(phone, otp);

    res.status(200).json({
      message: "OTP sent to your phone",
      phone: phone,
      userId: newUser._id,
    });
  } catch (error) {
    console.log("Error in signup controller:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Step 2: Verify signup OTP and complete registration
export const verifySignupOTP = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    if (!userId || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified. Please login." });
    }

    // Verify OTP
    const verification = verifyOTP(user.otp, user.otpExpiry, otp);
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    // Mark user as verified and clear OTP
    user.isVerified = true;
    await clearUserOTP(user);

    // Generate JWT token
    generateToken(user._id, res);

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(user.email, user.fullName, ENV.CLIENT_URL);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      profilePic: user.profilePic,
      publicKey: user.publicKey,
      privateKey: user.privateKey,
    });
  } catch (error) {
    console.log("Error in verifySignupOTP controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== LOGIN FLOW ====================

// Step 1: Validate credentials and send OTP
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: "Account not verified. Please sign up again." });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate and send OTP
    const otp = await setUserOTP(user);
    await sendOTP(user.phone, otp);

    res.status(200).json({
      message: "OTP sent to your phone",
      phone: user.phone.replace(/(\+91)(\d{6})(\d{4})/, "$1******$3"), // Mask phone
      userId: user._id,
    });
  } catch (error) {
    console.error("Error in login controller:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Step 2: Verify login OTP and issue JWT
export const verifyLoginOTP = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    if (!userId || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify OTP
    const verification = verifyOTP(user.otp, user.otpExpiry, otp);
    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    // Clear OTP
    await clearUserOTP(user);

    // Generate JWT token
    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      profilePic: user.profilePic,
      publicKey: user.publicKey,
      privateKey: user.privateKey,
    });
  } catch (error) {
    console.log("Error in verifyLoginOTP controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== RESEND OTP ====================

export const resendOTP = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate and send new OTP
    const otp = await setUserOTP(user);
    await sendOTP(user.phone, otp);

    res.status(200).json({
      message: "OTP resent to your phone",
      phone: user.phone.replace(/(\+91)(\d{6})(\d{4})/, "$1******$3"),
    });
  } catch (error) {
    console.log("Error in resendOTP controller:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ==================== OTHER ====================

export const logout = (_, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ message: "Profile pic is required" });

    const userId = req.user._id;

    const uploadResponse = await cloudinary.uploader.upload(profilePic);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    ).select("-password -otp -otpExpiry");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    res.status(200).json({
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      profilePic: req.user.profilePic,
      publicKey: req.user.publicKey,
      privateKey: req.user.privateKey, // For key recovery
    });
  } catch (error) {
    console.log("Error in checkAuth controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== PUBLIC KEY MANAGEMENT ====================

// Store user's key pair (public key for others, private key for recovery)
export const storePublicKey = async (req, res) => {
  try {
    const { publicKey, privateKey } = req.body;
    const userId = req.user._id;

    if (!publicKey) {
      return res.status(400).json({ message: "Public key is required" });
    }

    const updateData = { publicKey };
    if (privateKey) {
      updateData.privateKey = privateKey;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password -otp -otpExpiry");

    res.status(200).json({
      message: "Keys stored successfully",
      publicKey: user.publicKey,
    });
  } catch (error) {
    console.log("Error in storePublicKey controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user's public key by userId
export const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("publicKey fullName");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return null publicKey gracefully (user may not have E2E setup)
    res.status(200).json({
      userId: user._id,
      fullName: user.fullName,
      publicKey: user.publicKey || null,
    });
  } catch (error) {
    console.log("Error in getPublicKey controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
