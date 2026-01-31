import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
    // OTP fields for MFA
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    // For pending registrations (OTP not yet verified)
    isVerified: {
      type: Boolean,
      default: false,
    },
    // RSA public key for E2E encryption
    publicKey: {
      type: String,
      default: null,
    },
    // RSA private key (stored for key recovery - encrypted in production)
    privateKey: {
      type: String,
      default: null,
    },
  },
  { timestamps: true } // createdAt & updatedAt
);

const User = mongoose.model("User", userSchema);

export default User;
