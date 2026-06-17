import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Megaphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AdsInvitation = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const navigate = useNavigate();

    return (
        <section ref={ref} className="py-24 bg-slate-50">
            <div className="container mx-auto px-6">
                <motion.div
                    className="relative overflow-hidden rounded-[2.5rem] bg-[#1a1a1a] p-12 lg:p-20 text-white shadow-2xl"
                >
                    {/* Subtle Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent opacity-50" />

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1 text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8">
                                <Megaphone size={16} />
                                <span className="text-sm font-semibold tracking-wide uppercase">Partnership Opportunity</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8">
                                Reach Millions within our <br />
                                <span className="text-primary italic">Growing Ecosystem</span>
                            </h2>

                            <p className="text-lg md:text-xl text-slate-400 font-normal leading-relaxed mb-10 max-w-2xl">
                                Elevate your brand with hyper-local targeting. Join MzansiServe's exclusive network of advertisers and connect with South Africans when it matters most.
                            </p>

                            <div className="flex flex-wrap items-center gap-6">
                                <Button
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90 text-white font-bold px-10 py-8 rounded-2xl shadow-xl hover:shadow-primary/20 transition-all hover:scale-105 active:scale-95 group"
                                    onClick={() => navigate("/advertise")}
                                >
                                    Start Advertising Now
                                    <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </Button>

                                <div className="flex -space-x-3 items-center">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-[#1a1a1a] bg-slate-800 flex items-center justify-center overflow-hidden">
                                            <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Partner" className="w-full h-full object-cover opacity-80" />
                                        </div>
                                    ))}
                                    <p className="ml-6 text-sm text-slate-500 font-medium">Joined by 500+ local brands</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 relative w-full lg:w-auto h-[400px] lg:h-[500px]">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1a1a]/80 z-10" />
                            <img
                                src="https://images.unsplash.com/photo-1557804506-669a67965ba0?fm=jpg&fit=crop&q=80&w=1000"
                                alt="Advertising on MzansiServe"
                                className="w-full h-full object-cover rounded-3xl opacity-60"
                            />
                            <div className="absolute bottom-10 left-10 right-10 z-20">
                                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                                    <p className="text-primary font-bold text-2xl mb-1">98%</p>
                                    <p className="text-white/70 text-sm">Engagement rate increase for our local partners last year.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default AdsInvitation;
