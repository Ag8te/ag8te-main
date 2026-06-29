import { motion } from "framer-motion";
import { Search, CalendarCheck, Smile } from "lucide-react";

const steps = [
    {
        number: "01",
        title: "Find a Service",
        description: "Search for drivers, professionals, or home services in your area.",
        icon: "🔍",
    },
    {
        number: "02",
        title: "Book & Pay",
        description: "Choose your professional, schedule a time, and pay securely online.",
        icon: "📅",
    },
    {
        number: "03",
        title: "Enjoy Mzansi Quality",
        description: "Relax while our verified providers handle the rest with top-tier service.",
        icon: "😊",
    },
];

export const HowItWorks = () => {
    return (
        <section className="mobile-app-how-section py-12 bg-white relative">
            {/* Subtle dot pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E5E7EB\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

            <div className="container mx-auto px-6 relative z-10">
                {/* Header */}
                <h2 className="text-3xl md:text-4xl font-semibold text-center mb-2 text-[#222222]">
                    Simple Steps to <span className="text-primary">Your Service</span>
                </h2>
                <p className="mobile-app-how-copy text-lg text-slate-600 font-normal text-center mb-10 max-w-xl mx-auto">
                    We've made finding and booking quality South African services as easy as three steps.
                </p>

                <div className="relative">
                    <div className="mobile-app-how-grid grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
                        {/* Connecting line */}
                        <div
                            className="hidden md:block absolute h-1 bg-primary/20 z-0"
                            style={{
                                top: "64px",
                                left: "calc(16.666% + 64px)",
                                right: "calc(16.666% + 64px)",
                            }}
                        />

                        {steps.map((step, index) => (
                            <motion.div
                                key={step.number}
                                className="relative flex flex-col items-center text-center"
                            >
                                {/* Circle + number badge */}
                                <div className="relative mb-6 z-10">
                                    <div className="w-28 h-28 md:w-32 md:h-32 flex items-center justify-center bg-white rounded-full shadow-md relative">
                                        <div className="absolute inset-0 bg-primary/10 rounded-full" />
                                        <span className="text-4xl md:text-5xl relative z-10" role="img" aria-label={step.title}>
                                            {step.icon}
                                        </span>
                                        <div className="absolute -top-2 -right-2 bg-primary text-white w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold text-xs md:text-sm shadow-md z-20">
                                            {step.number}
                                        </div>
                                    </div>
                                </div>

                                <div className="max-w-xs mt-6">
                                    <h3 className="text-xl md:text-2xl font-semibold text-[#222222] mb-2">{step.title}</h3>
                                    <p className="text-sm md:text-base text-slate-600 font-normal leading-relaxed">{step.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
