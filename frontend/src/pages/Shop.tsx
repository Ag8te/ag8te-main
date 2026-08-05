import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Tag, Filter, ChevronRight,
  Plus, Heart, MessageSquare, Phone, Clock,
  LayoutGrid, List, Sparkles, SlidersHorizontal,
  Car, Home, Smartphone, Lamp, Briefcase,
  UserCheck, Shirt, Microwave, X, Check, ShoppingCart, Package, ShoppingBag,
  Wrench, Scissors, Laptop, Paintbrush, Utensils, Zap, BookOpen, Music, Film,
  Navigation, Loader2, ShieldCheck, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import { AdBanner } from "@/components/AdBanner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentLocationAddress } from "@/lib/locationUtils";
import { Badge } from "@/components/ui/badge";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis
} from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import productPlaceholder from "@/assets/product-placeholder.svg";

const iconMap: Record<string, any> = {
  'Car': Car,
  'Home': Home,
  'Smartphone': Smartphone,
  'Lamp': Lamp,
  'Briefcase': Briefcase,
  'UserCheck': UserCheck,
  'Shirt': Shirt,
  'Microwave': Microwave,
  'Wrench': Wrench,
  'Scissors': Scissors,
  'Laptop': Laptop,
  'Paintbrush': Paintbrush,
  'Utensils': Utensils,
  'Zap': Zap,
  'BookOpen': BookOpen,
  'Music': Music,
  'Film': Film,
  'Tag': Tag
};

const normalizeProductLocations = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const getPrimaryImageUrl = (product: any): string | null => {
  const images = Array.isArray(product.images) ? [...product.images] : [];
  images.sort((a, b) => {
    if (a?.is_primary && !b?.is_primary) return -1;
    if (!a?.is_primary && b?.is_primary) return 1;
    return Number(a?.order ?? 0) - Number(b?.order ?? 0);
  });

  return images.find((img) => img?.image_url)?.image_url || product.image_url || null;
};

