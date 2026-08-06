import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface LoginRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
}

const LoginRequiredModal = ({
    isOpen,
    onClose,
    title = "Sign in to continue",
    description = "Create a free account or log in to access this feature and enjoy the full AG8TE experience.",
}: LoginRequiredModalProps) => {
    const navigate = useNavigate();

    /* ── lock body scroll while open ─────────────────────────── */
    useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    /* ── keyboard close ───────────────────────────────────────── */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const handleLogin = () => { onClose(); navigate("/login"); };
    const handleRegister = () => { onClose(); navigate("/register"); };

    return (
        <AnimatePresence>
            {isOpen && (
                /*
                 * Single fixed wrapper that:
                 *  - covers the whole screen (backdrop)
                 *  - centres its child with flexbox (no translate math needed)
                 *  - on mobile → aligns children to the bottom edge
                 *  - on sm+    → centres vertically
                 */
                <motion.div
                    key="modal-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-6 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}           /* click backdrop → close */
                >
                    {/* ── Panel ───────────────────────────────────────── */}
                    <motion.div
                        key="modal-panel"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-[0_32px_80px_rgba(0,0,0,0.22)] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}  /* don't close when clicking panel */
                    >
                        {/* ── Top accent bar ─────────────────────────────── */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/60" />

                        {/* ── Drag handle (mobile) ────────────────────────── */}
                        <div className="flex justify-center pt-3 sm:hidden">
                            <div className="w-10 h-1 rounded-full bg-slate-200" />
                        </div>

                        {/* ── Close button ───────────────────────────────── */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>

                        <div className="px-8 pt-6 pb-8">
                            {/* ── Icon ───────────────────────────────────────── */}
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                                    <LogIn className="h-7 w-7 text-white" strokeWidth={1.8} />
                                </div>
                            </div>

                            {/* ── Heading ────────────────────────────────────── */}
                            <h2 className="text-2xl font-semibold text-[#222222] text-center mb-2 tracking-tight">
                                {title}
                            </h2>
                            <p className="text-sm text-slate-500 font-normal text-center leading-relaxed mb-8">
                                {description}
                            </p>

                            {/* ── Primary CTA ────────────────────────────────── */}
                            <Button
                                id="login-required-modal-register-btn"
                                onClick={handleRegister}
                                className="w-full h-13 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-[15px] mb-3"
                            >
                                <UserPlus className="h-4 w-4 mr-2" strokeWidth={2} />
                                Create a Free Account
                            </Button>

                            {/* ── Secondary CTA ──────────────────────────────── */}
                            <Button
                                id="login-required-modal-login-btn"
                                onClick={handleLogin}
                                variant="outline"
                                className="w-full h-13 py-4 rounded-xl border-2 border-slate-200 text-[#222222] hover:border-slate-300 hover:bg-slate-50 font-medium text-[15px] transition-all"
                            >
                                <LogIn className="h-4 w-4 mr-2" strokeWidth={1.8} />
                                Log In
                            </Button>

                            {/* ── Dismiss link ───────────────────────────────── */}
                            <button
                                onClick={onClose}
                                className="mt-5 w-full text-center text-[13px] text-slate-400 hover:text-slate-600 font-normal transition-colors"
                            >
                                Maybe later
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoginRequiredModal;
