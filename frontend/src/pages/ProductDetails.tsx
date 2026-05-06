import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Star,
  ChevronLeft,
  ChevronRight,
  Package,
  Check,
  X,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  ArrowLeft,
  Lock,
  Share2,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ApiProduct {
  id: string;
  name: string;
  description: string;
  price: string | number;
  image_url: string | null;
  images?: Array<{ image_url: string }>;
  category?: { id: string; title: string } | null;
  category_id?: string | null;
  in_stock?: boolean;
  is_active?: boolean;
  seller_name?: string;
  rating?: number;
  reviews_count?: number;
  product_type?: 'simple' | 'variable' | 'grouped' | 'external';
  attributes?: any;
  shipping_profile?: {
    description?: string | null;
    weight_kg?: number | null;
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
  } | null;
  variations?: any;
  grouped_products?: any;
  external_url?: string;
  button_text?: string;
}

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Fetch product details
  const { data: productRes, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiFetch(`/api/shop/products/${id}`),
    enabled: !!id,
  });

  const product: ApiProduct | null = productRes?.data || null;

  const images = useMemo(() => {
    if (!product) return [];
    const imgs = product.images?.map((img) => img.image_url) || [];
    if (product.image_url && !imgs.includes(product.image_url)) {
      imgs.unshift(product.image_url);
    }
    return imgs.length > 0 ? imgs : [null];
  }, [product]);

  const price = useMemo(() => {
    if (!product) return 0;
    const v = typeof product.price === "string" ? parseFloat(product.price) : product.price;
    return isNaN(v) ? 0 : v;
  }, [product]);

  const getImageSrc = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  };

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(product as any);
    }
    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name} added to your cart.`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Navbar />
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="font-bold text-slate-400">Loading details...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
            <Package className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-[#222222] mb-4 tracking-tight">Product Not Found</h1>
          <p className="text-slate-500 max-w-sm mb-10 text-lg font-normal leading-relaxed">
            The product you're looking for doesn't exist or has been removed from our shop.
          </p>
          <Button onClick={() => navigate("/shop")} className="h-14 px-10 rounded-2xl bg-primary text-white font-bold">
            Back to Shop
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const inStock = product.in_stock !== false;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Breadcrumbs & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <button onClick={() => navigate("/")} className="hover:text-primary transition-colors">Home</button>
              <ChevronRight className="h-3 w-3" />
              <button onClick={() => navigate("/shop")} className="hover:text-primary transition-colors">Shop</button>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-900 truncate max-w-[200px]">{product.name}</span>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400">
                <Heart className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 xl:gap-24">
            {/* Image Gallery */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="relative aspect-square bg-[#FBFBFD] rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-inner group">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedImageIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    src={getImageSrc(images[selectedImageIndex]) || "/placeholder.png"}
                    alt={product.name}
                    className="w-full h-full object-contain p-12 md:p-20"
                  />
                </AnimatePresence>

                {images.length > 1 && (
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl flex items-center justify-center text-slate-900 hover:scale-110 active:scale-95 transition-all"
                    >
                      <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                      className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl flex items-center justify-center text-slate-900 hover:scale-110 active:scale-95 transition-all"
                    >
                      <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar px-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        "relative w-24 aspect-square rounded-2xl overflow-hidden border-2 shrink-0 transition-all duration-300",
                        selectedImageIndex === idx
                          ? "border-primary shadow-lg shadow-primary/10"
                          : "border-slate-50 hover:border-slate-200"
                      )}
                    >
                      <img
                        src={getImageSrc(img) || "/placeholder.png"}
                        alt={`${product.name} thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-wider border border-primary/10">
                    {product.category?.title || "New Arrival"}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    inStock ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-500 border-rose-100"
                  )}>
                    {inStock ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
                    {inStock ? "In Stock" : "Unavailable"}
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-[#222222] leading-[1.1] mb-6 tracking-tight">
                  {product.name}
                </h1>

                <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-50">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i <= Math.round(product.rating || 4.5) ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-100"
                          }`}
                      />
                    ))}
                    <span className="text-sm font-black text-[#222222] ml-2">
                      {product.rating || "4.5"}
                    </span>
                  </div>
                  <div className="w-[1px] h-4 bg-slate-200" />
                  <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                    {product.reviews_count || 48} Reviews
                  </span>
                </div>

                <div className="flex items-baseline gap-5 mb-10">
                  <span className="text-5xl font-black text-primary tracking-tighter">
                    R {price.toLocaleString("en-ZA")}
                  </span>
                  <span className="text-xl text-slate-300 line-through font-bold">
                    R {(price * 1.2).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs font-black">
                    -20%
                  </span>
                </div>

                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-50 mb-10">
                  <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Product overview</h3>
                  <p className="text-slate-600 text-base leading-relaxed font-normal">
                    {product.description || "Every MzansiServe product is carefully selected to meet our high quality standards. This item combines durability with modern design to provide exceptional value for our customers."}
                  </p>
                </div>

                {/* Seller Info */}
                <div className="flex items-center gap-4 mb-10 p-5 rounded-2xl border border-slate-50 bg-white shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 shadow-inner">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Verified seller</p>
                    <p className="text-base font-bold text-[#222222]">{product.seller_name || "Official ads"}</p>
                  </div>
                </div>

                {/* Add to Cart / External Button Controls */}
                <div className="flex flex-col gap-5 mb-12">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {product.product_type === 'external' ? (
                      <Button
                        onClick={() => {
                          if (product.external_url) {
                            window.open(product.external_url, "_blank");
                          } else {
                            toast({ title: "Link unavailable", variant: "destructive" });
                          }
                        }}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary text-white font-bold text-xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 flex-1"
                      >
                        {product.button_text || "Buy on External Site"}
                      </Button>
                    ) : (
                      <>
                        <div className="flex items-center bg-slate-50 rounded-2xl h-16 px-2 w-full sm:w-auto border border-transparent focus-within:border-primary/20 transition-all">
                          <button
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90"
                          >
                            <Minus className="h-5 w-5" strokeWidth={3} />
                          </button>
                          <span className="w-12 text-center text-xl font-black text-[#222222]">{quantity}</span>
                          <button
                            onClick={() => setQuantity((q) => q + 1)}
                            className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90"
                          >
                            <Plus className="h-5 w-5" strokeWidth={3} />
                          </button>
                        </div>

                        <Button
                          disabled={!inStock}
                          onClick={handleAddToCart}
                          className="w-full h-16 rounded-2xl bg-primary hover:bg-primary text-white font-bold text-xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 flex-1"
                        >
                          <ShoppingCart className="h-6 w-6 mr-3" strokeWidth={2.5} />
                          Add to Bag
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-10 border-t border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm shadow-blue-100/50">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-[#222222] uppercase tracking-widest mb-0.5">Fast Delivery</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase truncate">2-3 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-100/50">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-[#222222] uppercase tracking-widest mb-0.5">Secure Pay</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Encrypted</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-amber-100/50">
                      <RotateCcw className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-[#222222] uppercase tracking-widest mb-0.5">Easy returns</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase truncate">30-day</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Placeholder for missing Loader2 icon
const Loader2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("animate-spin", className)}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);

export default ProductDetails;
