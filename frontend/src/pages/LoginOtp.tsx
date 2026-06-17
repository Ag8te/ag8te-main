import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth, type User } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { buildRegistrationPaymentUrl, requiresRegistrationPayment } from "@/lib/registration-payment";

const PENDING_OTP_KEY = "pendingLoginOtp";
const LOGIN_TRUSTED_DEVICE_KEY = "loginTrustedDeviceToken";

interface PendingLoginOtp {
  challengeId: string;
  email: string;
  from?: string | null;
  expiresAt?: string | null;
}

const resolveError = (
  err: string | { code: string; message: string; details?: unknown } | undefined,
  fallback: string
): string => {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return err.message || fallback;
};

const readPendingOtp = (): PendingLoginOtp | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_OTP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingLoginOtp;
    return parsed.challengeId ? parsed : null;
  } catch {
    return null;
  }
};

const LoginOtp = () => {
  const [pendingOtp, setPendingOtp] = useState<PendingLoginOtp | null>(() => readPendingOtp());
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("from") || pendingOtp?.from || null;

  useEffect(() => {
    if (!pendingOtp) {
      navigate("/login", { replace: true });
    }
  }, [navigate, pendingOtp]);

  const navigateByRole = (u: User) => {
    sessionStorage.removeItem(PENDING_OTP_KEY);

    if (requiresRegistrationPayment(u)) {
      localStorage.setItem("registrationPaymentUser", JSON.stringify(u));
      navigate(buildRegistrationPaymentUrl(redirectTo || undefined), { replace: true });
      return;
    }

    if (redirectTo) { navigate(redirectTo, { replace: true }); return; }
    if (u.role === "driver") navigate("/dashboard/driver", { replace: true });
    else if (u.role === "professional") navigate("/dashboard/professional", { replace: true });
    else if (u.role === "service-provider") navigate("/dashboard/provider", { replace: true });
    else navigate("/", { replace: true });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingOtp) return;

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/api/auth/verify-login-otp", {
        method: "POST",
        data: { challenge_id: pendingOtp.challengeId, code: otpCode.trim() },
      });

      if (result.success) {
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        if (result.data?.trusted_device_token) {
          localStorage.setItem(LOGIN_TRUSTED_DEVICE_KEY, result.data.trusted_device_token);
        }
        setUser(result.data.user);
        toast({ title: "Welcome back!", description: "You've been logged in successfully." });
        navigateByRole(result.data.user);
      } else {
        setError(resolveError(result.error, "Verification failed"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not verify the code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingOtp) return;
    setResending(true);
    setError("");
    try {
      const result = await apiFetch("/api/auth/resend-login-otp", {
        method: "POST",
        data: { challenge_id: pendingOtp.challengeId },
      });
      if (result.success) {
        const nextPending = {
          ...pendingOtp,
          challengeId: result.data.challenge_id,
          expiresAt: result.data.expires_at || null,
        };
        sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(nextPending));
        setPendingOtp(nextPending);
        setOtpCode("");
        toast({ title: "Code resent", description: "A new code has been sent to your email." });
      } else {
        setError(resolveError(result.error, "Could not resend the verification code"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resend the verification code");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-white font-sans relative">
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[568px] border border-[#DDDDDD] rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.12)] overflow-hidden bg-white"
        >
          <div className="px-6 py-4 border-b border-[#DDDDDD] flex items-center justify-center relative">
            <Link
              to="/login"
              className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-[#222222] hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </Link>
            <h1 className="text-base font-bold text-[#222222]">Verify login</h1>
          </div>

          <div className="p-6">
            <h2 className="text-[22px] font-semibold text-[#222222] mb-2">Enter your verification code</h2>
            <p className="text-sm text-[#717171] mb-6">
              We sent a 6-digit code to {pendingOtp?.email || "your email address"}.
            </p>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-[#C13515]"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-normal">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="login-otp-input" className="text-[13px] font-bold text-[#222222] tracking-wide ml-1">
                  Verification Code
                </label>
                <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                  <input
                    id="login-otp-input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (error) setError("");
                    }}
                    className="w-full bg-transparent py-4 px-4 text-base text-[#222222] outline-none placeholder:text-[#B0B0B0] font-medium h-14 tracking-[0.35em]"
                    placeholder="000000"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <Button
                id="login-otp-submit-button"
                type="submit"
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-[0.98] h-14 text-base mt-2"
                disabled={loading || !pendingOtp}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify and log in"}
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-between px-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || !pendingOtp}
                className="inline-flex items-center gap-2 text-[13px] font-bold text-primary hover:underline underline-offset-4 disabled:opacity-60"
              >
                {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {resending ? "Sending..." : "Resend code"}
              </button>
              <Link to="/login" className="text-[13px] font-bold text-slate-500 hover:text-slate-800">
                Use different details
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default LoginOtp;
