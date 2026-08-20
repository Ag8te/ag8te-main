import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ShieldCheck, Clock, BadgeCheck, Headphones, Users, MapPin, Award, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const stats = [
  { icon: Users, value: "4", label: "Service Categories" },
  { icon: MapPin, value: "9", label: "Provinces Covered" },
  { icon: Award, value: "Secure", label: "Payment Options" },
  { icon: TrendingUp, value: "Local", label: "Customer Support" },
];

const values = [
  { icon: ShieldCheck, title: "Profile Review", description: "We collect and review provider documentation relevant to each role." },
  { icon: Clock, title: "Simple Booking", description: "Choose a service, location, and preferred time in one booking flow." },
  { icon: BadgeCheck, title: "Provider Information", description: "View available credentials, services, ratings, and profile details before booking." },
  { icon: Headphones, title: "Local Support", description: "Contact our South Africa-based support team when you need help." },
];

const About = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="pt-20 pb-10 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'svg\'%3E%3Cg fill=\'%23E5E7EB\' fill-opacity=\'0.5\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-60" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Our Story</span>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-[#222222] mb-6 tracking-tight">
              A South African <br className="hidden md:block" />
              <span className="text-primary underline decoration-primary/10 decoration-8 underline-offset-8">Services Platform</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 font-normal leading-relaxed max-w-3xl mx-auto">
              Built by South Africans, for South Africans. Connect with transport,
              professionals, local providers, and marketplace sellers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <stat.icon className="h-7 w-7 text-white" />
                </div>
                <p className="text-3xl font-semibold text-[#222222] mb-1">{stat.value}</p>
                <p className="text-sm text-slate-500 font-normal">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ──────────────────────────────────────────────────────── */}
      <section ref={ref} className="py-16 bg-white relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E5E7EB\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-[#222222] mb-3">
              Our <span className="text-primary">Values</span>
            </h2>
            <p className="text-lg text-slate-500 font-normal max-w-lg mx-auto">
              We go beyond just connecting — we verify, validate, and protect every interaction.
            </p>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl border border-gray-100 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <v.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#222222] mb-2">{v.title}</h3>
                <p className="text-sm text-slate-500 font-normal leading-relaxed">{v.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/5 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%2314B8A6\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="container mx-auto px-6 relative z-10 text-center max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-semibold text-[#222222] mb-4"
          >
            Ready to Get <span className="text-primary">Started?</span>
          </motion.h2>
          <p className="text-lg text-slate-500 font-normal mb-10">
            Join thousands of South Africans already using AG8TE.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-semibold px-10 py-7 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
              onClick={() => navigate("/register")}
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-primary/30 text-primary hover:bg-primary/5 font-semibold px-10 py-7 rounded-xl transition-all"
              onClick={() => navigate("/services")}
            >
              Browse Services
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default About;
