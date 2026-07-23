import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, MapPin, Tag, Filter, ChevronRight,
    Plus, Heart, MessageSquare, Phone, Clock,
    LayoutGrid, List, Sparkles, SlidersHorizontal,
    Car, Home, Smartphone, Lamp, Briefcase,
    UserCheck, Shirt, Microwave, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
    Pagination, PaginationContent, PaginationItem,
    PaginationLink, PaginationNext, PaginationPrevious
} from "@/components/ui/pagination";
import productPlaceholder from "@/assets/product-placeholder.svg";

// --- Icons Mapping ---
const iconMap: Record<string, any> = {
    'Car': Car, 'Home': Home, 'Smartphone': Smartphone,
    'Lamp': Lamp, 'Briefcase': Briefcase, 'UserCheck': UserCheck,
    'Shirt': Shirt, 'Microwave': Microwave
};

// --- Types ---
interface Ad {
    id: string;
    title: string;
    description: string;
    price: number | null;
    city: string;
    province: string;
    category_name: string;
    condition: string;
    images: string[];
    created_at: string;
    user: {
        name: string;
        is_verified: boolean;
    };
}

interface Category {
    id: string;
    name: string;
    slug: string;
    icon: string;
}

const ads = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filters State
    const search = searchParams.get("q") || "";
    const categorySlug = searchParams.get("cat") || "all";
    const city = searchParams.get("city") || "";
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch Categories
    const { data: categoriesRes } = useQuery({
        queryKey: ["ads-categories"],
        queryFn: () => apiFetch("/api/ads/categories"),
    });

    // Fetch Ads
    const { data: adsRes, isLoading: loadingAds } = useQuery({
        queryKey: ["ads-ads", search, categorySlug, city, currentPage],
        queryFn: () => {
            let url = `/api/ads/ads?limit=12&offset=${(currentPage - 1) * 12}`;
            if (search) url += `&search=${search}`;
            if (categorySlug !== "all") url += `&category=${categorySlug}`;
            if (city) url += `&city=${city}`;
            return apiFetch(url);
        },
    });

    const ads: Ad[] = adsRes?.data?.ads || [];
    const totalAds = adsRes?.data?.total || 0;
    const categories: Category[] = categoriesRes?.data?.categories || [];
    const totalPages = Math.ceil(totalAds / 12);

    const updateParams = (updates: Record<string, string | null>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "all" || value === "") {
                newParams.delete(key);
            } else {
                newParams.set(key, value);
            }
        });
        setSearchParams(newParams);
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <Navbar />

            {/* --- Hero / Search Section --- */}
            <section className="pt-32 pb-12 bg-white border-b border-slate-100">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center mb-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Badge className="mb-4 bg-primary/10 text-primary border-none text-xs font-bold px-3 py-1">
                                <Sparkles className="w-3 h-3 mr-1" /> MZANSI ads
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-black text-[#1e293b] mb-6 tracking-tight">
                                Buy & Sell in <span className="text-primary italic">Mzansi</span>
                            </h1>
                            <p className="text-slate-500 text-lg mb-8 max-w-2xl mx-auto">
                                The safest way to discover local deals. Everything from cars to electronics, verified by our community.
                            </p>
                        </motion.div>

                        <div className="flex flex-col md:flex-row gap-3 p-2 bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 group focus-within:ring-2 ring-primary/20 transition-all">
                            <div className="flex-1 flex items-center px-4 border-b md:border-b-0 md:border-r border-slate-100">
                                <Search className="text-slate-400 w-5 h-5 mr-3" />
                                <Input
                                    placeholder="What are you looking for?"
                                    className="border-none focus-visible:ring-0 text-slate-700 h-12 text-base"
                                    value={search}
                                    onChange={(e) => updateParams({ q: e.target.value })}
                                />
                            </div>
                            <div className="flex-1 flex items-center px-4">
                                <MapPin className="text-slate-400 w-5 h-5 mr-3" />
                                <Input
                                    placeholder="Location (e.g. Pretoria)"
                                    className="border-none focus-visible:ring-0 text-slate-700 h-12 text-base"
                                    value={city}
                                    onChange={(e) => updateParams({ city: e.target.value })}
                                />
                            </div>
                            <Button className="h-14 md:px-10 rounded-2xl bg-primary hover:primary/90 text-white font-bold text-base transition-transform active:scale-95 shadow-lg shadow-primary/20">
                                Find Deals
                            </Button>
                        </div>
                    </div>

                    {/* Quick Categories Bar */}
                    <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
                        <button
                            onClick={() => updateParams({ cat: 'all' })}
                            className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border transition-all whitespace-nowrap min-w-[100px] ${categorySlug === 'all'
                                ? "bg-[#1e293b] text-white border-[#1e293b] shadow-xl"
                                : "bg-white text-slate-500 border-slate-100 hover:border-primary hover:text-primary"
                                }`}
                        >
                            <LayoutGrid className="w-6 h-6" />
                            <span className="text-xs font-bold">All</span>
                        </button>
                        {categories.map((cat) => {
                            const Icon = iconMap[cat.icon] || Tag;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => updateParams({ cat: cat.slug })}
                                    className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border transition-all whitespace-nowrap min-w-[100px] ${categorySlug === cat.slug
                                        ? "bg-primary text-white border-primary shadow-xl shadow-primary/20"
                                        : "bg-white text-slate-500 border-slate-100 hover:border-primary hover:text-primary"
                                        }`}
                                >
                                    <Icon className="w-6 h-6" />
                                    <span className="text-xs font-bold">{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* --- Main Content --- */}
            <main className="container mx-auto px-6 py-12 flex-1">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-[#1e293b] flex items-center gap-2">
                        {categorySlug === 'all' ? 'Latest Ads' : `${categories.find(c => c.slug === categorySlug)?.name}`}
                        <span className="text-slate-400 text-sm font-normal">({totalAds} results)</span>
                    </h2>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex bg-white p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? "bg-slate-100 text-primary" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? "bg-slate-100 text-primary" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                        <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 font-bold gap-2">
                            <SlidersHorizontal className="w-4 h-4" /> Filters
                        </Button>
                        <Button
                            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2"
                            onClick={() => navigate('/ads/post')}
                        >
                            <Plus className="w-4 h-4" /> Post Ad
                        </Button>
                    </div>
                </div>

                {loadingAds ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : ads.length > 0 ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-4"}>
                        {ads.map((ad) => (
                            <motion.div
                                key={ad.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -5 }}
                                className={`group bg-white border border-slate-100 rounded-[2rem] overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-200 cursor-pointer ${viewMode === 'list' ? "flex h-48" : ""}`}
                                onClick={() => navigate(`/ads/ad/${ad.id}`)}
                            >
                                <div className={`relative ${viewMode === 'list' ? "w-64 shrink-0" : "aspect-[4/3]"}`}>
                                    <img
                                        src={ad.images?.[0] || productPlaceholder}
                                        alt={ad.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute top-4 left-4 z-10">
                                        <Badge className="bg-white/90 backdrop-blur-md text-[#222222] border-none text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                                            {ad.category_name}
                                        </Badge>
                                    </div>
                                    <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-rose-500 hover:text-white transition-all">
                                        <Heart className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h3 className="font-bold text-[#1e293b] line-clamp-2 text-[15px] leading-tight group-hover:text-primary transition-colors">
                                            {ad.title}
                                        </h3>
                                        <div className="text-primary font-black text-lg whitespace-nowrap">
                                            {ad.price ? `R ${ad.price.toLocaleString()}` : "POA"}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-slate-400 text-xs mb-4">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {ad.city}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Clock className="w-3 h-3" /> {new Date(ad.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                {ad.user.name.charAt(0)}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-500 truncate max-w-[80px]">
                                                {ad.user.name}
                                            </span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5">
                                                <MessageSquare className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5">
                                                <Phone className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-[3rem] border border-slate-100">
                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                            <Search size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#1e293b] mb-2">No deals found</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            We couldn't find any ads matching your current filters. Try adjusting your search or category.
                        </p>
                        <Button
                            className="rounded-xl px-10 font-bold"
                            onClick={() => updateParams({ q: null, cat: 'all', city: null })}
                        >
                            Reset all filters
                        </Button>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-16 flex justify-center">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious onClick={() => setCurrentPage(c => Math.max(1, c - 1))} className="cursor-pointer" />
                                </PaginationItem>
                                {[...Array(totalPages)].map((_, i) => (
                                    <PaginationItem key={i}>
                                        <PaginationLink
                                            isActive={currentPage === i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className="cursor-pointer"
                                        >
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} className="cursor-pointer" />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default ads;
