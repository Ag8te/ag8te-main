import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Car, Briefcase, Wrench, ShoppingBag, ChevronRight, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
    {
        title: "Cab",
        subtitle: "Rides & Deliveries",
        icon: Car,
        href: "/transport",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
        title: "Professionals",
        subtitle: "Medical, Legal, Finance",
        icon: Briefcase,
        href: "/professionals",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
        title: "Services",
        subtitle: "Home, Repair, Maintenance",
        icon: Wrench,
        href: "/services",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
        title: "Shop Hub",
        subtitle: "Order Products",
        icon: ShoppingBag,
        href: "/shop",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
        title: "Ads",
        subtitle: "Classified Ads",
        icon: Tag,
        href: "/ads",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
];

export const QuickActionGrid = () => {
    const navigate = useNavigate();

    return (
        <section className="relative z-20 pb-8 lg:-mt-16 lg:pb-12">
            <div className="w-full">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-6">
                    {actions.map((action, index) => (
                        <motion.div
                            key={action.title}
                            onClick={() => navigate(action.href)}
                            className="group cursor-pointer"
                        >
                            <div className="h-full min-h-[180px] bg-white rounded-lg p-5 shadow-md hover:shadow-xl border border-gray-100 flex flex-col items-start text-left transition-all duration-300 sm:p-6 lg:rounded-2xl lg:hover:-translate-y-1">
                                {/* Icon */}
                                <div className={cn(
                                    "w-14 h-14 rounded-lg flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 sm:w-16 sm:h-16 sm:mb-6 sm:rounded-xl",
                                    action.iconBg
                                )}>
                                    <action.icon className="h-8 w-8 text-white" />
                                </div>

                                <h3 className="text-xl font-semibold text-[#222222] mb-1">{action.title}</h3>
                                <p className="text-sm text-slate-500 font-normal mb-4 flex-1">{action.subtitle}</p>

                                <div className="flex items-center gap-1 text-[13px] font-medium text-primary group-hover:gap-2 transition-all">
                                    Explore <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
