import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import {
  MessageCircleIcon,
  LockIcon,
  MailIcon,
  UserIcon,
  LoaderIcon,
  PhoneIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { Link } from "react-router";

function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [otp, setOtp] = useState("");

  const {
    signup,
    isSigningUp,
    verifySignupOTP,
    isVerifyingOTP,
    resendOTP,
    isResendingOTP,
    cancelOTPFlow,
    otpStep,
    pendingPhone,
  } = useAuthStore();

  // Format phone number to ensure +91 prefix
  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\s+/g, "").trim();
    if (!cleaned.startsWith("+91")) {
      cleaned = cleaned.replace(/^0+/, ""); // Remove leading zeros
      cleaned = "+91" + cleaned;
    }
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formattedData = {
      ...formData,
      phone: formatPhoneNumber(formData.phone),
    };
    await signup(formattedData);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    await verifySignupOTP(otp);
  };

  const handleResendOTP = async () => {
    await resendOTP();
  };

  const handleBack = () => {
    cancelOTPFlow();
    setOtp("");
  };

  // Show OTP verification form if in signup OTP step
  if (otpStep === "signup") {
    return (
      <div className="w-full flex items-center justify-center p-4 bg-slate-900">
        <div className="relative w-full max-w-6xl md:h-[800px] h-[650px]">
          <BorderAnimatedContainer>
            <div className="w-full flex flex-col md:flex-row">
              {/* OTP VERIFICATION FORM */}
              <div className="md:w-1/2 p-8 flex items-center justify-center md:border-r border-slate-600/30">
                <div className="w-full max-w-md">
                  {/* BACK BUTTON */}
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back
                  </button>

                  {/* HEADING TEXT */}
                  <div className="text-center mb-8">
                    <PhoneIcon className="w-12 h-12 mx-auto text-cyan-400 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-200 mb-2">Verify Your Phone</h2>
                    <p className="text-slate-400">
                      We've sent a 6-digit OTP to{" "}
                      <span className="text-cyan-400">{pendingPhone}</span>
                    </p>
                  </div>

                  {/* OTP FORM */}
                  <form onSubmit={handleVerifyOTP} className="space-y-6">
                    {/* OTP INPUT */}
                    <div>
                      <label className="auth-input-label">Enter OTP</label>
                      <div className="relative">
                        <LockIcon className="auth-input-icon" />
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="input text-center tracking-widest text-lg"
                          placeholder="000000"
                          maxLength={6}
                        />
                      </div>
                    </div>

                    {/* VERIFY BUTTON */}
                    <button
                      className="auth-btn"
                      type="submit"
                      disabled={isVerifyingOTP || otp.length !== 6}
                    >
                      {isVerifyingOTP ? (
                        <LoaderIcon className="w-full h-5 animate-spin text-center" />
                      ) : (
                        "Verify OTP"
                      )}
                    </button>
                  </form>

                  {/* RESEND OTP */}
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleResendOTP}
                      disabled={isResendingOTP}
                      className="text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                    >
                      {isResendingOTP ? "Sending..." : "Didn't receive OTP? Resend"}
                    </button>
                  </div>
                </div>
              </div>

              {/* ILLUSTRATION - RIGHT SIDE */}
              <div className="hidden md:w-1/2 md:flex items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
                <div>
                  <img
                    src="/signup.png"
                    alt="People using mobile devices"
                    className="w-full h-auto object-contain"
                  />
                  <div className="mt-6 text-center">
                    <h3 className="text-xl font-medium text-cyan-400">Almost There!</h3>
                    <p className="text-slate-400 mt-2">Just verify your phone to complete signup</p>
                  </div>
                </div>
              </div>
            </div>
          </BorderAnimatedContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="relative w-full max-w-6xl md:h-[800px] h-[650px]">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row">
            {/* FORM CLOUMN - LEFT SIDE */}
            <div className="md:w-1/2 p-8 flex items-center justify-center md:border-r border-slate-600/30">
              <div className="w-full max-w-md">
                {/* HEADING TEXT */}
                <div className="text-center mb-8">
                  <MessageCircleIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h2 className="text-2xl font-bold text-slate-200 mb-2">Create Account</h2>
                  <p className="text-slate-400">Sign up for a new account</p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* FULL NAME */}
                  <div>
                    <label className="auth-input-label">Full Name</label>
                    <div className="relative">
                      <UserIcon className="auth-input-icon" />

                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="input"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {/* EMAIL INPUT */}
                  <div>
                    <label className="auth-input-label">Email</label>
                    <div className="relative">
                      <MailIcon className="auth-input-icon" />

                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input"
                        placeholder="johndoe@gmail.com"
                      />
                    </div>
                  </div>

                  {/* PHONE INPUT */}
                  <div>
                    <label className="auth-input-label">Phone Number</label>
                    <div className="relative">
                      <PhoneIcon className="auth-input-icon" />

                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input"
                        placeholder="+91XXXXXXXXXX"
                      />
                    </div>
                  </div>

                  {/* PASSWORD INPUT */}
                  <div>
                    <label className="auth-input-label">Password</label>
                    <div className="relative">
                      <LockIcon className="auth-input-icon" />

                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button className="auth-btn" type="submit" disabled={isSigningUp}>
                    {isSigningUp ? (
                      <LoaderIcon className="w-full h-5 animate-spin text-center" />
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="auth-link">
                    Already have an account? Login
                  </Link>
                </div>
              </div>
            </div>

            {/* FORM ILLUSTRATION - RIGHT SIDE */}
            <div className="hidden md:w-1/2 md:flex items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <div>
                <img
                  src="/signup.png"
                  alt="People using mobile devices"
                  className="w-full h-auto object-contain"
                />
                <div className="mt-6 text-center">
                  <h3 className="text-xl font-medium text-cyan-400">Start Your Journey Today</h3>

                  <div className="mt-4 flex justify-center gap-4">
                    <span className="auth-badge">Free</span>
                    <span className="auth-badge">Easy Setup</span>
                    <span className="auth-badge">Private</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}
export default SignUpPage;
