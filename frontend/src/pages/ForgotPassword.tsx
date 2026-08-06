import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const role = searchParams.get("role") || "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Please enter your email address");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await apiFetch("/api/auth/forgot-password", {
                method: "POST",
                data: { email, ...(role ? { role } : {}) },
            });

            if (result.success) {
                setSuccess(true);
                toast({
                    title: "Reset link sent",
                    description: "If an account exists for this email, we've sent a reset link.",
                });
            } else {
                setError(typeof result.error === 'string' ? result.error : "Failed to send reset link");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
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
                        <button
                            onClick={() => navigate(-1)}
                            className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-semibold text-[#222222] hover:text-primary transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span>Back</span>
                        </button>
                        <h1 className="text-base font-bold text-[#222222]">Password reset</h1>
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
                                    <h2 className="text-[22px] font-semibold text-[#222222] mb-2">Forgot your password?</h2>
                                    <p className="text-[#717171] mb-6">Enter the email address associated with your account and we'll send you a link to reset your password.</p>

                                    {error && (
                                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-[#C13515]">
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <p className="text-sm font-normal">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label htmlFor="email" className="text-[13px] font-bold text-[#222222] tracking-wide ml-1">
                                                Email Address
                                            </label>
                                            <div className="relative border border-[#DDDDDD] rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all bg-slate-50/50">
                                                <input
                                                    id="email"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                                    className="w-full bg-transparent py-4 px-4 text-base text-[#222222] outline-none placeholder:text-[#B0B0B0] font-medium h-14"
                                                    placeholder="name@example.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-[0.98] h-14 text-base"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                            ) : (
                                                "Send reset link"
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
                                    <h2 className="text-[22px] font-semibold text-[#222222] mb-3">Check your email</h2>
                                    <p className="text-[#717171] mb-8 max-w-sm mx-auto">
                                        We've sent a password reset link to <span className="font-semibold text-[#222222]">{email}</span>. Please check your inbox and click the link to continue.
                                    </p>
                                    <div className="space-y-3">
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-2xl h-14 font-bold border-[#222222] text-[#222222]"
                                            onClick={() => setSuccess(false)}
                                        >
                                            Didn't get the email? Try again
                                        </Button>
                                        <Link to="/login" className="block text-sm font-semibold text-primary hover:underline underline-offset-4">
                                            Back to login
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </main>
    );
};

export default ForgotPassword;
