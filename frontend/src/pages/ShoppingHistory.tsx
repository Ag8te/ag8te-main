import { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Package, ArrowLeft, CheckCircle2, Clock, XCircle, ChevronRight, ShoppingBag, Receipt, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookingDetailsModal } from "@/components/dashboards/BookingDetailsModal";

type OrderItem = {
    product_id: string;
    quantity: number;
    product_name?: string;
};

type Order = {
    id: string;
    status: string;
    total: number;
    items: OrderItem[];
    placed_at: string;
    shipping?: any;
};

const ShoppingHistory = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await apiFetch("/api/shop/orders");
                if (response.success && response.data?.orders) {
                    setOrders(response.data.orders);
                    setFilteredOrders(response.data.orders);
                }
            } catch (error) {
                console.error("Failed to fetch orders:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchOrders();
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");
    const { clearCart } = useCart();

    useEffect(() => {
        if (paymentStatus === "success") {
            clearCart();
        }
    }, [paymentStatus, clearCart]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredOrders(orders);
            return;
        }
        const lowerSearch = searchTerm.toLowerCase();
        const filtered = orders.filter((order) => {
            if (order.id.toLowerCase().includes(lowerSearch)) return true;
            if (order.status.toLowerCase().includes(lowerSearch)) return true;
            if (order.items.some(item => item.product_name && item.product_name.toLowerCase().includes(lowerSearch))) return true;
            return false;
        });
        setFilteredOrders(filtered);
    }, [searchTerm, orders]);

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'paid':
            case 'delivered':
            case 'success':
                return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case 'cancelled':
            case 'failed':
                return "bg-rose-50 text-rose-500 border-rose-100";
            default:
                return "bg-amber-50 text-amber-600 border-amber-100";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'paid':
            case 'delivered':
            case 'success':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'cancelled':
            case 'failed':
                return <XCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <main className="min-h-screen bg-white flex flex-col">
            <Navbar />

            {/* ── Page header ── */}
            <section className="pt-32 pb-12 bg-white relative overflow-hidden border-b border-slate-50">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23EEF2FF\' fill-opacity=\'1\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-70" />
                <div className="container mx-auto px-6 max-w-5xl relative z-10">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/shop')}
                        className="mb-8 -ml-4 gap-2 text-slate-400 hover:text-primary font-bold transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" /> Back to Shop
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <span className="inline-block mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Orders</span>
                            <h1 className="text-4xl md:text-5xl font-bold text-[#222222] tracking-tight">Shopping History</h1>
                            <p className="text-xl text-slate-500 font-normal mt-3">Track your purchases and orders</p>
                        </div>
                        <div className="w-full md:w-auto mt-6 md:mt-0 relative group">
                            <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by ID, Status, or Item..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-80 h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-primary/20 outline-none font-medium text-slate-700 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <div className="flex-1 bg-white">
                <div className="container mx-auto px-6 py-12 max-w-5xl">

                    {paymentStatus === 'success' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-12 rounded-[2rem] bg-emerald-50 border border-emerald-100 p-10 flex flex-col items-center text-center shadow-sm"
                        >
                            <div className="bg-white p-4 rounded-2xl mb-6 shadow-sm shadow-emerald-200/50">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-emerald-900 mb-3 tracking-tight">Payment Successful!</h2>
                            <p className="text-emerald-700 text-lg max-w-md mx-auto font-medium leading-relaxed">
                                Your order has been placed successfully. You'll receive a confirmation email shortly.
                            </p>
                        </motion.div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                            <Clock className="h-10 w-10 animate-spin text-primary mb-4" />
                            <p className="font-bold">Syncing your history...</p>
                        </div>
                    ) : filteredOrders.length > 0 ? (
                        <div className="space-y-8">
                            {filteredOrders.map((order) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="group bg-white rounded-[2.5rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 overflow-hidden"
                                >
                                    <div className="p-8 sm:p-10">
                                        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8 pb-8 border-b border-slate-50">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 flex-1">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                                                    <p className="text-base font-bold text-[#222222]">#{order.id.slice(-8).toUpperCase()}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Placed On</p>
                                                    <p className="text-base font-bold text-[#222222]">{new Date(order.placed_at).toLocaleDateString()}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</p>
                                                    <p className="text-xl font-black text-primary">R{order.total.toFixed(2)}</p>
                                                </div>
                                                <div className="flex flex-col justify-end">
                                                    <div className={cn("inline-flex items-center self-start gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusStyles(order.status))}>
                                                        {getStatusIcon(order.status)}
                                                        {order.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {(order.shipping?.quote || order.shipping?.shipment_status || order.shipping?.tracking_reference) && (
                                                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/70 p-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="h-11 w-11 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                                                            <Truck className="h-5 w-5" />
                                                        </div>
                                                        <div className="grid flex-1 gap-4 sm:grid-cols-3">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Delivery Service</p>
                                                                <p className="mt-1 text-sm font-bold text-emerald-950">{order.shipping?.quote?.service_name || "Courier Guy"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Shipment Status</p>
                                                                <p className="mt-1 text-sm font-bold capitalize text-emerald-950">{(order.shipping?.shipment_status || "awaiting shipment").replace(/_/g, " ")}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Tracking Reference</p>
                                                                <p className="mt-1 text-sm font-bold text-emerald-950">{order.shipping?.tracking_reference || order.shipping?.shipment?.tracking_reference || "Pending"}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Receipt className="h-4 w-4" />
                                                </div>
                                                <h4 className="text-sm font-bold text-[#222222] uppercase tracking-widest">Items ordered</h4>
                                            </div>

                                            <div className="space-y-4">
                                                {order.items.map((item: any, index) => (
                                                    <div key={index} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl border border-transparent hover:border-slate-100 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm border border-slate-50 overflow-hidden">
                                                                {item.image_url ? (
                                                                    <img src={getImageUrl(item.image_url)} alt={item.product_name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <ShoppingBag className="h-6 w-6" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-bold text-[#222222]">
                                                                    {item.product_name || `Product #${item.product_id.slice(-6).toUpperCase()}`}
                                                                </p>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Quantity: {item.quantity}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {item.price && (
                                                                <p className="font-black text-slate-900">R{(item.price * item.quantity).toFixed(2)}</p>
                                                            )}
                                                            <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-primary transition-colors ml-auto mt-1" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-8 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    className="rounded-2xl h-12 px-6 font-bold text-primary bg-primary/5 hover:bg-primary/10"
                                                    onClick={() => setSelectedOrder(order)}
                                                >
                                                    View Detailed Receipt <ChevronRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-50 shadow-2xl shadow-slate-200/60 p-16">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <Package className="h-12 w-12 text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-bold text-[#222222]">No orders found</h3>
                            <p className="text-slate-500 mt-4 text-lg max-w-sm mx-auto leading-relaxed font-normal">
                                {searchTerm ? "Try adjusting your search query." : "You haven't placed any orders yet. Start shopping to see your history here."}
                            </p>
                            {!searchTerm && (
                                <div className="mt-10">
                                    <Button
                                        className="h-14 px-10 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg hover:shadow-primary/20 transition-all"
                                        onClick={() => navigate('/shop')}
                                    >
                                        Browse Shop
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Footer />

            {selectedOrder && (
                <BookingDetailsModal
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    data={selectedOrder}
                    type="order"
                />
            )}
        </main>
    );
};

export default ShoppingHistory;
