import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { CheckCircle2, Megaphone, Send, Building2, User, Mail } from "lucide-react";

const Advertise = () => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        company_name: "",
        message: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await apiFetch("/api/ads/inquiry", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            if (res.success) {
                setIsSubmitted(true);
                toast({
                    title: "Application Sent!",
                    description: "Our marketing team will reach out to you via email soon."
                });
            } else {
                const errorMsg = typeof res.error === 'string' ? res.error : res.error?.message;
                toast({
                    variant: "destructive",
                    title: "Submission failed",
                    description: errorMsg || "Something went wrong."
                });
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to connect to the server."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const { isAuthenticated } = require("@/contexts/AuthContext").useAuth();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-grow pt-24 pb-12">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="grid lg:grid-cols-2 gap-10 items-start">

                        {/* Left Side: Copy */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                                <Megaphone size={16} />
                                <span className="text-sm font-bold uppercase tracking-wider">Advertise with us</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a1a1a] leading-tight mb-8">
                                Partner with <span className="text-primary italic">Mzansi's</span> Best
                            </h1>
                            <p className="text-lg text-slate-600 leading-relaxed mb-10">
                                Put your business in front of local customers. Our advertising solutions are designed to help you reach the right audience at the right time.
                            </p>

                            <div className="space-y-6">
                                {[
                                    "Targeted local reach across 9 provinces",
                                    "High conversion intent audiences",
                                    "Flexible pricing for every business size",
                                    "Real-time performance analytics"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <span className="text-slate-700 font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Right Side: Form */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="bg-white rounded-[2rem] p-6 md:p-10 shadow-2xl shadow-slate-200 border border-slate-100"
                        >
                            {isSubmitted ? (
                                <div className="text-center py-12">
                                    <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4">Application Received!</h2>
                                    <p className="text-slate-600 mb-8">
                                        Thank you for your interest in advertising with AG8TE. Our team will review your application and respond to <strong>{formData.email}</strong> shortly.
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="rounded-xl px-8"
                                        onClick={() => setIsSubmitted(false)}
                                    >
                                        Submit another inquiry
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name" className="text-sm font-bold text-[#1a1a1a] ml-1 flex items-center gap-2">
                                            <User size={14} className="text-slate-400" /> Full Name
                                        </Label>
                                        <Input
                                            id="full_name"
                                            placeholder="e.g. Sipho Mokoena"
                                            required
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-bold text-[#1a1a1a] ml-1 flex items-center gap-2">
                                            <Mail size={14} className="text-slate-400" /> Business Email
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="sipho@company.co.za"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="company_name" className="text-sm font-bold text-[#1a1a1a] ml-1 flex items-center gap-2">
                                            <Building2 size={14} className="text-slate-400" /> Company Name
                                        </Label>
                                        <Input
                                            id="company_name"
                                            placeholder="e.g. Mokoena Logistics"
                                            value={formData.company_name}
                                            onChange={handleChange}
                                            className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="message" className="text-sm font-bold text-[#1a1a1a] ml-1">
                                            Tell us about your advertising goals
                                        </Label>
                                        <Textarea
                                            id="message"
                                            placeholder="What services or products are you looking to promote?"
                                            required
                                            rows={4}
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="rounded-xl border-slate-200 focus:border-primary focus:ring-primary resize-none"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-[#1a1a1a] hover:bg-black text-white font-bold h-14 rounded-xl transition-all active:scale-[0.98] mt-4"
                                    >
                                        {isSubmitting ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full"
                                            />
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                Send Inquiry <Send size={18} />
                                            </span>
                                        )}
                                    </Button>

                                    {isAuthenticated && (
                                        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                            <p className="text-sm font-medium text-slate-500 mb-4">Already have campaigns?</p>
                                            <Button
                                                variant="outline"
                                                className="w-full rounded-xl"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    window.location.href = "/dashboard/advertiser";
                                                }}
                                            >
                                                Go to Advertiser Account Management
                                            </Button>
                                        </div>
                                    )}
                                </form>
                            )}
                        </motion.div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Advertise;
