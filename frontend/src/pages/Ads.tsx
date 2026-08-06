import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, LayoutGrid } from "lucide-react";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";

export default function Ads() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    // Fetch ads Ads
    const { data: adsRes, isLoading: loadingAds } = useQuery({
        queryKey: ["ads-ads"],
        queryFn: () => apiFetch("/api/ads/ads?limit=500"),
    });

    // Fetch Active Banner Ads (to inject natively)
    const { data: bannerAdsRes } = useQuery({
        queryKey: ["active-banner-ads"],
        queryFn: () => apiFetch("/api/ads/active"),
    });

    const combinedItems = useMemo(() => {
        const items: any[] = [];
        const mkAds = adsRes?.data?.ads || [];

        mkAds.forEach((ad: any) => {
            const imgSrc = ad.images?.[0] ? (getImageUrl(ad.images[0])) : null;
            items.push({
                item_type: 'ads',
                id: ad.id,
                title: ad.title,
                price: ad.price,
                image: imgSrc,
                category: ad.category_name || 'Ads',
                seller: ad.user?.name || 'User',
                location: ad.city || ad.province || 'South Africa',
                date: ad.created_at,
                raw: ad
            });
        });

        const bannerAds = bannerAdsRes?.data || [];
        bannerAds.forEach((ad: any) => {
            items.push({
                item_type: 'banner_ad',
                id: ad.id,
                title: ad.title || "Sponsored Ad",
                price: null,
                image: ad.image_url,
                category: "Sponsored",
                seller: "Advertiser",
                location: "-",
                date: ad.created_at,
                raw: ad
            });
        });

        return items;
    }, [adsRes, bannerAdsRes]);

    const filteredItems = useMemo(() => {
        let result = combinedItems;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(i =>
                (i.title || "").toLowerCase().includes(q) ||
                (i.seller || "").toLowerCase().includes(q) ||
                (i.category || "").toLowerCase().includes(q)
            );
        }
        return result;
    }, [combinedItems, search]);

    const handleItemClick = (item: any) => {
        if (item.item_type === 'ads') {
            navigate(`/ads/ad/${item.id}`);
        } else if (item.item_type === 'banner_ad') {
            apiFetch(`/api/ads/${item.id}/click`, { method: 'POST' }).finally(() => {
                if (item.raw.target_url) window.open(item.raw.target_url, "_blank");
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <Navbar />

            {/* --- Hero / Search Section --- */}
            <section className="pt-32 pb-12 bg-white border-b border-slate-100">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-[#1e293b] mb-4 tracking-tight">
                        Latest Ads
                    </h1>
                    <p className="text-slate-500 text-lg mb-8 max-w-2xl mx-auto">
                        Discover classifieds, promotions, and ads ads from our community.
                    </p>
                    <div className="max-w-xl mx-auto flex items-center bg-white rounded-2xl shadow-sm border border-slate-200 px-4 focus-within:ring-2 ring-primary/20 transition-all">
                        <Search className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                        <Input
                            placeholder="Search ads..."
                            className="border-none focus-visible:ring-0 text-slate-700 h-14 text-base w-full bg-transparent"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            {/* --- Main Content --- */}
            <main className="container mx-auto px-6 py-12 flex-1">
                <h2 className="text-2xl font-bold text-[#1e293b] mb-8">
                    All Ads <span className="text-slate-400 text-sm font-normal">({filteredItems.length})</span>
                </h2>

                {loadingAds ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        Loading ads...
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <LayoutGrid className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-[#1e293b] mb-2">No Ads Found</h3>
                        <p className="text-slate-500">We couldn't find any ads matching your search.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredItems.map((item) => (
                            <div
                                key={`${item.item_type}-${item.id}`}
                                onClick={() => handleItemClick(item)}
                                className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer flex flex-col"
                            >
                                <div className="relative aspect-square overflow-hidden bg-slate-50">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <LayoutGrid className="w-12 h-12" />
                                        </div>
                                    )}
                                    {item.item_type === 'banner_ad' && (
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-[#222222] shadow-sm">
                                                Sponsored
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 flex flex-col flex-1">
                                    <div className="text-[10px] items-center text-slate-400 font-bold uppercase tracking-widest mb-2 flex justify-between">
                                        <span>{item.category}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-[#222222] mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                        {item.title}
                                    </h3>

                                    {item.price !== null && (
                                        <div className="mt-2 text-primary font-black text-xl">
                                            R{item.price}
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                                        <span className="text-xs font-bold text-slate-500 truncate pr-2">
                                            {item.seller}
                                        </span>
                                        {item.location && item.location !== '-' && (
                                            <span className="text-xs font-medium text-slate-400 flex items-center whitespace-nowrap">
                                                <MapPin className="w-3 h-3 mr-1" /> {item.location}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
