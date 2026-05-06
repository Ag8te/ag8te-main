import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";

interface Product {
    id: string;
    name: string;
    description: string;
    price: string | number;
    image_url: string | null;
    category?: { title: string } | null;
    in_stock: boolean;
    seller_name?: string;
}

const FeaturedProducts = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        apiFetch("/api/shop/products?limit=8&in_stock=true")
            .then(res => {
                const items = res?.data?.products || [];
                setProducts(items.slice(0, 8));
            })
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, []);

    if (!loading && products.length === 0) return null;

    return (
        <section ref={ref} className="py-12 lg:py-16">
            <div className="container mx-auto px-4 lg:px-8">
                <motion.div
                    className="mb-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4"
                >
                    <div>
                        <span className="mb-2 inline-block rounded-full bg-sa-red/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sa-red">
                            Shop
                        </span>
                        <h2 className="text-3xl font-bold lg:text-4xl">Featured Products</h2>
                        <p className="mt-2 text-muted-foreground max-w-lg">
                            Discover popular products from verified local sellers across South Africa.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/shop")} className="shrink-0">
                        View All <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </motion.div>

                {loading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-border bg-muted/40 h-64 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((product, i) => {
                            const imgSrc = product.image_url
                                ? (getImageUrl(product.image_url))
                                : null;
                            const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;

                            return (
                                <motion.div
                                    key={product.id}
                                    className="group cursor-pointer rounded-[2rem] border border-slate-50 bg-white overflow-hidden shadow-sm shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/80 transition-all duration-500 hover:-translate-y-2"
                                    onClick={() => navigate(`/shop/product/${product.id}`)}
                                >
                                    <div className="relative h-56 bg-slate-50 overflow-hidden">
                                        {imgSrc ? (
                                            <img
                                                src={imgSrc}
                                                alt={product.name}
                                                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <ShoppingBag className="h-10 w-10 text-slate-200" />
                                            </div>
                                        )}
                                        {!product.in_stock && (
                                            <span className="absolute top-4 left-4 rounded-full bg-white/90 backdrop-blur-md text-[#222222] text-[10px] font-bold uppercase tracking-wider px-3 py-1 shadow-sm">
                                                Sold Out
                                            </span>
                                        )}
                                        <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-xl">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            Verified
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            {product.category?.title && (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                                    {product.category.title}
                                                </p>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-base text-[#222222] leading-tight line-clamp-1 mb-2">
                                            {product.name}
                                        </h3>
                                        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                                                <ShieldCheck className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                                    Verified seller
                                                </p>
                                                <p className="truncate text-sm font-bold text-emerald-950">
                                                    {product.seller_name || "MzansiServe"}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-lg text-primary">
                                            R{!isNaN(price) ? price.toLocaleString() : "—"}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default FeaturedProducts;
