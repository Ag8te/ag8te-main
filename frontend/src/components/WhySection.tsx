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
  description: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Clock, BadgeCheck, Headphones,
  Star, Zap, Heart, Globe, Award, Users, Smile, Phone,
};

const FALLBACK: Feature[] = [
  { id: "1", icon: "ShieldCheck", title: "Fully Verified", description: "Every provider is vetted through, Home Affairs, CIPC, and SAPS databases." },
  { id: "2", icon: "Clock", title: "Instant Booking", description: "Book any service in seconds. No long calls, no waiting — just tap and go." },
  { id: "3", icon: "BadgeCheck", title: "Accredited Experts", description: "Professional bodies validate credentials so you don't have to do due diligence." },
  { id: "4", icon: "Headphones", title: "Dedicated Support", description: "Our Mzansi-based support team is available to help — any time, any issue." },
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

  return (
    <section
      id="about"
      ref={ref}
      className="py-12 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/5 relative"
    >
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%2314B8A6\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

      <div className="container relative mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-[#222222] mb-3">
            Why <span className="text-primary">MzansiServe</span>?
          </h2>
          <p className="text-base md:text-lg text-slate-600 font-normal max-w-xl mx-auto">
            Built by South Africans, for South Africans. We go beyond connecting — we verify, validate, and protect.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid gap-8 max-w-6xl mx-auto md:grid-cols-2 lg:grid-cols-4">
          {displayed.map((feat, i) => {
            const IconComponent = ICON_MAP[feat.icon] || ShieldCheck;
            return (
              <motion.div
                key={feat.id}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-start"
              >
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-[#222222] mb-3">{feat.title}</h3>
                <p className="text-slate-600 font-normal leading-relaxed text-sm">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhySection;
