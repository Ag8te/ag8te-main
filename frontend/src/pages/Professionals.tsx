import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, ArrowLeft, Filter, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchFilter from "@/components/SearchFilter";
import ProviderCard from "@/components/ProviderCard";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const Professionals = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [subcategory, setSubcategory] = useState("all");
  const [location, setLocation] = useState("all");

  const { data: fetchResult, isLoading, error } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => apiFetch("/api/profile/professionals"),
  });

  const professionals = useMemo(() => {
    if (!fetchResult?.data?.professionals) return [];
    return fetchResult.data.professionals.map((p: any) => {
      const user = p.professional;
      const data = user.data || {};
      const fullName = `${data.full_name || ""} ${data.surname || ""}`.trim();
      const firstService = p.services?.length > 0 ? p.services[0] : null;
      const mockBanners = [
        "https://images.unsplash.com/photo-1541888081628-912235c4eb5e?q=80&w=800&fm=jpg&fit=crop",
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&fm=jpg&fit=crop",
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&fm=jpg&fit=crop",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&fm=jpg&fit=crop",
      ];
      return {
        id: user.id,
        name: fullName || "Professional",
        category: "Professionals",
        subcategory: firstService?.name || data.highest_qualification || "Professional Services",
        servicesList: p.services?.map((s: any) => s.name) || [],
        rating: 5.0,
        reviews: 0,
        location: "Available",
        price: p.min_hourly_rate ? `R${p.min_hourly_rate}` : "Quote",
        priceUnit: "/hour",
        description: firstService?.description || "Certified professional ready to assist you.",
        verified: user.is_approved,
        image: user.profile_image_url || `https://i.pravatar.cc/150?u=${user.id}`,
        bannerImage: user.banner_url || mockBanners[user.id % 4],
        available: true,
      };
    });
  }, [fetchResult]);

  const dynamicSubcategories = useMemo(() => {
    const subcats = new Set<string>();
    professionals.forEach((p: any) => {
      if (p.servicesList) {
        p.servicesList.forEach((s: string) => subcats.add(s));
      }
    });
    return Array.from(subcats).sort();
  }, [professionals]);

  const filtered = useMemo(() =>
    professionals.filter((p: any) => {
      if (subcategory !== "all" && p.subcategory !== subcategory && (!p.servicesList || !p.servicesList.includes(subcategory))) return false;
      if (location !== "all" && p.location !== location) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q);
      }
      return true;
    }),
    [search, subcategory, location, professionals]
  );

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* ── Page header ── */}
      <section className="pt-40 pb-16 bg-white relative overflow-hidden border-b border-slate-50">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 max-w-6xl mx-auto">
            <div className="flex-1">
              <span className="inline-block mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">Expert Directory</span>
              <h1 className="text-5xl md:text-6xl font-bold text-[#222222] mb-6 tracking-tighter leading-tight">
                Accredited <br />
                <span className="text-primary">Experts & Professionals.</span>
              </h1>
              <p className="text-xl text-slate-500 font-normal max-w-lg leading-relaxed">
                Connect with verified lawyers, doctors, accountants, and engineers across South Africa.
              </p>
            </div>
            <div className="hidden lg:block w-px h-32 bg-slate-100" />
            <div className="flex flex-col gap-6 min-w-[200px]">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global average rating</p>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  <span className="text-2xl font-black text-[#222222]">4.95</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active professionals</p>
                <p className="text-2xl font-black text-[#222222]">{professionals.length}+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filters + Grid ── */}
      <section className="bg-white min-h-[60vh]">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="mb-12">
            <SearchFilter
              searchPlaceholder="Search by name or degree..."
              categories={dynamicSubcategories}
              selectedCategory={subcategory}
              selectedSubcategory="all"
              selectedLocation={location}
              searchQuery={search}
              onSearchChange={setSearch}
              onCategoryChange={setSubcategory}
              onSubcategoryChange={() => { }}
              onLocationChange={setLocation}
              onClearFilters={() => { setSearch(""); setSubcategory("all"); setLocation("all"); }}
              resultCount={filtered.length}
            />
          </div>

          {isLoading && (
            <div className="py-32 flex flex-col items-center justify-center gap-6 text-slate-400">
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-bold uppercase tracking-widest">Syncing Experts...</p>
            </div>
          )}

          {error && (
            <div className="py-32 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ArrowLeft className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-[#222222] mb-2">Connection Error</h3>
              <p className="text-slate-500 font-normal">We couldn't reach the ads. Please try again.</p>
              <Button
                variant="ghost"
                className="mt-6 text-primary font-bold hover:bg-primary/5 rounded-xl"
                onClick={() => window.location.reload()}
              >
                Retry Connection
              </Button>
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((provider: any, i: number) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProviderCard provider={provider} />
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-inner mb-6">
                <Search className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-3xl font-bold text-[#222222] tracking-tight">No experts found</h3>
              <p className="text-slate-500 font-normal text-lg max-w-sm">No one matches your current filter configuration. Try broadening your criteria.</p>
              <Button
                variant="ghost"
                className="mt-6 h-12 px-6 rounded-2xl bg-slate-50 text-[#222222] font-bold"
                onClick={() => { setSearch(""); setSubcategory("all"); setLocation("all"); }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Professionals;
