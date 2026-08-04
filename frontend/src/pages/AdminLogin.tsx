import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { adminLogin } = useAuth();
    const isPasswordResetRequired = error.toLowerCase().includes("reset your password");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Please fill in both fields.");
            return;
        }

        setLoading(true);
        try {
            const result = await adminLogin(email, password);

            if (result.success) {
                toast({ title: "Admin Authenticated", description: "Welcome to the Super Admin Account Management area." });
                navigate("/admin");
            } else {
                setError(result.error || "Login failed.");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during admin login.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-white font-sans relative">
            <div className="flex min-h-screen items-center justify-center px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[568px] border border-[#DDDDDD] rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.12)] overflow-hidden bg-white"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-[#DDDDDD] flex items-center justify-center relative">
                        <h1 className="text-base font-bold text-[#222222]">Admin Access Only</h1>
                        <ShieldCheck className="w-5 h-5 text-primary absolute right-6" />
                    </div>

                    <div className="p-6">
                        <div className="mb-8">
                            <h2 className="text-[22px] font-semibold text-[#222222]">Admin Portal</h2>
                            <p className="text-sm text-[#717171] mt-1">Authorized personnel only. Please verify your identity.</p>
                        </div>

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
                                        {isPasswordResetRequired && (
                                            <Link
                                                to="/forgot-password?role=admin"
                                                className="mt-2 inline-flex text-[13px] font-bold underline hover:text-red-800 transition-colors"
                                            >
                                                Reset password
                                            </Link>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Email */}
                            <div className="space-y-2">
                                <label htmlFor="admin-email-input" className="text-[13px] font-bold text-[#222222] tracking-wide ml-1">
                                    Admin Email Address
                                </label>
                                <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                                    <input
                                        id="admin-email-input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                                        className="w-full bg-transparent py-4 px-4 text-base text-[#222222] outline-none placeholder:text-[#B0B0B0] font-medium h-14"
                                        placeholder="admin@ag8te.com"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label htmlFor="admin-password-input" className="text-[13px] font-bold text-[#222222] tracking-wide">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        className="text-[13px] font-bold text-primary hover:underline underline-offset-4"
                                        onClick={() => navigate("/forgot-password?role=admin")}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                                    <input
                                        id="admin-password-input"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent py-4 pl-4 pr-16 text-base text-[#222222] outline-none placeholder:text-[#B0B0B0] font-medium h-14"
                                        placeholder="Enter administrator password"
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        id="admin-show-password-button"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#222222] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                id="admin-login-submit-button"
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-[0.98] h-14 text-base mt-2"
                                disabled={loading || isPasswordResetRequired}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                    "Administrator Login"
                                )}
                            </Button>
                        </form>

                        <div className="mt-4 flex justify-start">
                            <Link to="/forgot-password?role=admin" className="text-sm font-semibold text-[#222222] underline hover:text-black transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <div className="mt-8 pt-6 border-t border-[#DDDDDD] flex flex-col items-center gap-4 text-center">
                            <Link
                                to="/login"
                                className="flex items-center gap-2 text-sm font-semibold text-[#222222] underline hover:text-black transition-colors"
                            >
                                <Lock className="w-4 h-4" />
                                Standard User Portal
                            </Link>
                            <p className="text-[10px] font-bold text-[#717171] uppercase tracking-[0.2em] mt-2">
                                AG8TE © 2026 • Security Protocol V2
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </main>
    );
};

export default AdminLogin;
