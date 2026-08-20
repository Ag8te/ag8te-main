import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, ArrowLeft, Star, Briefcase, Settings, Wrench } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchFilter from "@/components/SearchFilter";
import ProviderCard from "@/components/ProviderCard";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const categories = ["Services"] as const;

const Services = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");
  const [location, setLocation] = useState("all");

  const { data: prosResult, isLoading: loadingPros, error: errorPros } = useQuery({
    queryKey: ["professionals"],
    queryFn: () => apiFetch("/api/profile/professionals"),
  });

  const { data: providersResult, isLoading: loadingProviders, error: errorProviders } = useQuery({
    queryKey: ["service-providers"],
    queryFn: () => apiFetch("/api/profile/service-providers"),
  });

  const allProviders = useMemo(() => {
    const pros = prosResult?.data?.professionals || [];
    const providers = providersResult?.data?.service_providers || [];

    const mockBanners = [
      "https://images.unsplash.com/photo-1541888081628-912235c4eb5e?q=80&w=800&fm=jpg&fit=crop",
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&fm=jpg&fit=crop",
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&fm=jpg&fit=crop",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&fm=jpg&fit=crop",
    ];

    const mappedPros = pros.map((p: any) => {
      const user = p.professional;
      const data = user.data || {};
      const fullName = `${data.full_name || ""} ${data.surname || ""}`.trim();
      const firstService = p.services?.length > 0 ? p.services[0] : null;
      return {
        id: user.id, name: fullName || "Professional", category: "Professionals",
        subcategory: firstService?.name || data.highest_qualification || "Professional Services",
        servicesList: p.services?.map((s: any) => s.name) || [],
        rating: 5.0, reviews: 0, location: "Available",
        price: p.min_hourly_rate ? `R${p.min_hourly_rate}` : "Quote", priceUnit: "/hour",
        description: firstService?.description || "Certified professional ready to assist you.",
        verified: user.is_approved,
        image: user.profile_image_url || `https://i.pravatar.cc/150?u=${user.id}`,
        bannerImage: user.banner_url || mockBanners[user.id % 4],
        available: true,
      };
    });

    const mappedProviders = providers.map((p: any) => {
      const user = p.provider;
      const data = user.data || {};
      const fullName = `${data.full_name || ""} ${data.surname || ""}`.trim() || data.business_name;
      const firstService = p.services?.length > 0 ? p.services[0] : null;
      return {
        id: user.id, name: fullName || "Service Provider", category: "Services",
        subcategory: firstService?.name || "General Services",
        servicesList: p.services?.map((s: any) => s.name) || [],
        rating: 4.8, reviews: 0, location: "Available",
        price: firstService?.hourly_rate ? `R${firstService.hourly_rate}` : "Quote", priceUnit: "/Hour",
        description: firstService?.description || "Reliable service provider for your needs.",
        verified: user.is_approved,
        image: user.profile_image_url || `https://i.pravatar.cc/150?u=${user.id + 20}`,
        bannerImage: user.banner_url || mockBanners[user.id % 4],
        available: true,
      };
    });

    return mappedProviders;
  }, [prosResult, providersResult]);

  const isLoading = loadingPros || loadingProviders;
  const error = errorPros || errorProviders;

  const dynamicSubcategories = useMemo(() => {
    const categoriesMap: Record<string, Set<string>> = {
      "Professionals": new Set<string>(),
      "Services": new Set<string>(),
      "Transport": new Set<string>()
    };

    allProviders.forEach((p: any) => {
      if (categoriesMap[p.category]) {
        if (p.servicesList) {
          p.servicesList.forEach((s: string) => categoriesMap[p.category].add(s));
        }
      }
    });

    return {
      "Professionals": Array.from(categoriesMap["Professionals"]).sort(),
      "Services": Array.from(categoriesMap["Services"]).sort(),
      "Transport": Array.from(categoriesMap["Transport"]).sort()
    };
  }, [allProviders]);

  const filtered = useMemo(() =>
    allProviders.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (subcategory !== "all" && p.subcategory !== subcategory && (!p.servicesList || !p.servicesList.includes(subcategory))) return false;
      if (location !== "all" && p.location !== location) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
      }
      return true;
    }),
    [search, category, subcategory, location, allProviders]
  );

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* ── Page header ── */}
      <section className="pt-28 pb-10 bg-white relative overflow-hidden border-b border-slate-50">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 max-w-6xl mx-auto">
            <div className="flex-1">
              <span className="inline-block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">The ads</span>
              <h1 className="text-4xl md:text-5xl font-bold text-[#222222] mb-4 tracking-tighter leading-tight">
                Find exactly <br />
                <span className="text-primary">what you need.</span>
              </h1>
              <p className="text-lg text-slate-500 font-normal max-w-lg leading-relaxed">
                Browse verified experts and service providers across South Africa.
              </p>
            </div>
            <div className="hidden lg:block w-px h-32 bg-slate-100" />
            <div className="flex flex-col gap-6 min-w-[200px]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 shadow-inner">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trust score</p>
                  <p className="text-xl font-black text-[#222222]">4.8/5.0</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 shadow-inner">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Providers</p>
                  <p className="text-xl font-black text-[#222222]">{allProviders.length}+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filters + Grid ── */}
      <section className="bg-white min-h-[50vh]">
        <div className="container mx-auto px-6 py-10 max-w-7xl">
          <div className="mb-8">
            <SearchFilter
              searchPlaceholder="Search by provider, service, or skills..."
              categories={categories}
              subcategories={dynamicSubcategories}
              selectedCategory={category}
              selectedSubcategory={subcategory}
              selectedLocation={location}
              searchQuery={search}
              onSearchChange={setSearch}
              onCategoryChange={(c) => { setCategory(c); setSubcategory("all"); }}
              onSubcategoryChange={setSubcategory}
              onLocationChange={setLocation}
              onClearFilters={() => { setSearch(""); setCategory("all"); setSubcategory("all"); setLocation("all"); }}
              resultCount={filtered.length}
            />
          </div>

          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center gap-6 text-slate-400">
              <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest">Searching ads...</p>
            </div>
          )}

          {error && (
            <div className="py-16 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <ArrowLeft className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-[#222222] mb-2">Connection Error</h3>
              <p className="text-slate-500 font-normal">We're having trouble connecting to the ads.</p>
              <Button
                variant="ghost"
                className="mt-6 h-12 px-8 rounded-2xl bg-primary text-white font-bold"
                onClick={() => window.location.reload()}
              >
                Try Again
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
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-inner mb-5">
                <Search className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-3xl font-bold text-[#222222] tracking-tight">No results matched</h3>
              <p className="text-slate-500 font-normal text-lg max-w-sm leading-relaxed">Try adjusting your category or subcategory filters to find more options.</p>
              <Button
                variant="ghost"
                className="mt-10 h-14 px-10 rounded-2xl bg-slate-50 text-[#222222] font-bold"
                onClick={() => { setSearch(""); setCategory("all"); setSubcategory("all"); setLocation("all"); }}
              >
                Reset ads
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Services;
