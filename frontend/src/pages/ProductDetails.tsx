import { useState, useMemo, useEffect } from "react";
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
  Heart,
  Loader2,
  ExternalLink,
  MapPin
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
  inventory?: {
    quantity: number;
    reserved_quantity: number;
    available_quantity: number;
  };
  is_active?: boolean;
  seller_name?: string;
  rating?: number;
  reviews_count?: number;
  product_type?: "simple" | "variable" | "grouped" | "external";
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
  locations?: string[];
}

const normalizeProductLocations = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [bundledProducts, setBundledProducts] = useState<ApiProduct[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedAttributes]);

  // Fetch product details
  const {
    data: productRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiFetch(`/api/shop/products/${id}`),
    enabled: !!id,
  });

  const product: ApiProduct | null = productRes?.data || null;

  useEffect(() => {
    if (
      product?.product_type === "grouped" &&
      Array.isArray(product.grouped_products) &&
      product.grouped_products.length > 0
    ) {
      Promise.all(
        product.grouped_products.map((pid: string) =>
          apiFetch(`/api/shop/products/${pid}`)
            .then((r) => r?.data || null)
            .catch(() => null)
        )
      ).then((results) => {
        setBundledProducts(results.filter(Boolean) as ApiProduct[]);
      });
    } else {
      setBundledProducts([]);
    }
  }, [product]);

  const images = useMemo(() => {
    if (!product) return [];
    const imgs = product.images?.map((img) => img.image_url) || [];
    if (product.image_url && !imgs.includes(product.image_url)) {
      imgs.unshift(product.image_url);
    }
    const base = imgs.length > 0 ? imgs : [null];

    // For variable products, if a colour attribute has an image for the selected value,
    // move it to the front of the gallery
    if (product.product_type === "variable" && product.attributes) {
      const colorAttr = (product.attributes as Array<{
        name: string;
        values: string[];
        images?: Record<string, string>;
      }>).find(a => ["color", "colour"].includes(a.name.toLowerCase()));

      if (colorAttr?.images) {
        const selectedColor = selectedAttributes[colorAttr.name];
        if (selectedColor && colorAttr.images[selectedColor]) {
          const variantUrl = colorAttr.images[selectedColor];
          const reordered = [
            variantUrl,
            ...base.filter(img => img !== variantUrl),
          ];
          return reordered;
        }
      }
    }

    return base;
  }, [product, selectedAttributes]);

  const price = useMemo(() => {
    if (!product) return 0;
    const v =
      typeof product.price === "string"
        ? parseFloat(product.price)
        : product.price;
    return isNaN(v) ? 0 : v;
  }, [product]);

  // Variable product — find the variation that matches all selected attributes
  const selectedVariation = useMemo(() => {
    if (product?.product_type !== "variable") return null;
    if (!product.variations || !product.attributes) return null;
    const attrNames = (product.attributes as Array<{ name: string; values: string[] }>).map(a => a.name);
    const allSelected = attrNames.every(name => selectedAttributes[name]);
    if (!allSelected) return null;
    return (product.variations as Array<{
      sku: string;
      price: number;
      stock: number;
      attributes: Record<string, string>;
    }>).find(v =>
      attrNames.every(name => v.attributes[name] === selectedAttributes[name])
    ) || null;
  }, [product, selectedAttributes]);

  const displayPrice = useMemo(() => {
    if (selectedVariation) return selectedVariation.price;
    return price;
  }, [selectedVariation, price]);

  const getImageSrc = (url: string | null) => {
    if (!url) return null;
    return getImageUrl(url) || null;
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (product.product_type === "grouped") {
      if (bundledProducts.length === 0) {
        toast({
          title: "Bundle unavailable",
          description: "This bundle has no products.",
          variant: "destructive",
        });
        return;
      }
      const outOfStockItem = bundledProducts.find((p) => {
        const avail = p.inventory?.available_quantity;
        return avail !== undefined ? avail <= 0 : p.in_stock === false;
      });
      if (outOfStockItem) {
        toast({
          title: "Bundle unavailable",
          description: `${outOfStockItem.name} is currently out of stock.`,
          variant: "destructive",
        });
        return;
      }
      const individualTotal = bundledProducts.reduce(
        (acc, p) => acc + parseFloat(String(p.price || 0)),
        0
      );
      const bundlePrice = parseFloat(String(product.price || 0));
      const discountAmount = individualTotal - bundlePrice;

      bundledProducts.forEach((p) =>
        addToCart({ ...p, bundleId: product.id, bundleName: product.name } as any)
      );

      if (discountAmount > 0.01) {
        const discountProduct = {
          id: `BUNDLE-DISCOUNT-${product.id}`,
          name: `Bundle Discount: ${product.name}`,
          category: product.category?.title || "Bundle",
          price: -discountAmount,
          image: "",
          seller: "MzansiServe",
          rating: 5,
          reviews: 0,
          inStock: true,
          description: "Bundle discount applied",
          bundleId: product.id,
          isDiscount: true,
        };
        addToCart(discountProduct as any);
      }

      toast({
        title: "Bundle added to cart",
        description: discountAmount > 0.01
          ? `${bundledProducts.length} items added — R${discountAmount.toFixed(2)} bundle discount applied.`
          : `${bundledProducts.length} items added to your bag.`,
      });
      return;
    }

    if (product.product_type === "variable") {
      if (!selectedVariation) {
        toast({ title: "Please select all options", variant: "destructive" });
        return;
      }
      const variantProduct = {
        ...product,
        price: selectedVariation.price,
        sku: selectedVariation.sku,
        variantLabel: Object.entries(selectedAttributes).map(([k, v]) => `${k}: ${v}`).join(", "),
      };
      for (let i = 0; i < quantity; i++) {
        addToCart(variantProduct as any);
      }
      toast({
        title: "Added to cart",
        description: `${quantity} x ${product.name} (${variantProduct.variantLabel}) added to your cart.`,
      });
      return;
    }
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
          <h1 className="text-3xl font-bold text-[#222222] mb-4 tracking-tight">
            Product Not Found
          </h1>
          <p className="text-slate-500 max-w-sm mb-10 text-lg font-normal leading-relaxed">
            The product you're looking for doesn't exist or has been removed
            from our shop.
          </p>
          <Button
            onClick={() => navigate("/shop")}
            className="h-14 px-10 rounded-2xl bg-primary text-white font-bold"
          >
            Back to Shop
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // We  check is_active — if the admin deactivated the product,
  // we treat it as unavailable regardless of stock numbers.
  // The out of stock message block already handles the display correctly
  
  const inStock =
    product.is_active !== false &&
    (product.product_type === "external"
      ? true
      : product.product_type === "variable"
        ? selectedVariation !== null && selectedVariation.stock > 0
        : product.product_type === "grouped"
          ? bundledProducts.length > 0 &&
            bundledProducts.every((p) => {
              const avail = p.inventory?.available_quantity;
              return avail !== undefined ? avail > 0 : p.in_stock !== false;
            })
          : product.inventory
            ? product.inventory.available_quantity > 0
            : product.in_stock !== false);
  const productLocations = normalizeProductLocations(product.locations);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Breadcrumbs & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <button
                onClick={() => navigate("/")}
                className="hover:text-primary transition-colors"
              >
                Home
              </button>
              <ChevronRight className="h-3 w-3" />
              <button
                onClick={() => navigate("/shop")}
                className="hover:text-primary transition-colors"
              >
                Shop
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-900 truncate max-w-[200px]">
                {product.name}
              </span>
            </nav>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="h-10 w-10 p-0 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                className="h-10 w-10 p-0 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400"
              >
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
                    src={
                      getImageSrc(images[selectedImageIndex]) ||
                      "/placeholder.png"
                    }
                    alt={product.name}
                    className="w-full h-full object-contain p-12 md:p-20"
                  />
                </AnimatePresence>

                {images.length > 1 && (
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() =>
                        setSelectedImageIndex((prev) =>
                          prev === 0 ? images.length - 1 : prev - 1,
                        )
                      }
                      className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl flex items-center justify-center text-slate-900 hover:scale-110 active:scale-95 transition-all"
                    >
                      <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedImageIndex((prev) =>
                          prev === images.length - 1 ? 0 : prev + 1,
                        )
                      }
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
                          : "border-slate-50 hover:border-slate-200",
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
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-wider border border-primary/10">
                    {product.category?.title || (product.product_type === "external" ? "External Product" : "New Arrival")}
                  </span>
                  {(() => {
                    if (product.product_type === "external") {
                      return (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-orange-50 text-orange-500 border-orange-100">
                          <ExternalLink className="h-3 w-3" strokeWidth={3} />
                          External
                        </div>
                      );
                    }
                    const availQty =
                      product.inventory?.available_quantity ??
                      (inStock ? 99 : 0);
                    if (availQty === 0) {
                      return (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-rose-50 text-rose-500 border-rose-100">
                          <X className="h-3 w-3" strokeWidth={3} />
                          Out of stock
                        </div>
                      );
                    }
                    if (availQty <= 5) {
                      return (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-amber-50 border-amber-100">
                          <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-amber-700">
                            Only {availQty} left in stock — order soon
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-100">
                        <Check className="h-3 w-3" strokeWidth={3} />
                        In Stock
                      </div>
                    );
                  })()}
                  {productLocations.map((location) => (
                    <span
                      key={location}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                      {location}
                    </span>
                  ))}
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-[#222222] leading-[1.1] mb-6 tracking-tight">
                  {product.name}
                </h1>

                <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-50">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i <= Math.round(product.rating || 4.5)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-100 text-slate-100"
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
                    R {displayPrice.toLocaleString("en-ZA")}
                  </span>
                  <span className="text-xl text-slate-300 line-through font-bold">
                    R{" "}
                    {(price * 1.2).toLocaleString("en-ZA", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs font-black">
                    -20%
                  </span>
                </div>

                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-50 mb-10">
                  <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">
                    Product overview
                  </h3>
                  <p className="text-slate-600 text-base leading-relaxed font-normal">
                    {product.description ||
                      "Every MzansiServe product is carefully selected to meet our high quality standards. This item combines durability with modern design to provide exceptional value for our customers."}
                  </p>
                </div>

                {/* Seller Info */}
                <div className="flex items-center gap-4 mb-10 p-5 rounded-2xl border border-slate-50 bg-white shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 shadow-inner">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">
                      Verified seller
                    </p>
                    <p className="text-base font-bold text-[#222222]">
                      {product.seller_name || "Official ads"}
                    </p>
                  </div>
                </div>

                {/* Variant selector — only for variable products */}
                {product.product_type === "variable" && product.attributes && (
                  <div className="mb-10">
                    {(product.attributes as Array<{ name: string; values: string[] }>).map((attr) => {
                      const availableValues = new Set(
                        (product.variations as Array<{ sku: string; price: number; stock: number; attributes: Record<string, string> }>)
                          .filter(v =>
                            Object.entries(selectedAttributes)
                              .filter(([k]) => k !== attr.name)
                              .every(([k, val]) => v.attributes[k] === val)
                          )
                          .map(v => v.attributes[attr.name])
                      );
                      return (
                        <div key={attr.name} className="mb-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                            {attr.name}
                            {selectedAttributes[attr.name] && (
                              <span className="ml-2 text-primary normal-case tracking-normal font-bold">
                                {selectedAttributes[attr.name]}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {attr.values.map((val) => {
                              const isSelected = selectedAttributes[attr.name] === val;
                              const isAvailable = availableValues.has(val);
                              return (
                                <button
                                  key={val}
                                  onClick={() => {
                                    if (!isAvailable) return;
                                    setSelectedAttributes(prev => ({ ...prev, [attr.name]: val }));
                                  }}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                                    isSelected
                                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                      : isAvailable
                                        ? "bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:text-primary"
                                        : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                                  )}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {(() => {
                      const attrNames = (product.attributes as Array<{ name: string }>).map(a => a.name);
                      const allSelected = attrNames.every(name => selectedAttributes[name]);
                      if (!allSelected) return (
                        <p className="text-xs text-slate-400 font-medium mt-2">
                          Select {attrNames.filter(n => !selectedAttributes[n]).join(" and ")} to continue
                        </p>
                      );
                      if (!selectedVariation) return (
                        <p className="text-xs text-rose-500 font-bold mt-2">
                          This combination is unavailable
                        </p>
                      );
                      if (selectedVariation.stock === 0) return (
                        <p className="text-xs text-rose-500 font-bold mt-2">
                          Out of stock for this combination
                        </p>
                      );
                      return (
                        <p className="text-xs text-emerald-600 font-bold mt-2">
                          {selectedVariation.stock} in stock · SKU: {selectedVariation.sku}
                        </p>
                      );
                    })()}
                  </div>
                )}

                {/* Bundle contents — only for grouped products */}
                {product.product_type === "grouped" && (
                  <div className="mb-8">
                    <h3 className="text-lg font-black text-slate-900 mb-4">
                      What's in this bundle
                    </h3>
                    {bundledProducts.length === 0 ? (
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-400 font-medium">
                          Loading bundle contents...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {bundledProducts.map((item) => {
                            const imgUrl = item.images?.[0]?.image_url || item.image_url;
                            const price = parseFloat(String(item.price || 0));
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                              >
                                <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl.startsWith("http") ? imgUrl : `${imgUrl}`}
                                      alt={item.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                                      <Package className="h-6 w-6" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-900 text-sm truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {item.category?.title || "Product"}
                                  </p>
                                </div>
                                <span className="font-black text-primary text-base shrink-0">
                                  R {price.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-500">
                            Bundle total
                          </span>
                          <span className="text-xl font-black text-primary">
                            R {bundledProducts
                              .reduce((acc, p) => acc + parseFloat(String(p.price || 0)), 0)
                              .toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Add to Cart / External Button Controls */}
                <div className="flex flex-col gap-5 mb-12">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {product.product_type === "external" ? (
                      <Button
                        onClick={() => {
                          if (product.external_url) {
                            const url = product.external_url.startsWith("http")
                              ? product.external_url
                              : `https://${product.external_url}`;
                            window.open(url, "_blank");
                          } else {
                            toast({
                              title: "Link unavailable",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary text-white font-bold text-xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 flex-1"
                      >
                        {product.button_text || "Buy on External Site"}
                      </Button>
                    ) : (
                      <>
                        {inStock ? (
                          <>
                            {product.product_type !== "grouped" && (
                            <div className="flex items-center bg-slate-50 rounded-2xl h-16 px-2 w-full sm:w-auto border border-transparent focus-within:border-primary/20 transition-all">
                              <button
                                onClick={() =>
                                  setQuantity((q) => Math.max(1, q - 1))
                                }
                                className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90"
                              >
                                <Minus className="h-5 w-5" strokeWidth={3} />
                              </button>
                              <span className="w-12 text-center text-xl font-black text-[#222222]">
                                {quantity}
                              </span>
                              <button
                                onClick={() => setQuantity((q) => q + 1)}
                                className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90"
                              >
                                <Plus className="h-5 w-5" strokeWidth={3} />
                              </button>
                            </div>
                            )}
                            <Button
                              onClick={handleAddToCart}
                              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary text-white font-bold text-xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 flex-1"
                            >
                              <ShoppingCart
                                className="h-6 w-6 mr-3"
                                strokeWidth={2.5}
                              />
                              Add to Bag
                            </Button>
                          </>
                        ) : (
                          <div className="w-full h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-3">
                            <X
                              className="h-5 w-5 text-rose-400"
                              strokeWidth={2.5}
                            />
                            <span className="text-base font-bold text-slate-400">
                              Out of stock — check back soon
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Trust Badges */}
                {product.product_type === "external" ? (
                  <div className="py-10 border-t border-slate-50 flex items-start gap-3">
                    <ExternalLink className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      This product is sold and fulfilled by an external partner.
                      Delivery, returns, and payment are managed by them directly —
                      not by MzansiServe.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-10 border-t border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm shadow-blue-100/50">
                        <Truck className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-[#222222] uppercase tracking-widest mb-0.5">
                          Fast Delivery
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">
                          2-3 days
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-100/50">
                        <Lock className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-[#222222] uppercase tracking-widest mb-0.5">
                          Secure Pay
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">
                          Encrypted
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-amber-100/50">
                        <RotateCcw className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-[#222222] uppercase tracking-widest mb-0.5">
                          Easy returns
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">
                          30-day
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};;

export default ProductDetails;
