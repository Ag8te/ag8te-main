import { motion } from "framer-motion";
import { Search, CreditCard, CheckCircle, ShieldCheck, Star, Zap, ArrowRight, Smartphone, Calendar, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const steps = [
    {
        icon: Search,
        title: "1. Browse and Choose",
        description: "Search for the service you need — from transport to home services. Browse verified professionals, read reviews, and compare prices.",
        color: "bg-blue-50 text-blue-600",
    },
    {
        icon: Calendar,
        title: "2. Book Instantly",
        description: "Select a time that works for you. Our real-time scheduling system ensures your booking is confirmed immediately without back-and-forth calls.",
        color: "bg-purple-50 text-purple-600",
    },
    {
        icon: CreditCard,
        title: "3. Secure Payment",
        description: "Pay securely through our platform. We use South Africa's leading payment gateways to ensure your transactions are always safe and protected.",
        color: "bg-emerald-50 text-emerald-600",
    },
    {
        icon: CheckCircle,
        title: "4. Service Delivered",
        description: "Your service provider arrives and completes the job. Once finishes, you rate the experience to help maintain high community standards.",
        color: "bg-amber-50 text-amber-600",
    },
];

const guarantees = [
    {
        icon: ShieldCheck,
        title: "Vetted Professionals",
        description: "Every provider on AG8TE undergoes a rigorous multi-step verification process, including criminal background checks and professional credential validation.",
    },
    {
        icon: Zap,
        title: "Real-Time Booking",
        description: "Skip the waiting lists. Our platform connects you with available professionals in real-time, so you can get things done when it matters most.",
    },
    {
        icon: Star,
        title: "Community Trust",
        description: "Transparent reviews and ratings from real users ensure you always know what to expect. Excellence is rewarded, and quality is guaranteed.",
    },
];

const HowItWorks = () => {
    const navigate = useNavigate();

    return (
        <main className="min-h-screen bg-white font-sans">
            <Navbar />

            {/* ── Hero Section ───────────────────────────────────────────────── */}
            <section className="pt-24 pb-12 bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E5E7EB\' fill-opacity=\'0.5\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-60" />
                <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">The Process</span>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-[#222222] mb-4 tracking-tight">
                            How <span className="text-primary">AG8TE</span> Works
                        </h1>
                        <p className="text-base md:text-lg text-slate-500 font-normal leading-relaxed">
                            We've made it easier than ever to book trusted services in South Africa.
                            Our platform handles the vetting and scheduling, so you can focus on what matters.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ── Steps Section ─────────────────────────────────────────────── */}
            <section className="py-16 bg-white border-y border-slate-50">
                <div className="container mx-auto px-6">
                    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center max-w-6xl mx-auto">
                        {/* Steps Left */}
                        <div className="space-y-12">
                            {steps.map((step, i) => (
                                <motion.div
                                    key={step.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    viewport={{ once: true }}
                                    className="flex gap-6"
                                >
                                    <div className={`shrink-0 w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                                        <step.icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-semibold text-[#222222]">{step.title}</h3>
                                        <p className="text-slate-500 font-normal leading-relaxed">{step.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Visual Right */}
                        <div className="relative">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8 }}
                                viewport={{ once: true }}
                                className="relative z-10 bg-slate-50 rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-2xl shadow-slate-200/50"
                            >
                                <div className="aspect-[4/3] bg-white rounded-3xl overflow-hidden shadow-inner flex items-center justify-center p-8">
                                    <div className="w-full max-w-xs space-y-4">
                                        <div className="h-10 bg-slate-100 rounded-xl w-3/4 animate-pulse" />
                                        <div className="h-32 bg-slate-50 rounded-xl w-full animate-pulse" />
                                        <div className="flex gap-3">
                                            <div className="h-10 bg-primary/10 rounded-xl w-1/2 animate-pulse" />
                                            <div className="h-10 bg-slate-100 rounded-xl w-1/2 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
                                <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                            </motion.div>

                            {/* Floating badges */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.6 }}
                                viewport={{ once: true }}
                                className="absolute -top-10 -right-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-50 hidden md:flex items-center gap-3 z-20"
                            >
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                    <UserCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#222222]">Verified Expert</p>
                                    <p className="text-[10px] text-slate-500">Credential Checked</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Guarantees Section ────────────────────────────────────────── */}
            <section className="py-16 bg-slate-50/50">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-10"
                    >
                        <h2 className="text-2xl md:text-3xl font-semibold text-[#222222] mb-3">
                            Our <span className="text-primary">Safety</span> First Approach
                        </h2>
                        <p className="text-slate-500 font-normal max-w-xl mx-auto">
                            Your safety and satisfaction are our top priorities. Every transaction and booking is backed by our trust framework.
                        </p>
                    </motion.div>

                    <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
                        {guarantees.map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                viewport={{ once: true }}
                                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300"
                            >
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-[#222222] mb-3">{item.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed font-normal">{item.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Section ───────────────────────────────────────────────── */}
            <section className="py-16 bg-white relative">
                <div className="container mx-auto px-6 relative z-10 text-center max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="bg-[#222222] rounded-[3rem] p-10 lg:p-12 text-white relative overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-semibold mb-6">Experience the AG8TE Way</h2>
                            <p className="text-slate-400 text-lg mb-10 font-normal">
                                Join thousands of users who have simplified their lives with our trusted platform.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                <Button
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90 text-white font-semibold px-10 py-7 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
                                    onClick={() => navigate("/register")}
                                >
                                    Get Started for Free
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 font-semibold px-10 py-7 rounded-xl transition-all"
                                    onClick={() => navigate("/login")}
                                >
                                    Sign In
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </main>
    );
};

export default HowItWorks;
