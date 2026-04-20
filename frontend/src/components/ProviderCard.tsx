import type { ServiceProvider } from "@/lib/mock-data";
import { BadgeCheck, Clock, MapPin, Star, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Augment the ServiceProvider type locally to include bannerImage optionally since it's not in mock-data
type ExtendedServiceProvider = ServiceProvider & { bannerImage?: string };

const ProviderCard = ({ provider }: { provider: ExtendedServiceProvider }) => {
  const navigate = useNavigate();

  // Premium texture-based fallback or neutral subtle gradient
  const fallbackBannerClass = "bg-[#F8F9FA] bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E')]";

  return (
    <div
      onClick={() => navigate(`/provider/${provider.category.toLowerCase()}/${provider.id}`)}
      className="group relative overflow-hidden rounded-[2.5rem] border border-slate-50 bg-white shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 hover:-translate-y-2 flex flex-col h-full cursor-pointer"
    >
      {/* Banner Image / Neutral Header */}
      <div className={cn("h-32 w-full relative overflow-hidden", !provider.bannerImage && fallbackBannerClass)}>
        {provider.bannerImage && (
          <img
            src={provider.bannerImage}
            alt="Cover"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        )}
        <div className="absolute inset-0 bg-black/5 mix-blend-overlay"></div>

        {/* Verified badge - Floating Style */}
        {provider.verified && (
          <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-xl border border-emerald-50/50">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={3} /> Verified
          </div>
        )}
      </div>

      <div className="px-8 pb-8 pt-0 flex-1 flex flex-col relative">
        {/* Avatar - Premium Floating Design */}
        <div className="-mt-12 mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white p-2 shadow-2xl shadow-slate-200/80 border border-slate-50/50 z-10 overflow-hidden group-hover:scale-105 transition-all duration-500">
          {provider.image && provider.image !== "/placeholder.svg" ? (
            <img src={provider.image} alt={provider.name} className="h-full w-full rounded-[1.8rem] object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-[1.8rem] bg-slate-50 text-primary text-2xl font-black italic">
              {provider.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
          )}
        </div>

        <div className="mb-2">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{provider.subcategory}</span>
        </div>

        <h3 className="mb-3 text-2xl font-bold text-[#222222] tracking-tight group-hover:text-primary transition-colors">{provider.name}</h3>

        <p className="mb-6 text-sm text-slate-500 font-normal line-clamp-2 leading-relaxed h-10">
          {provider.description}
        </p>

        <div className="mb-8 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-black text-[#222222]">{provider.rating}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">({provider.reviews})</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">{provider.location}</span>
          </div>
        </div>

        <div className="mt-auto pt-8 flex items-center justify-between border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rate starts at</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#222222]">{provider.price}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{provider.priceUnit}</span>
            </div>
          </div>

          <Button
            size="lg"
            className={cn(
              "rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-lg transition-all h-14 px-8 border-none active:scale-95",
              provider.available
                ? "bg-primary hover:bg-primary shadow-primary/20 hover:shadow-primary/30"
                : "bg-slate-100 text-slate-400"
            )}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/book/${provider.category.toLowerCase()}/${provider.id}?service=${encodeURIComponent(provider.subcategory)}`);
            }}
            disabled={!provider.available}
          >
            {provider.available ? "Book Now" : (
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Waitlist</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
