import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { buildRegistrationPaymentUrl, requiresRegistrationPayment } from "@/lib/registration-payment";

interface GoogleCredentialResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

/** Safely converts the API's error field (string | object | undefined) into a plain string. */
const resolveError = (
  err: string | { code: string; message: string; details?: any } | undefined,
  fallback: string
): string => {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return err.message || fallback;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, setUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [redirectTo, setRedirectTo] = useState(searchParams.get("from") || null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [resending, setResending] = useState(false);
  const [isVerificationError, setIsVerificationError] = useState(false);

  const checkRoles = async (emailVal: string) => {
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) return;
    try {
      const res = await apiFetch<{ roles: string[] }>(`/api/auth/roles-for-email?email=${encodeURIComponent(emailVal)}`);
      if (res.success && res.data.roles.length > 0) {
        setAvailableRoles(res.data.roles);
        if (!res.data.roles.includes(role)) {
          setRole(res.data.roles[0]);
        }
      } else {
        setAvailableRoles([]);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  };

  const navigateByRole = (u: any) => {
    if (requiresRegistrationPayment(u)) {
      localStorage.setItem("registrationPaymentUser", JSON.stringify(u));
      navigate(buildRegistrationPaymentUrl(redirectTo || undefined));
      return;
    }

    const r = u.role;
    // If we were redirected here from a protected page, go back there.
    if (redirectTo) { navigate(redirectTo, { replace: true }); return; }
    if (r === "driver") navigate("/dashboard/driver");
    else if (r === "professional") navigate("/dashboard/professional");
    else if (r === "service-provider") navigate("/dashboard/provider");
    else navigate("/");
  };

  const handleGoogleSuccess = async (credentialResponse: GoogleCredentialResponse) => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/api/auth/google-login", {
        method: "POST",
        data: { token: credentialResponse.credential, role },
      });
      if (result.success) {
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        if (setUser) setUser(result.data.user);
        toast({ title: "Welcome!", description: "Logged in via Google successfully." });
        navigateByRole(result.data.user);
      } else {
        setError(resolveError(result.error, "Google login failed"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred during Google sign-in");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || !role) return;
    setResending(true);
    try {
      const result = await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        data: { email, role },
      });
      if (result.success) {
        toast({
          title: "Verification sent",
          description: "A new verification link has been sent to your email.",
        });
        setIsVerificationError(false);
      } else {
        toast({
          title: "Failed to resend",
          description: resolveError(result.error, "Could not resend verification email"),
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email"); return; }
    if (!password) { setError("Password is required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!role) { setError("Please select a role to login as"); return; }

    setLoading(true);
    setIsVerificationError(false);
    try {
      const result = await login(email, password, role);
      if (result.success) {
        if (result.data?.payment_required && result.data?.redirect_url) {
          localStorage.setItem("registrationPaymentUser", JSON.stringify(result.data.user));
          window.location.href = result.data.redirect_url;
          return;
        }

        toast({ title: "Welcome back!", description: "You've been logged in successfully." });
        navigateByRole(result.data.user);
      } else {
        const errorMsg = resolveError(result.error, "Login failed");
        setError(errorMsg);

        // Use a more robust check for the specific verification error
        const errObj = result.error as any;
        if (errObj?.code === 'EMAIL_NOT_VERIFIED' || errorMsg.toLowerCase().includes("not verified")) {
          setIsVerificationError(true);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
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
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#DDDDDD] flex items-center justify-center relative">
            <Link
              to="/"
              className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-[#222222] hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to website</span>
            </Link>
            <h1 className="text-base font-bold text-[#222222]">Log in or sign up</h1>
          </div>

          <div className="p-6">
            <h2 className="text-[22px] font-semibold text-[#222222] mb-6">Welcome to MzansiServe</h2>

            {/* Error Banner */}
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
                  <div className="flex-1">
                    <p className="text-sm font-normal">{error}</p>
                    {isVerificationError && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="mt-2 text-[13px] font-bold underline flex items-center gap-2 hover:text-red-800 transition-colors"
                        disabled={resending}
                      >
                        {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Resend verification email
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selector */}
              <div className="space-y-2">
                <label htmlFor="role" className="text-[13px] font-bold text-[#222222] tracking-wide ml-1">
                  Login as
                </label>
                <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => { setRole(e.target.value); if (error && error.includes("role")) setError(""); }}
                    className="w-full bg-transparent py-4 px-4 text-base text-[#222222] outline-none appearance-none cursor-pointer font-medium h-14"
                  >
                    <option value="" disabled>Select Role...</option>
                    <option value="client">Client</option>
                    <option value="driver">Driver</option>
                    <option value="professional">Professional</option>
                    <option value="service-provider">Service Provider</option>
                    <option value="agent">Agent / Affiliate</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#717171]">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="login-email-input" className="text-[13px] font-bold text-[#222222] tracking-wide ml-1">
                  Email Address
                </label>
                <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                  <input
                    id="login-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                    onBlur={(e) => checkRoles(e.target.value)}
                    className="w-full bg-transparent py-4 px-4 text-base text-[#222222] outline-none placeholder:text-[#B0B0B0] font-medium h-14"
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label htmlFor="login-password-input" className="text-[13px] font-bold text-[#222222] tracking-wide">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[13px] font-bold text-primary hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                  <input
                    id="login-password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent py-4 pl-4 pr-16 text-base text-[#222222] outline-none placeholder:text-[#B0B0B0] font-medium h-14"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    id="login-show-password-button"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#222222] transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {availableRoles.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <p className="text-[12px] text-emerald-600 font-bold uppercase tracking-tight">
                    Found roles: {availableRoles.join(", ")}
                  </p>
                </div>
              )}

              <Button
                id="login-submit-button"
                type="submit"
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-[0.98] h-14 text-base mt-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Log in"
                )}
              </Button>
            </form>

            <div className="mt-4 flex justify-start">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-[#222222] underline hover:text-black transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#DDDDDD]" />
              <span className="text-[12px] text-[#717171]">or</span>
              <div className="h-px flex-1 bg-[#DDDDDD]" />
            </div>

            {/* Social Logins */}
            <div className="space-y-4">
              {/* Google Button Wrapper */}
              <div className="relative h-[48px] border border-[#222222] rounded-lg overflow-hidden hover:bg-slate-50 transition-colors">
                <div className="absolute inset-0 z-10 opacity-0 cursor-pointer scale-[5] origin-top-left">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google sign-in was unsuccessful. Please try again.")}
                    width="100%"
                    theme="outline"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-3 pointer-events-none">
                  {/* Google Icon Placeholder or SVG */}
                  <svg viewBox="0 0 18 18" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285f4" />
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34a853" />
                    <path d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#fbbc05" />
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#ea4335" />
                  </svg>
                  <span className="text-sm font-semibold text-[#222222]">Continue with Google</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center justify-center border border-[#222222] rounded-lg py-3 px-6 hover:bg-slate-50 transition-colors relative"
              >
                <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5" />
                <span className="text-sm font-semibold text-[#222222]">Continue as Guest</span>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#DDDDDD] flex flex-col items-center gap-4 text-center">
              <p className="text-[#222222] text-sm font-normal">
                Don't have an account?{" "}
                <Link
                  id="login-register-link"
                  to="/register"
                  className="font-semibold underline hover:text-black"
                >
                  Sign up
                </Link>
              </p>
              <Link
                to="/admin/login"
                className="text-[11px] font-bold uppercase tracking-wider text-[#717171] hover:text-[#222222] transition-colors mt-2"
              >
                System Administration
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </main>

  );
};

export default Login;