const getCategoryIcon = (categoryName: string, iconKey?: string) => {
  if (iconKey && iconMap[iconKey]) {
    return iconMap[iconKey];
  }

  const name = categoryName.toLowerCase();
  if (name.includes('car') || name.includes('vehicle') || name.includes('auto')) return Car;
  if (name.includes('home') || name.includes('property') || name.includes('estate')) return Home;
  if (name.includes('phone') || name.includes('mobile') || name.includes('electronic')) return Smartphone;
  if (name.includes('clothe') || name.includes('fashion') || name.includes('apparel')) return Shirt;
  if (name.includes('appliance') || name.includes('kitchen')) return Microwave;
  if (name.includes('job') || name.includes('work') || name.includes('service')) return Briefcase;
  if (name.includes('furniture') || name.includes('decor')) return Lamp;
  if (name.includes('beauty') || name.includes('hair') || name.includes('salon')) return Scissors;
  if (name.includes('computer') || name.includes('tech') || name.includes('laptop')) return Laptop;
  if (name.includes('art') || name.includes('craft') || name.includes('paint')) return Paintbrush;
  if (name.includes('food') || name.includes('restaurant') || name.includes('dining') || name.includes('grocer') || name.includes('grocery')) return Utensils;
  if (name.includes('electrical') || name.includes('power')) return Zap;
  if (name.includes('book') || name.includes('education') || name.includes('school')) return BookOpen;
  if (name.includes('music') || name.includes('audio') || name.includes('sound')) return Music;
  if (name.includes('movie') || name.includes('video') || name.includes('entertainment')) return Film;
  if (name.includes('repair') || name.includes('fix') || name.includes('mechanic')) return Wrench;

  return Tag; // Default icon
};

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Filters State
  const search = searchParams.get("q") || "";
  const categorySlug = searchParams.get("cat") || "all";
  const city = searchParams.get("city") || "";
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  // Advanced filters state
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [onlyWishlist, setOnlyWishlist] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("mz_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleWishlist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setWishlist((prev) => {
      const newWishlist = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      localStorage.setItem("mz_wishlist", JSON.stringify(newWishlist));
      toast({
        title: prev.includes(id)
          ? "Removed from Wishlist"
          : "Added to Wishlist",
        description: prev.includes(id)
          ? "Item removed from your shortlist."
          : "Item saved to your shortlist.",
      });
      return newWishlist;
    });
  };

  // Fetch Shop Categories
  const { data: shopCategoriesRes } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: () => apiFetch("/api/shop/categories"),
  });

  // Fetch ads Categories
  const { data: mkpCategoriesRes } = useQuery({
    queryKey: ["ads-categories"],
    queryFn: () => apiFetch("/api/ads/categories"),
  });

  // Fetch Shop Products
  // staleTime: 0 forces a fresh fetch every time the page mounts
  // so we always get the latest inventory data from the backend.
  const { data: productsRes, isLoading: loadingProducts } = useQuery({
    queryKey: ["shop-products"],
    queryFn: () => apiFetch("/api/shop/products?limit=500"),
    staleTime: 0,
  });

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

  // Compile Categories
  const shopCategories = shopCategoriesRes?.data?.categories || [];
  const mkpCategories = mkpCategoriesRes?.data?.categories || [];
  const allCategoryOptions = useMemo(() => {
    const unique = new Map();
    shopCategories.forEach((c: any) =>
      unique.set(c.id, {
        id: c.id,
        name: c.title,
        icon: c.icon || c.title,
        source: "shop",
      }),
    );
    mkpCategories.forEach((c: any) =>
      unique.set(c.slug, {
        id: c.slug,
        name: c.name,
        icon: c.icon || c.name,
        source: "mkp",
      }),
    );
    return Array.from(unique.values());
  }, [shopCategories, mkpCategories]);

  // Compile Items
  const combinedItems = useMemo(() => {
    const items: any[] = [];
    const products = productsRes?.data?.products || [];
    const mkAds = adsRes?.data?.ads || [];

    products.forEach((p: any) => {
      if (p.status === "inactive") return;
      const firstImg = getPrimaryImageUrl(p);
      const imgSrc = firstImg ? getImageUrl(firstImg) : null;
      const price = typeof p.price === "string" ? parseFloat(p.price) : p.price;
      items.push({
        item_type: "shop",
        id: p.id,
        title: p.name,
        price: isNaN(price) ? 0 : price,
        image: imgSrc,
        category: p.category?.title || "Shop Product",
        category_id: p.category?.id || p.category_id,
        seller: p.seller_name || "AG8TE",
        locations: normalizeProductLocations(p.locations),
        location: normalizeProductLocations(p.locations).join(", ") || "South Africa",
        date: p.created_at,
        raw: p,
      });
    });

    mkAds.forEach((ad: any) => {
      const imgSrc = ad.images?.[0] ? getImageUrl(ad.images[0]) : null;
      items.push({
        item_type: "ads",
        id: ad.id,
        title: ad.title,
        price: ad.price,
        image: imgSrc,
        category: ad.category_name || "Ads",
        category_id: ad.category_id || ad.category_slug || ad.category_name, // fallback for matching
        seller: ad.user?.name || "User",
        location: ad.city || ad.province || "South Africa",
        date: ad.created_at,
        raw: ad,
      });
    });

    // Add Active Native Banner Ads
    const bannerAds = bannerAdsRes?.data || [];
    bannerAds.forEach((ad: any) => {
      items.push({
        item_type: "banner_ad",
        id: ad.id,
        title: ad.title || "Sponsored Ad",
        price: null,
        image: ad.image_url,
        category: "Sponsored",
        category_id: null,
        seller: "Advertiser",
        location: "-",
        date: ad.created_at,
        raw: ad,
      });
    });

    return items;
  }, [productsRes, adsRes, bannerAdsRes]);

  // Filter Items
  const filteredItems = useMemo(() => {
    let result = combinedItems;

    if (categorySlug !== "all") {
      const isBannerAd = (i: any) => i.item_type === "banner_ad"; // Always show banners randomly or keep them, let's keep banner ads or filter them?
      result = result.filter((i) => {
        if (isBannerAd(i)) return true; // Show ads across all categories
        // Matches either id, slug or name
        return (
          i.category_id === categorySlug ||
          mkpCategories.find((c: any) => c.slug === categorySlug)?.name ===
            i.category ||
          shopCategories.find((c: any) => c.id === categorySlug)?.title ===
            i.category
        );
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          (i.title || "").toLowerCase().includes(q) ||
          (i.seller || "").toLowerCase().includes(q) ||
          (i.category || "").toLowerCase().includes(q) ||
          (i.location || "").toLowerCase().includes(q) ||
          (i.raw?.description || "").toLowerCase().includes(q),
      );
    }

    if (city) {
      const c = city.toLowerCase();
      result = result.filter(
        (i) =>
          (i.location || "").toLowerCase().includes(c) ||
          i.item_type === "banner_ad",
      );
    }

    // Advanced Filters
    if (sourceFilter !== "all") {
      if (sourceFilter === "shop")
        result = result.filter((i) => i.item_type === "shop");
      if (sourceFilter === "mkp")
        result = result.filter((i) => i.item_type === "ads");
      if (sourceFilter === "ads")
        result = result.filter((i) => i.item_type === "banner_ad");
    }

    if (onlyWishlist) {
      result = result.filter((i) => wishlist.includes(i.id));
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min))
        result = result.filter((i) => i.price !== null && i.price >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max))
        result = result.filter((i) => i.price !== null && i.price <= max);
    }

    // Sort Logic
    return result.sort((a, b) => {
      if (sortBy === "price_asc") {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === "price_desc") {
        return (b.price || 0) - (a.price || 0);
      }
      // default newest
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    });
  }, [
    combinedItems,
    categorySlug,
    search,
    city,
    mkpCategories,
    shopCategories,
    sourceFilter,
    onlyWishlist,
    minPrice,
    maxPrice,
    sortBy,
    wishlist,
  ]);

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);
  const firstVisibleItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastVisibleItem = Math.min(currentPage * itemsPerPage, totalItems);

  const moveToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
    setCurrentPage(nextPage);
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  // Check available_quantity first — if zero, redirect to the
  // product detail page instead (same behaviour as variable products).
  // Customer sees the out of stock state there rather than a
  // silent failure or a ghost item in their cart.
  const handleAddToCart = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const product = item.raw;
    if (product.product_type === "external") {
      if (product.external_url) {
        const url = product.external_url.startsWith("http")
          ? product.external_url
          : `https://${product.external_url}`;
        window.open(url, "_blank");
      }
    } else if (
      product.product_type === "variable" ||
      product.product_type === "grouped"
    ) {
      navigate(`/shop/product/${product.id}`);
    } else {
      // Check stock before adding — use available_quantity if present,
      // fall back to in_stock boolean for products without inventory records.
      const availQty = product.inventory?.available_quantity;
      const outOfStock =
        availQty !== undefined ? availQty <= 0 : product.in_stock === false;
      if (outOfStock) {
        navigate(`/shop/product/${product.id}`);
        return;
      }
      addToCart(product);
      toast({
        title: "Added to cart",
        description: `${product.name} was added.`,
      });
    }
  };

  const handleItemClick = (item: any) => {
    if (item.item_type === "shop") {
      navigate(`/shop/product/${item.id}`);
    } else if (item.item_type === "ad") {
      navigate(`/ads/ad/${item.id}`);
    } else if (item.item_type === "banner_ad") {
      // Record click then navigate
      apiFetch(`/api/ads/${item.id}/click`, { method: "POST" }).finally(() => {
        if (item.raw.target_url) window.open(item.raw.target_url, "_blank");
      });
    }
  };

  const isLoading = loadingProducts || loadingAds;

  const handleUseCurrentLocation = () => {
    getCurrentLocationAddress(
      (_address, city, _coords, _postalCode) => {
        updateParams({ city });
      },
      (title, description) =>
        toast({ variant: "destructive", title, description }),
      setIsLocating,
      "city_only",
    );
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
                <Sparkles className="w-3 h-3 mr-1" /> THE AG8TE SHOP
              </Badge>
              <h1 className="text-4xl md:text-6xl font-black text-[#1e293b] mb-6 tracking-tight">
                Shop Premium Deals in{" "}
                <span className="text-primary italic">AG8TE</span>
              </h1>
              <p className="text-slate-500 text-lg mb-8 max-w-2xl mx-auto">
                Discover the best local items curated and sold exclusively by
                AG8TE. Want us to sell your items for a small fee?{" "}
                <button
                  onClick={() => navigate("/contact")}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Reach out to us
                </button>{" "}
                today.
              </p>
            </motion.div>

            <div className="flex flex-col md:flex-row gap-3 p-2 bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 group focus-within:ring-2 ring-primary/20 transition-all">
              <div className="flex-1 flex items-center px-4 border-b md:border-b-0 md:border-r border-slate-100">
                <Search className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <Input
                  placeholder="What are you looking for?"
                  className="border-none focus-visible:ring-0 text-slate-700 h-12 text-base w-full"
                  value={search}
                  onChange={(e) => updateParams({ q: e.target.value })}
                />
              </div>
              <div className="flex-1 flex items-center px-4 relative">
                <MapPin className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <Input
                  placeholder="Location (e.g. Pretoria)"
                  className="border-none focus-visible:ring-0 text-slate-700 h-12 text-base w-full pr-10"
                  value={city}
                  onChange={(e) => updateParams({ city: e.target.value })}
                />
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                >
                  {isLocating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Navigation className="h-5 w-5" />
                  )}
                </button>
              </div>
              <Button className="h-14 md:px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base transition-transform active:scale-95 shadow-lg shadow-primary/20 shrink-0">
                Find Deals
              </Button>
            </div>
          </div>

          {/* Quick Categories Bar */}
          <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
            <button
              onClick={() => updateParams({ cat: "all" })}
              className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border transition-all whitespace-nowrap min-w-[100px] ${
                categorySlug === "all"
                  ? "bg-[#1e293b] text-white border-[#1e293b]"
                  : "bg-white text-slate-500 border-slate-100 hover:border-primary hover:text-primary"
              }`}
            >
              <LayoutGrid className="w-6 h-6" />
              <span className="text-xs font-bold">All items</span>
            </button>
            {allCategoryOptions.map((cat: any) => {
              const Icon = getCategoryIcon(cat.name, cat.icon);
              return (
                <button
                  key={cat.id}
                  onClick={() => updateParams({ cat: cat.id })}
                  className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border transition-all whitespace-nowrap min-w-[100px] ${
                    categorySlug === cat.id
                      ? "bg-primary text-white border-primary shadow-xl shadow-primary/20"
                      : "bg-white text-slate-500 border-slate-100 hover:border-primary hover:text-primary"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-bold px-2">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- Main Content --- */}
      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold text-[#1e293b] flex items-center gap-2">
            {categorySlug === "all" ? "Latest Items" : "Search Results"}
            <span className="text-slate-400 text-sm font-normal">
              ({totalItems} items)
            </span>
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            <div className="hidden sm:flex bg-white p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-slate-100 text-primary" : "text-slate-400 hover:text-slate-600"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-slate-100 text-primary" : "text-slate-400 hover:text-slate-600"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button
              variant="outline"
              className={`rounded-xl border-slate-200 font-bold gap-2 shrink-0 ${onlyWishlist ? "bg-rose-50 text-rose-500 border-rose-200" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              onClick={() => setOnlyWishlist(!onlyWishlist)}
            >
              <Heart
                className={`w-4 h-4 ${onlyWishlist ? "fill-rose-500" : ""}`}
              />
              {onlyWishlist ? "Saved Items" : "View Saved"}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button className="rounded-xl flex-1 sm:flex-none border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[350px] sm:w-[450px] overflow-y-auto z-[100] bg-white"
              >
                <SheetHeader>
                  <SheetTitle className="text-xl font-bold">Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search to find exactly what you need.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col gap-8 py-8">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Price Range
                    </Label>
                    <div className="flex items-center gap-4">
                      <Input
                        placeholder="Min R"
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="rounded-xl border-slate-200"
                      />
                      <span className="text-slate-400">-</span>
                      <Input
                        placeholder="Max R"
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Source</Label>
                    <Select
                      value={sourceFilter}
                      onValueChange={setSourceFilter}
                    >
                      <SelectTrigger className="w-full rounded-xl border-slate-200">
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="shop">Shop Products Only</SelectItem>
                        <SelectItem value="mkp">ads Only</SelectItem>
                        <SelectItem value="ads">Sponsored Ads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full rounded-xl border-slate-200">
                        <SelectValue placeholder="Newest first" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="price_asc">
                          Price: Low to High
                        </SelectItem>
                        <SelectItem value="price_desc">
                          Price: High to Low
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex flex-col gap-1">
                        <Label className="text-base font-semibold cursor-pointer">
                          Saved Items
                        </Label>
                        <span className="text-xs text-slate-500">
                          Only show items you've saved
                        </span>
                      </div>
                      <Switch
                        checked={onlyWishlist}
                        onCheckedChange={setOnlyWishlist}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl font-bold text-slate-600 mb-3"
                      onClick={() => {
                        setMinPrice("");
                        setMaxPrice("");
                        setSourceFilter("all");
                        setSortBy("newest");
                        setOnlyWishlist(false);
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div
          ref={resultsRef}
          className="mb-5 flex flex-col gap-3 scroll-mt-28 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-bold text-slate-500">
              {totalItems > 0
                ? `Showing ${firstVisibleItem}-${lastVisibleItem} of ${totalItems} items`
                : "No items to show"}
            </p>
            {totalPages > 1 && (
              <p className="text-xs font-semibold text-slate-400">
                Page {currentPage} of {totalPages}
              </p>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                disabled={currentPage === 1}
                onClick={() => moveToPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                disabled={currentPage === totalPages}
                onClick={() => moveToPage(currentPage + 1)}
              >
                Next page
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl h-80 animate-pulse border border-slate-100"
              />
            ))}
          </div>
        ) : paginatedItems.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12"
                : "flex flex-col gap-4 mb-12"
            }
          >
            {paginatedItems.map((item) => (
              <motion.div
                key={item.id + item.item_type}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                className={`group bg-white border border-slate-100 rounded-[2rem] overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-200 cursor-pointer ${viewMode === "list" ? "flex h-48 sm:h-auto sm:min-h-[12rem] flex-row" : "flex flex-col h-[22rem]"}`}
                onClick={() => handleItemClick(item)}
              >
                <div
                  className={`relative ${viewMode === "list" ? "w-1/3 sm:w-64 shrink-0" : "w-full h-48"}`}
                >
                  <img
                    src={
                      item.image ||
                      productPlaceholder
                    }
                    alt={item.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110 bg-slate-100"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      if (!t.src.includes("product-placeholder")) {
                        t.src = productPlaceholder;
                      } else {
                        t.style.display = "none";
                        (t.nextElementSibling as HTMLElement)?.classList.remove(
                          "hidden",
                        );
                      }
                    }}
                  />
                  <div
                    className={`absolute inset-0 flex items-center justify-center text-slate-300 ${item.image ? "hidden" : ""}`}
                  >
                    <Package className="h-10 w-10 opacity-20" />
                  </div>
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        className={`bg-white/90 backdrop-blur-md text-[#222222] border-none text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm w-fit uppercase ${item.item_type === "banner_ad" ? "ring-2 ring-amber-400" : ""}`}
                      >
                        {item.item_type === "shop"
                          ? "Shop Product"
                          : item.item_type === "ads"
                            ? "Ad"
                            : "Sponsored Ad"}
                      </Badge>
                      {item.item_type === "shop" &&
                       item.raw?.product_type === "external" && (
                        <Badge className="bg-orange-500/95 backdrop-blur-md text-white border-none text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-sm w-fit uppercase tracking-wide">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          External
                        </Badge>
                      )}
                      {item.item_type === "shop" &&
                       item.raw?.product_type === "grouped" && (
                        <Badge className="bg-violet-500/95 backdrop-blur-md text-white border-none text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-sm w-fit uppercase tracking-wide">
                          <Package className="mr-1 h-3 w-3" />
                          Bundle
                        </Badge>
                      )}
                    </div>
                    {item.item_type === "shop" &&
                     item.raw?.product_type !== "external" && (
                      <Badge className="bg-emerald-500/95 backdrop-blur-md text-white border-none text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm w-fit uppercase tracking-wide">
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Verified Seller
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={(e) => toggleWishlist(e, item.id)}
                    className="absolute top-4 right-4 p-2 bg-white/50 backdrop-blur-md text-slate-600 rounded-full hover:bg-rose-500 hover:text-white transition-all z-10"
                  >
                    <Heart
                      className={`w-4 h-4 ${wishlist.includes(item.id) ? "fill-rose-500 text-rose-500" : ""}`}
                    />
                  </button>
                </div>

                <div className="p-5 flex flex-col flex-1 relative">
                  {/* Only for shop products: Quick add to cart */}
                  {item.item_type === "shop" &&
                    (() => {
                      const availQty = item.raw?.inventory?.available_quantity;
                      const outOfStock =
                        availQty !== undefined
                          ? availQty <= 0
                          : item.raw?.in_stock === false;
                      if (item.raw?.product_type === "external") {
                        return (
                          <div className="absolute top-0 right-4 -translate-y-[120%] z-20 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1/2 transition-all">
                            <Button
                              size="icon"
                              className="rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white h-10 w-10"
                              onClick={(e) => handleAddToCart(e, item)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      }
                      if (outOfStock) {
                        return (
                          <div className="absolute top-0 right-4 -translate-y-[120%] z-20 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1/2 transition-all">
                            <span className="inline-flex items-center rounded-full bg-slate-800/90 backdrop-blur-md px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                              Sold out
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="absolute top-0 right-4 -translate-y-[120%] z-20 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1/2 transition-all">
                          <Button
                            size="icon"
                            className="rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white h-10 w-10"
                            onClick={(e) => handleAddToCart(e, item)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })()}
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-bold text-[#1e293b] line-clamp-2 text-[15px] leading-tight group-hover:text-primary transition-colors pr-2">
                      {item.title}
                    </h3>
                    <div className="text-primary font-black text-lg whitespace-nowrap">
                      {item.price
                        ? `R ${item.price.toLocaleString("en-ZA")}`
                        : item.item_type === "shop"
                          ? "Free"
                          : item.item_type === "banner_ad"
                            ? "View"
                            : "POA"}
                    </div>
                  </div>
                  {item.raw?.description && (
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                      {item.raw.description}
                    </p>
                  )}
                  {item.item_type === "shop" &&
                   item.raw?.rating != null && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <svg
                            key={i}
                            className={`h-3 w-3 ${i <= Math.round(item.raw.rating) ? "text-amber-400" : "text-slate-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {Number(item.raw.rating).toFixed(1)}
                        {item.raw.reviews_count > 0 && ` (${item.raw.reviews_count})`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-slate-400 text-xs mb-4">
                    {item.location !== "-" && item.item_type !== "shop" && (
                      <div className="flex shrink-0 items-center gap-1">
                        <MapPin className="w-3 h-3" />{" "}
                        <span className="truncate max-w-[100px]">
                          {item.location}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <Tag className="w-3 h-3" />{" "}
                      <span className="truncate max-w-[100px]">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  {item.item_type === "shop" && item.locations?.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {item.locations.slice(0, 4).map((location: string) => (
                        <span
                          key={location}
                          className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600"
                        >
                          {location}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.item_type === "shop" && (
                    <div className={`mb-4 flex items-start gap-3 rounded-2xl border px-3.5 py-3 ${
                      item.raw?.product_type === "external"
                        ? "border-orange-100 bg-orange-50/70"
                        : "border-emerald-100 bg-emerald-50/70"
                    }`}>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ${
                        item.raw?.product_type === "external"
                          ? "text-orange-500"
                          : "text-emerald-600"
                      }`}>
                        {item.raw?.product_type === "external"
                          ? <ExternalLink className="h-4 w-4" />
                          : <ShieldCheck className="h-4 w-4" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                          item.raw?.product_type === "external"
                            ? "text-orange-700"
                            : "text-emerald-700"
                        }`}>
                          {item.raw?.product_type === "external"
                            ? "Partner Product"
                            : "Verified Partner"
                          }
                        </p>
                        <p className={`truncate text-sm font-bold ${
                          item.raw?.product_type === "external"
                            ? "text-orange-950"
                            : "text-emerald-950"
                        }`}>
                          {item.seller}
                        </p>
                        <p className={`text-[11px] leading-relaxed ${
                          item.raw?.product_type === "external"
                            ? "text-orange-700/85"
                            : "text-emerald-700/85"
                        }`}>
                          {item.raw?.product_type === "external"
                            ? "Sold on an external site. Price and availability may vary."
                            : "Trusted checkout and platform-backed order support."
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden ${item.item_type === "shop" ? "w-8 h-8 rounded-2xl bg-emerald-100 text-emerald-700" : "w-6 h-6 rounded-full bg-slate-100 text-slate-500"}`}
                      >
                        {item.item_type === "shop" ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          item.seller.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          {item.item_type === "shop" ? "Verified" : "Seller"}
                        </p>
                        <span className="block truncate text-[11px] font-bold text-slate-600 max-w-[110px]">
                          {item.seller}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {item.item_type === "ads" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {item.item_type === "shop" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-sm">
                          <ShieldCheck className="h-3 w-3" />
                          Trusted
                        </span>
                      )}
                      {item.item_type === "banner_ad" && (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-md">
                          SPONSORED
                        </span>
                      )}
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
            {categorySlug !== "all" && !search ? (
              <>
                <h3 className="text-2xl font-bold text-[#1e293b] mb-2">
                  Nothing in this category yet
                </h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                  We haven't added any products to this category yet. 
                  Check back soon or browse everything we have.
                </p>
                <Button
                  className="rounded-xl px-10 font-bold"
                  onClick={() => updateParams({ cat: "all" })}
                >
                  Browse all products
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-[#1e293b] mb-2">
                  No items found
                </h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                  We couldn't find anything matching your search. Try 
                  adjusting your filters or browse all products.
                </p>
                <Button
                  className="rounded-xl px-10 font-bold"
                  onClick={() => updateParams({ q: null, cat: "all", city: null })}
                >
                  Reset filters
                </Button>
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => moveToPage(currentPage - 1)}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(currentPage - page) <= 1
                  ) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={currentPage === page}
                          onClick={() => moveToPage(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (Math.abs(currentPage - page) === 2) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => moveToPage(currentPage + 1)}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
