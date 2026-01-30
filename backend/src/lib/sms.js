import twilio from "twilio";
import { ENV } from "./env.js";

// Initialize Twilio client
const twilioClient = twilio(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);

// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Twilio
export const sendOTP = async (phone, otp) => {
  try {
    // Ensure phone has country code
    let phoneNumber = phone;
    if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+91" + phoneNumber;
    }

    const message = await twilioClient.messages.create({
      body: `Your Closer verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      from: ENV.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log("OTP sent to:", phoneNumber);
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

// Verify OTP (check if OTP matches and is not expired)
export const verifyOTP = (storedOTP, storedExpiry, inputOTP) => {
  if (!storedOTP || !storedExpiry) {
    return { valid: false, message: "No OTP found. Please request a new one." };
  }

  if (new Date() > new Date(storedExpiry)) {
    return { valid: false, message: "OTP has expired. Please request a new one." };
  }

  if (storedOTP !== inputOTP) {
    return { valid: false, message: "Invalid OTP. Please try again." };
  }

  return { valid: true, message: "OTP verified successfully" };
};
