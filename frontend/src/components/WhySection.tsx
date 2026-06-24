import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  ShieldCheck, Clock, BadgeCheck, Headphones,
  Star, Zap, Heart, Globe, Award, Users, Smile, Phone,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Feature {
  id: string;
  icon: string;
  title: string;
  //description: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Clock, BadgeCheck, Headphones,
  Star, Zap, Heart, Globe, Award, Users, Smile, Phone,
};

const FALLBACK: Feature[] = [
  { id: "1", icon: "ShieldCheck", title: "Fully Verified" },
  { id: "2", icon: "Clock", title: "Instant Booking" },
  { id: "3", icon: "BadgeCheck", title: "Accredited Experts"},
  { id: "4", icon: "Headphones", title: "Dedicated Support" },
];

const WhySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    apiFetch("/api/public/landing-features")
      .then(res => {
        const items = res?.data?.features;
        setFeatures(items?.length > 0 ? items : FALLBACK);
      })
      .catch(() => setFeatures(FALLBACK));
  }, []);

  const displayed = features.length > 0 ? features : FALLBACK;


    return ( <section id="about" ref={ref} className="py-4 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/5 relative" >

      {/* Subtle dot pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%2314B8A6\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

      <div className="container relative mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-4"
        >
          <h2 className="text-2xl font-bold text-center mb-1">
            Why <span className="text-primary">MzansiServe</span>?
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Trusted services across South Africa.
          </p>
        </motion.div>

        {/* Feature icons */}
        <div className="grid grid-cols-4 gap-2">
          {displayed.slice(0, 4).map((feat) => {
            const IconComponent = ICON_MAP[feat.icon] || ShieldCheck;

            return (
              <div
                key={feat.id}
                className="flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>

                <h3 className="text-[11px] sm:text-xs font-medium leading-tight">
                  {feat.title}
                </h3>
              </div>
            );
          })}
        </div>
        </div>
    </section>
  );
};

export default WhySection;
