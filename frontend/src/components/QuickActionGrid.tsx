import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Car, Briefcase, Wrench, ShoppingBag, ChevronRight, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
    {
        title: "Cab",
        mobileTitle: "Cab Rides",
        subtitle: "Rides & Deliveries",
        icon: Car,
        href: "/transport",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
        title: "Professionals",
        mobileTitle: "Professionals",
        subtitle: "Medical, Legal, Finance",
        icon: Briefcase,
        href: "/professionals",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
        title: "Services",
        mobileTitle: "Service Providers",
        subtitle: "Home, Repair, Maintenance",
        icon: Wrench,
        href: "/services",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
        title: "Shop Hub",
        mobileTitle: "Shop",
        subtitle: "Order Products",
        icon: ShoppingBag,
        href: "/shop",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
        title: "Ads",
        mobileTitle: "Advertisements",
        subtitle: "Classified Ads",
        icon: Tag,
        href: "/ads",
        iconBg: "bg-gradient-to-br from-primary to-primary/80",
    },
];

export const QuickActionGrid = () => {
    const navigate = useNavigate();

    return (
        <section className="mobile-app-quick-actions relative z-20 pb-8 lg:-mt-16 lg:pb-12">
            <div className="w-full">
                <div className="grid grid-cols-3 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5 lg:gap-6">
                    {actions.map((action, index) => (
                        <motion.div
                            key={action.title}
                            onClick={() => navigate(action.href)}
                            className="group cursor-pointer"
                        >
                            <div className="flex h-full min-h-[92px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm transition-all duration-300 hover:shadow-md md:min-h-[180px] md:items-start md:justify-start md:rounded-lg md:p-5 md:text-left md:shadow-md md:hover:shadow-xl lg:rounded-2xl lg:hover:-translate-y-1">
                                {/* Icon */}
                                <div className={cn(
                                    "mb-2 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105 md:mb-6 md:h-16 md:w-16 md:rounded-xl md:shadow-lg md:group-hover:scale-110",
                                    action.iconBg
                                )}>
                                    <action.icon className="h-5 w-5 text-white md:h-8 md:w-8" />
                                </div>

                                <h3 className="text-[10px] font-semibold leading-tight text-[#222222] md:mb-1 md:text-xl">
                                    <span className="md:hidden">{action.mobileTitle || action.title}</span>
                                    <span className="hidden md:inline">{action.title}</span>
                                </h3>
                                <p className="hidden text-sm text-slate-500 font-normal mb-4 flex-1 md:block">{action.subtitle}</p>

                                <div className="hidden items-center gap-1 text-[13px] font-medium text-primary transition-all group-hover:gap-2 md:flex">
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
