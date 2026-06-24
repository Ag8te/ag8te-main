import { motion } from "framer-motion";
import {
  Car,
  Briefcase,
  Wrench,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const actions = [
  {
    title: "Cab",
    icon: Car,
    iconBg: "bg-gradient-to-br from-primary to-primary/80",
    href: "/transport",
  },
  {
    title: "Professionals",
    icon: Briefcase,
    iconBg: "bg-gradient-to-br from-primary to-primary/80",
    href: "/professionals",
  },
  {
    title: "Service Provider",
    icon: Wrench,
    iconBg: "bg-gradient-to-br from-primary to-primary/80",
    href: "/services",
  },
  {
    title: "Shop Hub",
    icon: ShoppingBag,
    iconBg: "bg-gradient-to-br from-primary to-primary/80",
    href: "/shop",
  },
  {
    title: "Ads",
    icon: Tag,
    iconBg: "bg-gradient-to-br from-primary to-primary/80",
    href: "/ads",
  },
];

export const QuickActionGrid = () => {
    const navigate = useNavigate();
  return (
    <section className="relative z-20 px-4 py-2">
      <div className="grid grid-cols-3 gap-4">
        {actions.map((action) => (
          <motion.button
            key={action.title}
            whileTap={{ scale: 0.92 }}
            whileHover={{ y: -2 }}
            className="group w-full"
            onClick={() => {
              console.log(action.href);
              navigate(action.href);
            }}
          >
            <div
              className="
                bg-white
                rounded-2xl
                p-3
                border
                border-slate-100
                shadow-sm
                transition-all
                duration-300
                group-hover:shadow-md
                group-hover:border-primary/20
                flex
                flex-col
                items-center
                justify-center
                min-h-[105px]
              "
            >
              <div
                className={cn(
                  action.title === "Professionals"
                    ? "w-16 h-16"
                    : "w-14 h-14",
                  "rounded-2xl flex items-center justify-center shadow-sm",
                  action.iconBg
                )}
              >
                <action.icon
                  className={cn(
                    action.title === "Professionals"
                      ? "h-8 w-8"
                      : "h-7 w-7",
                    "text-white"
                  )}
                />
              </div>

              <span className="mt-3 text-xs font-semibold text-slate-800 text-center leading-tight">
                {action.title}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};