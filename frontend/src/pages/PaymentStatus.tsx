import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Home, CreditCard, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";

const PaymentStatus = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');

    useEffect(() => {
        // Artificial delay for high-end feel
        const timer = setTimeout(() => {
            const callbackStatus = searchParams.get("callback_status");
            const paymentParam = searchParams.get("payment");

            if (callbackStatus === "success" || paymentParam === "success") {
                setStatus('success');
            } else if (callbackStatus === "failure" || paymentParam === "error") {
                setStatus('failed');
            } else if (callbackStatus === "cancel" || paymentParam === "cancel") {
                setStatus('cancelled');
            } else {
                setStatus('failed');
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [searchParams]);

    const containerVariants: any = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    const iconVariants: any = {
        hidden: { scale: 0.8, opacity: 0 },
        visible: {
            scale: 1,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 10,
                delay: 0.2
            }
        }
    };

    return (
        <main className="min-h-screen bg-background selection:bg-primary/20">
            <Navbar />

            <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
                {/* Ambient Background Glows */}
                <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-sa-gold/10 blur-[100px]" />

                <div className="relative w-full max-w-xl">
                    <AnimatePresence mode="wait">
                        {status === 'loading' ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center space-y-8"
                            >
                                <div className="relative mx-auto h-24 w-24">
                                    <Loader2 className="h-24 w-24 animate-spin text-primary opacity-20" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <CreditCard className="h-10 w-10 text-primary animate-pulse" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                        Securely Verifying <span className="text-primary italic">Payment</span>
                                    </h1>
                                    <p className="max-w-xs mx-auto text-muted-foreground">
                                        Please don't close this window while we finalize your account activation.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={status}
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden"
                            >
                                {/* Decorative border accent */}
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                                {status === 'success' && (
                                    <div className="text-center space-y-8">
                                        <motion.div
                                            variants={iconVariants}
                                            className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] text-white"
                                        >
                                            <CheckCircle2 className="h-14 w-14" />
                                        </motion.div>

                                        <div className="space-y-4">
                                            <h1 className="text-4xl font-extrabold tracking-tighter text-foreground">
                                                Welcome to the <span className="text-primary">Family!</span>
                                            </h1>
                                            <div className="flex items-center justify-center gap-2 text-green-500 font-medium bg-green-500/10 py-1.5 px-4 rounded-full w-fit mx-auto">
                                                <ShieldCheck className="h-4 w-4" />
                                                <span>Account Successfully Activated</span>
                                            </div>
                                            <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                                Your registration fee has been processed. You now have full access to South Africa's premier service network.
                                            </p>
                                        </div>

                                        <div className="grid gap-4 pt-4">
                                            <Button asChild className="h-14 w-full bg-gradient-purple text-lg font-bold text-white shadow-glow-purple hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                                                <Link to="/login">
                                                    Start Exploring Now <ArrowRight className="ml-2 h-5 w-5" />
                                                </Link>
                                            </Button>
                                            <Button asChild variant="ghost" className="h-12 w-full hover:bg-muted font-medium">
                                                <Link to="/">Return to Homepage</Link>
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {(status === 'failed' || status === 'cancelled') && (
                                    <div className="text-center space-y-8">
                                        <motion.div
                                            variants={iconVariants}
                                            className={`mx-auto flex h-24 w-24 items-center justify-center rounded-3xl ${status === 'cancelled' ? 'bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'bg-destructive shadow-[0_0_30px_rgba(239,68,68,0.3)]'} text-white`}
                                        >
                                            {status === 'cancelled' ? <AlertCircle className="h-14 w-14" /> : <XCircle className="h-14 w-14" />}
                                        </motion.div>

                                        <div className="space-y-4">
                                            <h1 className="text-4xl font-extrabold tracking-tighter text-foreground">
                                                {status === 'cancelled' ? "Payment Interrupted" : "Payment Declined"}
                                            </h1>
                                            <div className={`flex items-center justify-center gap-2 font-medium py-1.5 px-4 rounded-full w-fit mx-auto ${status === 'cancelled' ? 'text-amber-500 bg-amber-500/10' : 'text-destructive bg-destructive/10'}`}>
                                                <span>{status === 'cancelled' ? "Transaction Cancelled" : "Transaction Failed"}</span>
                                            </div>
                                            <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                                {status === 'cancelled'
                                                    ? "We noticed you cancelled the payment process. Don't worry, your registration data is saved!"
                                                    : "Unfortunately, your payment could not be processed. Please check your card details or try a different method."}
                                            </p>
                                        </div>

                                        <div className="grid gap-4 pt-4">
                                            <Button asChild className="h-14 w-full bg-sa-black hover:bg-sa-black/90 text-lg font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                                                <Link to={`/verify-email?status=pending_payment&payment=${status === 'cancelled' ? 'cancel' : 'error'}`}>
                                                    Choose Payment Method <ArrowRight className="ml-2 h-5 w-5" />
                                                </Link>
                                            </Button>
                                            <Button asChild variant="outline" className="h-12 w-full font-medium">
                                                <Link to="/">
                                                    <Home className="mr-2 h-4 w-4" /> Go to Homepage
                                                </Link>
                                            </Button>
                                        </div>

                                        <p className="text-xs text-muted-foreground italic">
                                            Need help? Contact our support at info@mzansiserve.co.za
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
};

export default PaymentStatus;
