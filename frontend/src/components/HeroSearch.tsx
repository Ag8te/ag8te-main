import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar, Users, Car, Briefcase, Wrench, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "transport", label: "Ride", icon: Car, color: "bg-[#1e88e5]" },
  { id: "services", label: "Service", icon: Wrench, color: "bg-[#5e35b1]" },
  { id: "professionals", label: "Expert", icon: Briefcase, color: "bg-[#00897b]" },
  { id: "shop", label: "Shop", icon: ShoppingBag, color: "bg-[#e53935]" },
];

const HeroSearch = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("transport");
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    // Navigate based on active tab
    switch (activeTab) {
      case "transport":
        navigate("/transport");
        break;
      case "services":
        navigate("/services");
        break;
      case "professionals":
        navigate("/professionals");
        break;
      case "shop":
        navigate("/shop");
        break;
    }
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 bg-white overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-100/40 to-blue-50/40 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-rose-50/40 to-orange-50/40 blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <motion.h1
            className="text-5xl md:text-7xl font-semibold text-[#222222] tracking-tight leading-[1.1] mb-6"
          >
            Find exactly <br className="hidden md:block" />
            <span className="text-primary">
              what you need.
            </span>
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-slate-500 font-normal max-w-2xl mx-auto leading-relaxed"
          >
            The all-in-one ads for South Africa. Book rides, hire experts, and shop local brands.
          </motion.p>
        </div>

        {/* Search Interface */}
        <motion.div
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-50 p-2 lg:p-3">
            {/* Tabs */}
            <div className="flex p-1 gap-1 mb-3 overflow-x-auto no-scrollbar border-b border-slate-50">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex flex-col md:flex-row items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-semibold transition-all duration-300 min-w-[120px] relative",
                      isActive
                        ? "text-[#222222]"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-400")} />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-primary rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="rounded-[2.5rem] p-2 flex flex-col md:flex-row gap-2 relative">
              <div className="flex-[1.5] relative group">
                <div className="absolute top-1/2 -translate-y-1/2 left-6 text-slate-400 group-focus-within:text-primary transition-colors">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder={
                    activeTab === 'transport' ? "Where to? e.g. Sandton City" :
                      activeTab === 'services' ? "What help do you need? e.g. Cleaning" :
                        activeTab === 'professionals' ? "Who are you looking for? e.g. Accountant" :
                          "Search products..."
                  }
                  className="w-full h-16 bg-slate-50/50 rounded-3xl pl-16 pr-6 text-lg font-medium text-[#222222] placeholder:text-slate-400 outline-none border border-transparent focus:bg-white focus:border-primary/20 transition-all"
                />
              </div>

              {activeTab === 'transport' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 relative group">
                  <div className="absolute top-1/2 -translate-y-1/2 left-6 text-slate-400 group-focus-within:text-primary transition-colors">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Pick-up Location"
                    className="w-full h-16 bg-slate-50/50 rounded-3xl pl-16 pr-6 text-lg font-medium text-[#222222] placeholder:text-slate-400 outline-none border border-transparent focus:bg-white focus:border-primary/20 transition-all"
                  />
                </motion.div>
              )}

              <Button
                className="h-16 px-10 rounded-3xl bg-[#FF385C] hover:bg-[#D90B3E] text-white shadow-lg hover:shadow-xl transition-all active:scale-95 shrink-0 font-bold text-lg"
                onClick={handleSearch}
              >
                <Search className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline">Search</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Tags */}
        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          <span className="text-sm font-bold text-[#717171] py-2">Browse:</span>
          {["Plumber", "Driver", "Web Designer", "Electrician", "House Cleaner"].map((tag) => (
            <button
              key={tag}
              className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-[#222222] hover:border-black hover:scale-105 transition-all shadow-sm"
              onClick={() => {
                // In a real app, this would pre-fill search
                navigate('/services');
              }}
            >
              {tag}
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSearch;
