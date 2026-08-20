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
                                Reach South African customers <br />
                                <span className="text-primary italic">through AG8TE</span>
                            </h2>

                            <p className="text-lg md:text-xl text-slate-400 font-normal leading-relaxed mb-10 max-w-2xl">
                                Promote your products and services with local targeting and connect with relevant audiences across South Africa.
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

                                <p className="text-sm text-slate-400 font-medium">
                                    Advertising options for local businesses
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 relative w-full lg:w-auto h-[400px] lg:h-[500px]">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1a1a]/80 z-10" />
                            <img
                                src="https://images.unsplash.com/photo-1557804506-669a67965ba0?fm=jpg&fit=crop&q=80&w=1000"
                                alt="Advertising on AG8TE"
                                className="w-full h-full object-cover rounded-3xl opacity-60"
                            />
                            <div className="absolute bottom-10 left-10 right-10 z-20">
                                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                                    <p className="text-primary font-bold text-2xl mb-1">Local reach</p>
                                    <p className="text-white/70 text-sm">Present your offering to audiences in the areas you serve.</p>
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
