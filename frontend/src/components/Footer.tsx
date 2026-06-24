import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Heart, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import logo from "@/assets/brand-mark.png";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";


const Footer = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [contactInfo, setContactInfo] = useState({
    address: "Johannesburg, Gauteng, South Africa",
    phone: "+27 (0) 11 000 0000",
    email: "info@mzansiserve.co.za",
    company_name: "MzansiServe",
  });
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState("");

  useEffect(() => {
    apiFetch("/api/public/footer")
      .then(res => {
        if (res.success && res.data?.footer) {
          setContactInfo({
            address: res.data.footer.physical_address || "Johannesburg, Gauteng, South Africa",
            phone: res.data.footer.phone || "+27 (0) 11 000 0000",
            email: res.data.footer.email || "info@mzansiserve.co.za",
            company_name: res.data.footer.company_name || "MzansiServe",
          });
        }
      })
      .catch(() => { });
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubscribeStatus("subscribed");
    setEmail("");
    setTimeout(() => setSubscribeStatus(""), 4000);
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const getDashboardPath = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin": return "/admin";
      case "driver": return "/dashboard/driver";
      case "professional": return "/dashboard/professional";
      case "service-provider": return "/dashboard/provider";
      case "agent": return "/dashboard/agent";
      default: return "/my-bookings";
    }
  };

  const currentNav = {
    Services: [
      { label: "Transport & Cabs", to: "/transport", isProtected: true },
      { label: "Professional Services", to: "/professionals", isProtected: true },
      { label: "Service Providers", to: "/services", isProtected: true },
      { label: "E-Commerce Shop", to: "/shop", isProtected: true },
      { label: "Classified Ads", to: "/ads" },
    ],
    Account: [
      { label: "Login", to: "/login", show: !isAuthenticated },
      { label: "Register", to: "/register", show: !isAuthenticated },
      { label: "My Bookings", to: isAuthenticated ? "/my-bookings" : "/login", show: true },
      { label: "Account Management", to: isAuthenticated ? getDashboardPath(user?.role) : "/login", show: user?.role !== "client" },
      { label: "Logout", to: "#", show: isAuthenticated, isLogout: true },
    ].filter(l => l.show),
    Company: [
      { label: "Home", to: "/" },
      { label: "About Us", to: "/about" },
      { label: "How It Works", to: "/how-it-works" },
    ],
  };

  return (
    <footer className="w-full font-sans bg-[hsl(var(--sa-black))] border-t border-white/5">

      {/* ── Newsletter strip ─────────────────────────────────────────────── */}
      <div className="py-16 bg-white/[0.03]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="text-left space-y-2 max-w-md">
              <h3 className="text-2xl font-semibold text-white">Stay in the loop</h3>
              <p className="text-slate-400 text-[15px]">
                Subscribe for the latest service updates and deals.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="w-full max-w-md">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    id="footer-newsletter-input"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                  />
                </div>
                <button
                  id="footer-newsletter-submit-button"
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-primary/10 active:scale-95 whitespace-nowrap"
                >
                  Subscribe
                </button>
              </div>
              <AnimatePresence>
                {subscribeStatus === "subscribed" && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-primary text-xs mt-3 font-medium"
                  >
                    ✓ Successfully subscribed!
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>  */}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="py-16 md:py-24 bg-[hsl(var(--sa-black))]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">

            {/* Brand */}
            <div className="lg:col-span-4 space-y-8">
              <Link to="/" onClick={scrollTop} className="inline-flex items-center gap-2 group">
                <div className="flex h-9 w-auto items-center justify-center overflow-hidden rounded-lg bg-primary/20 px-2">
                  <img
                    src={logo}
                    alt={contactInfo.company_name}
                    className="h-7 w-auto object-contain"
                  />
                </div>
                <span className="text-xl font-semibold text-white tracking-tight">
                  {contactInfo.company_name}
                </span>
              </Link>
              <p className="text-slate-400 text-[15px] leading-relaxed max-w-sm">
                MzansiServe is born in South Africa as a comprehensive accessible online marketing platform.Book transport, hire professionals, request services, and shop — all in one trusted p[...]
              </p>

              {/* Social links */}
              <div className="flex gap-2">
                {[
                  { Icon: Facebook, href: "#", label: "Facebook" },
                  { Icon: Twitter, href: "#", label: "Twitter" },
                  { Icon: Instagram, href: "#", label: "Instagram" },
                  { Icon: Linkedin, href: "#", label: "LinkedIn" },
                ].map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-300 border border-white/10"
                  >
                    <Icon size={17} />
                  </a>
                ))}
              </div>
            </div>

            {/* Nav columns */}
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">
              {Object.entries(currentNav).map(([heading, links]) => (
                <div key={heading} className="space-y-5">
                  <h4 className="text-primary font-semibold text-sm uppercase tracking-wider">
                    {heading}
                  </h4>
                  <ul className="space-y-3">
                    {links.map(link => (
                      <li key={link.label}>
                        <Link
                          to={link.isProtected && !isAuthenticated ? `/login?from=${link.to}` : link.to}
                          onClick={scrollTop}
                          className="text-slate-400 hover:text-white transition-colors text-sm font-normal"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Contact column */}
              <div className="space-y-5">
                <h4 className="text-primary font-semibold text-sm uppercase tracking-wider">Contact</h4>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3 text-slate-400 group">
                    <MapPin size={14} className="text-slate-500 group-hover:text-primary transition-colors shrink-0" />
                    <span className="group-hover:text-white transition-colors">{contactInfo.address}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 group">
                    <Phone size={14} className="text-slate-500 group-hover:text-primary transition-colors shrink-0" />
                    <span className="group-hover:text-white transition-colors">{contactInfo.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 group">
                    <Mail size={14} className="text-slate-500 group-hover:text-primary transition-colors shrink-0" />
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="hover:text-white transition-colors"
                    >
                      {contactInfo.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom bar ─────────────────────────────────────────────────── */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4 text-slate-500 text-[13px] font-normal">
              <span>© {new Date().getFullYear()} {contactInfo.company_name} (Pty) Ltd. All rights reserved.</span>
              <div className="hidden md:block w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <span>Made in South Africa</span>
                <Heart size={12} className="text-rose-500 fill-rose-500" />
              </div>
            </div>

            <div className="flex gap-6">
              {["Terms", "Privacy", "Cookies"].map(t => (
                <Link
                  key={t}
                  to={`/${t.toLowerCase()}`}
                  onClick={scrollTop}
                  className="text-slate-500 hover:text-white transition-colors text-[13px] font-medium"
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
