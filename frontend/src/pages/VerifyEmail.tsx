import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { openExternalUrl } from "@/lib/native";

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const queryStatus = searchParams.get("status");
    const isPendingPaymentFlow = queryStatus === "pending_payment";
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");
    const { toast } = useToast();
    const navigate = useNavigate();
    const paymentState = searchParams.get("payment");

    const [userData, setUserData] = useState<any>(null);
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        if (token) {
            verifyEmail();
        } else if (isPendingPaymentFlow) {
            const savedUser = localStorage.getItem("registrationPaymentUser") || localStorage.getItem("user");
            if (savedUser) {
                setUserData(JSON.parse(savedUser));
                setStatus("success");
                setLoading(false);
            } else {
                setLoading(false);
                setStatus("error");
                setErrorMsg("User session not found. Please login again.");
            }
        } else {
            setLoading(false);
            setStatus("error");
            setErrorMsg("This page is only available during registration payment.");
        }
    }, [isPendingPaymentFlow, token, searchParams]);

    const verifyEmail = async () => {
        try {
            const result = await apiFetch("/api/auth/verify-email", {
                method: "POST",
                data: { token },
            });

            if (result.success) {
                setStatus("success");
                setUserData(result.data.user);
                localStorage.setItem("registrationPaymentUser", JSON.stringify(result.data.user));
                if (result.data.token) {
                    localStorage.setItem("token", result.data.token);
                }
            } else {
                setStatus("error");
                setErrorMsg(typeof result.error === 'string' ? result.error : "Unable to load your registration details.");
            }
        } catch (err) {
            setStatus("error");
            setErrorMsg("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const initiatePayment = async () => {
        setPaying(true);
        try {
            const result = await apiFetch("/api/auth/initiate-registration-payment", {
                method: "POST",
                data: { provider: "yoco" }
            });
            if (result.success && result.data?.redirect_url) {
                await openExternalUrl(result.data.redirect_url);
            } else if (result.success && result.data?.payment_required === false) {
                const updatedUser = result.data.user || { ...userData, is_paid: true };
                setUserData(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
                localStorage.removeItem("registrationPaymentUser");
                toast({
                    title: "Registration fee settled",
                    description: "Registration is currently free. Your account is ready for admin review.",
                });
            } else {
                toast({
                    title: "Registration Error",
                    description: typeof result.error === 'string' ? result.error : "Could not continue registration. Please try logging in.",
                    variant: "destructive"
                });
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "An expected error occurred.",
                variant: "destructive"
            });
        } finally {
            setPaying(false);
        }
    };

    return (
        <main className="min-h-screen bg-white font-sans flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[568px] border border-[#DDDDDD] rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.12)] overflow-hidden bg-white px-6 py-12 text-center"
            >
                <AnimatePresence mode="wait">
                    {status === "loading" && (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
                            <h1 className="text-2xl font-bold text-[#222222] mb-3">{isPendingPaymentFlow ? "Preparing your registration" : "Loading your registration"}</h1>
                            <p className="text-[#717171]">This will only take a moment. Please stay on this page.</p>
                        </motion.div>
                    )}

                    {status === "success" && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#222222] mb-3">
                                {userData?.is_paid ? "Registration fee settled" : "Complete your registration"}
                            </h1>
                            <p className="text-[#717171] mb-8 max-w-sm mx-auto">
                                {userData?.is_paid
                                    ? "Your registration fee is currently settled at R0.00. If your account still shows pending, our administrator is reviewing your documents."
                                    : "Registration is currently free. Continue so we can submit your account for admin approval."}
                            </p>

                            {userData?.is_paid ? (
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold bg-primary shadow-xl shadow-primary/10 text-base transition-all active:scale-[0.98]"
                                    onClick={() => navigate("/login")}
                                >
                                    Login to Account Management
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    {(paymentState === "cancel" || paymentState === "error") && (
                                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-left">
                                            <p className="text-sm font-semibold text-amber-900">
                                                {paymentState === "cancel"
                                                    ? "Payment was cancelled. Registration is now free, so you can continue without paying."
                                                    : "Payment did not complete. Registration is now free, so you can continue without paying."}
                                            </p>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-14 rounded-2xl font-bold bg-primary shadow-xl shadow-primary/10 text-base transition-all active:scale-[0.98]"
                                        onClick={initiatePayment}
                                        disabled={paying}
                                    >
                                        {paying ? (
                                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Redirecting...</>
                                        ) : (
                                            "Continue Registration (R0.00)"
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 rounded-2xl font-semibold"
                                        onClick={() => navigate("/register")}
                                    >
                                        Back to Registration
                                    </Button>
                                    <p className="text-xs text-slate-400">
                                        You can also <Link to="/login" className="text-primary hover:underline">login later</Link> to complete payment.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {status === "error" && (
                        <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#222222] mb-3">Unable to continue</h1>
                            <p className="text-[#717171] mb-8 max-w-sm mx-auto">{errorMsg}</p>
                            <div className="space-y-4">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold bg-primary shadow-xl shadow-primary/10 text-base transition-all active:scale-[0.98]"
                                    onClick={() => navigate("/login")}
                                >
                                    Login
                                </Button>
                                <div className="flex flex-col gap-2 pt-2">
                                    <Link
                                        to="/register"
                                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Go back to registration
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </main>
    );
};

export default VerifyEmail;
