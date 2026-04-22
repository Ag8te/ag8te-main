import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) { setError("Reset token is missing"); return; }
        if (!password) { setError("Please enter a new password"); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
        if (password !== confirmPassword) { setError("Passwords do not match"); return; }

        setLoading(true);
        setError("");

        try {
            const result = await apiFetch("/api/auth/reset-password", {
                method: "POST",
                data: { token, password },
            });

            if (result.success) {
                setSuccess(true);
                toast({
                    title: "Password updated",
                    description: "Your password has been reset successfully.",
                });
                setTimeout(() => navigate("/login"), 3000);
            } else {
                setError(typeof result.error === 'string' ? result.error : "Failed to reset password");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <main className="min-h-screen bg-white font-sans flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <AlertCircle className="w-12 h-12 text-[#C13515] mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Invalid link</h2>
                    <p className="text-[#717171] mb-6">This password reset link is invalid or has expired.</p>
                    <Link to="/forgot-password">
                        <Button className="w-full h-14 rounded-2xl font-bold bg-primary">Request new link</Button>
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white font-sans relative">
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[568px] border border-[#DDDDDD] rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.12)] overflow-hidden bg-white"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-[#DDDDDD] flex items-center justify-center relative">
                        <h1 className="text-base font-bold text-[#222222]">Set new password</h1>
                    </div>

                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            {!success ? (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <h2 className="text-[22px] font-semibold text-[#222222] mb-2">Create a new password</h2>
                                    <p className="text-[#717171] mb-6">Enter a strong, secure password for your account.</p>

                                    {error && (
                                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-[#C13515]">
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <p className="text-sm font-normal">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label htmlFor="new-password" className="text-[13px] font-bold text-[#222222] tracking-wide ml-1">
                                                New Password
                                            </label>
                                            <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                                <input
                                                    id="new-password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                                    className="w-full bg-transparent py-4 pl-12 pr-12 text-base text-[#222222] outline-none placeholder:text-[#B0B0B0] font-medium h-14"
                                                    placeholder="At least 8 characters"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#222222] transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="confirm-password" className="text-[13px] font-bold text-[#222222] tracking-wide ml-1">
                                                Confirm New Password
                                            </label>
                                            <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                                <input
                                                    id="confirm-password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                                    className="w-full bg-transparent py-4 pl-12 pr-12 text-base text-[#222222] outline-none placeholder:text-[#B0B0B0] font-medium h-14"
                                                    placeholder="Re-enter password"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-[0.98] h-14 text-base mt-2"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                            ) : (
                                                "Update password"
                                            )}
                                        </Button>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                                    </div>
                                    <h2 className="text-[22px] font-semibold text-[#222222] mb-3">Password reset success</h2>
                                    <p className="text-[#717171] mb-8 max-w-sm mx-auto">
                                        Your password has been successfully updated. You can now login with your new credentials.
                                    </p>
                                    <Button
                                        className="w-full rounded-2xl h-14 font-bold bg-primary shadow-xl shadow-primary/10"
                                        onClick={() => navigate("/login")}
                                    >
                                        Back to login now
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </main>
    );
};

export default ResetPassword;
