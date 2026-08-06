import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Search,
    Download,
    CreditCard,
    ShoppingBag,
    Calendar,
    ArrowUpRight,
    Filter,
    ArrowDownLeft,
    CheckCircle2,
    XCircle,
    Clock,
    Wallet,
    Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface Order {
    id: string;
    customer_id?: string;
    total: number;
    status: string;
    placed_at: string;
    shipping?: any;
    customer_email?: string;
}

interface Payment {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    external_id: string;
    created_at: string;
    user_email?: string;
}

export const SalesFinance = () => {
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [trackingInput, setTrackingInput] = useState<string>("");
    const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("orders");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };

            if (activeTab === "orders") {
                const res = await apiFetch("/api/admin/orders", { headers: adminHeaders });
                if (res?.success) {
                    setOrders(res.data.orders);
                }
            } else {
                const res = await apiFetch("/api/admin/payments", { headers: adminHeaders });
                if (res?.success) {
                    setPayments(res.data.payments);
                }
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load financial data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [activeTab, toast]);

    const handleOrderAction = async (
        orderId: string,
        action: 'ship' | 'deliver' | 'cancel',
        trackingNumber?: string
    ) => {
        setActionLoading(orderId);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const body: any = {};
            if (action === 'ship' && trackingNumber) {
                body.tracking_number = trackingNumber;
            }
            if (action === 'cancel') {
                const reason = window.prompt("Reason for cancellation (optional):");
                if (reason !== null) body.reason = reason;
                else { setActionLoading(null); return; }
            }
            const res = await apiFetch(`/api/admin/orders/${orderId}/${action}`, {
                method: 'PATCH',
                headers: adminHeaders,
                data: body,
            });
            if (res?.success) {
                toast({ title: 'Order updated', description: res.message || 'Status updated successfully.' });
                setShippingOrderId(null);
                setTrackingInput("");
                fetchData();
            } else {
                toast({ title: 'Failed', description: res?.message || 'Could not update order.', variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Unexpected error.', variant: 'destructive' });
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredOrders = orders.filter(order => {
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        const matchesSearch =
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getPaymentType = (externalId: string): string => {
        if (!externalId) return "other";
        if (externalId.startsWith("ORD-")) return "shop";
        if (externalId.startsWith("request_")) return "cab";
        if (externalId.startsWith("topup_")) return "wallet";
        if (externalId.startsWith("reg_fee_")) return "registration";
        if (externalId.startsWith("quote_pay_")) return "quote";
        return "other";
    };

    const filteredPayments = payments.filter(payment => {
        const matchesType = paymentTypeFilter === "all" ||
            getPaymentType(payment.external_id) === paymentTypeFilter;
        const matchesSearch =
            payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.external_id?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const isSuccessfulPayment = (status: string) => ['paid', 'completed', 'success', 'successful', 'succeeded'].includes(status.toLowerCase());

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'delivered') {
            return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> {status}</Badge>;
        }
        if (s === 'shipped') {
            return <Badge className="bg-blue-50 text-blue-600 border-blue-100 px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><Truck className="w-3 h-3 mr-1" /> {status}</Badge>;
        }
        if (['paid', 'completed', 'success', 'successful'].includes(s)) {
            return <Badge className="bg-teal-50 text-teal-600 border-teal-100 px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> {status}</Badge>;
        }
        if (['pending', 'processing'].includes(s)) {
            return <Badge className="bg-amber-50 text-amber-600 border-amber-100 px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
        }
        if (['cancelled', 'failed', 'refunded'].includes(s)) {
            return <Badge className="bg-rose-50 text-rose-600 border-rose-100 px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
        }
        return <Badge className="bg-slate-50 text-slate-500 border-slate-100 px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-ZA', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const escapeCSV = (value: any): string => {
        const str = String(value ?? "");
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const exportPaymentsCSV = () => {
        const header = ["Transaction ID", "Date", "Reference", "Method", "Amount", "Currency", "Status"].join(",");
        const rows = filteredPayments.map(payment => [
            escapeCSV(payment.id),
            escapeCSV(formatDate(payment.created_at)),
            escapeCSV(payment.external_id || "N/A"),
            escapeCSV(payment.payment_method),
            escapeCSV(payment.amount.toFixed(2)),
            escapeCSV(payment.currency),
            escapeCSV(payment.status)
        ].join(","));
        const csvContent = [header, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ag8te_payments_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportOrdersCSV = () => {
        const header = [
            "Order ID",
            "Date",
            "Customer Email",
            "Order Total (ZAR)",
            "Status",
            "Product Name",
            "Quantity",
            "Unit Price (ZAR)",
            "Subtotal (ZAR)"
        ].join(",");

        const rows = filteredOrders.flatMap(order => {
            const orderFields = [
                escapeCSV(order.id),
                escapeCSV(formatDate(order.placed_at)),
                escapeCSV(order.customer_email || "Anonymous"),
                escapeCSV((order.total || 0).toFixed(2)),
                escapeCSV(order.status)
            ];
            const items = (order as any).items || [];
            if (items.length === 0) {
                return [[...orderFields, "", "", "", ""].join(",")];
            }
            return items.map((item: any) => [
                ...orderFields,
                escapeCSV(item.product_name || "Product"),
                escapeCSV(item.quantity ?? ""),
                escapeCSV(item.price != null ? parseFloat(item.price).toFixed(2) : ""),
                escapeCSV(item.subtotal != null ? parseFloat(item.subtotal).toFixed(2) : "")
            ].join(","));
        });

        const csvContent = [header, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ag8te_orders_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Sales & Reconciliation</h3>
                    <p className="text-sm text-slate-500">Monitor transactions, orders, and overall site revenue.</p>
                </div>
                <Button
                    variant="outline"
                    className="h-10 border-slate-200 hover:bg-slate-50 font-bold text-slate-600"
                    onClick={() => activeTab === "orders" ? exportOrdersCSV() : exportPaymentsCSV()}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export {activeTab === "orders" ? "Orders" : "Payments"}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className=" border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Volume</span>
                            <div className="h-10 w-10  bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Wallet className="h-5 w-5" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">
                            R {payments.reduce((acc, p) => isSuccessfulPayment(p.status) ? acc + p.amount : acc, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center">
                            <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
                            <span className="font-bold text-emerald-500 mr-1">+12%</span> vs last month
                        </p>
                    </CardContent>
                </Card>
                <Card className=" border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orders Count</span>
                            <div className="h-10 w-10  bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ShoppingBag className="h-5 w-5" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">{orders.length}</div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center">
                            <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
                            <span className="font-bold text-emerald-500 mr-1">+5%</span> growth rate
                        </p>
                    </CardContent>
                </Card>
                <Card className=" border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Order Value</span>
                            <div className="h-10 w-10  bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <CreditCard className="h-5 w-5" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">
                            R {orders.length > 0 ? (orders.reduce((acc, o) => acc + (o.total || 0), 0) / orders.length).toFixed(2) : "0.00"}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center font-bold">
                            Stable compared to period
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <TabsList className="bg-slate-100/50 p-1  h-12 w-full md:w-auto">
                        <TabsTrigger value="orders" className=" px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-[#5e35b1] data-[state=active]:shadow-sm">
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Orders
                        </TabsTrigger>
                        <TabsTrigger value="payments" className=" px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-[#5e35b1] data-[state=active]:shadow-sm">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Payments
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-[350px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={`Search ${activeTab}...`}
                            className="pl-10 h-10  border-slate-100 shadow-none focus:ring-[#5e35b1]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white  border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
                    <TabsContent value="orders" className="m-0">
                        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-2">
                            {[
                                { value: "all", label: "All Orders" },
                                { value: "paid", label: "Paid" },
                                { value: "shipped", label: "Shipped" },
                                { value: "delivered", label: "Delivered" },
                                { value: "cancelled", label: "Cancelled" },
                                { value: "pending", label: "Pending" },
                            ].map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                        statusFilter === filter.value
                                            ? "bg-[#5e35b1] text-white"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    )}
                                >
                                    {filter.label}
                                    <span className="ml-1 opacity-70">
                                        ({filter.value === "all"
                                            ? orders.length
                                            : orders.filter(o => o.status === filter.value).length})
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Order ID / Date</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                    {loading && activeTab === 'orders' ? (
                                        <tr><td colSpan={5} className="px-6 py-24 text-center"><Loader2 className="animate-spin h-8 w-8 text-[#5e35b1] mx-auto" /></td></tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-24 text-center text-slate-400 italic">No orders found.</td></tr>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-mono font-bold text-slate-400">#{order.id.slice(0, 8).toUpperCase()}</span>
                                                        <span className="text-sm font-semibold text-slate-900">{formatDate(order.placed_at)}</span>
                                                        {order.items && order.items.length > 0 && (
                                                            <span className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">
                                                                {order.items.slice(0, 3).map((item: any) =>
                                                                    `${item.product_name || "Product"}${item.variant_label ? ` (${item.variant_label})` : ""} x${item.quantity}`
                                                                ).join(", ")}
                                                                {order.items.length > 3 && ` +${order.items.length - 3} more`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8  bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                            {order.customer_email?.charAt(0).toUpperCase() || "U"}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-600">{order.customer_email || "Anonymous"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-black text-slate-900">R {(order.total || 0).toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(order.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {order.status === 'paid' && shippingOrderId !== order.id && (
                                                            <Button
                                                                size="sm"
                                                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                                disabled={actionLoading === order.id}
                                                                onClick={() => { setShippingOrderId(order.id); setTrackingInput(""); }}
                                                            >
                                                                Mark as Shipped
                                                            </Button>
                                                        )}
                                                        {order.status === 'paid' && shippingOrderId === order.id && (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Tracking number (optional)"
                                                                    value={trackingInput}
                                                                    onChange={(e) => setTrackingInput(e.target.value)}
                                                                    className="h-8 px-2 text-xs border border-slate-200 rounded-lg w-40 focus:outline-none focus:border-blue-400"
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                                    disabled={actionLoading === order.id}
                                                                    onClick={() => handleOrderAction(order.id, 'ship', trackingInput)}
                                                                >
                                                                    {actionLoading === order.id ? '...' : 'Confirm'}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 text-slate-500"
                                                                    onClick={() => setShippingOrderId(null)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {order.status === 'shipped' && (
                                                            <Button
                                                                size="sm"
                                                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                                disabled={actionLoading === order.id}
                                                                onClick={() => handleOrderAction(order.id, 'deliver')}
                                                            >
                                                                {actionLoading === order.id ? '...' : 'Mark as Delivered'}
                                                            </Button>
                                                        )}
                                                        {(order.status === 'pending' || order.status === 'paid') && shippingOrderId !== order.id && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 text-rose-500 hover:bg-rose-50 font-bold"
                                                                disabled={actionLoading === order.id}
                                                                onClick={() => handleOrderAction(order.id, 'cancel')}
                                                            >
                                                                {actionLoading === order.id ? '...' : 'Cancel'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>

                    <TabsContent value="payments" className="m-0">
                        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-2">
                            {[
                                { value: "all",          label: "All Payments" },
                                { value: "shop",         label: "Shop Orders" },
                                { value: "cab",          label: "Cab Rides" },
                                { value: "wallet",       label: "Wallet Top-ups" },
                                { value: "registration", label: "Registrations" },
                                { value: "other",        label: "Other" },
                            ].map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setPaymentTypeFilter(filter.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                        paymentTypeFilter === filter.value
                                            ? "bg-[#5e35b1] text-white"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    )}
                                >
                                    {filter.label}
                                    <span className="ml-1 opacity-70">
                                        ({filter.value === "all"
                                            ? payments.length
                                            : payments.filter(p =>
                                                getPaymentType(p.external_id) === filter.value
                                              ).length})
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Transaction ID</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Reference</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Method</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                    {loading && activeTab === 'payments' ? (
                                        <tr><td colSpan={5} className="px-6 py-24 text-center"><Loader2 className="animate-spin h-8 w-8 text-[#5e35b1] mx-auto" /></td></tr>
                                    ) : filteredPayments.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-24 text-center text-slate-400 italic">No payments found.</td></tr>
                                    ) : (
                                        filteredPayments.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-mono font-bold text-slate-400">TXN-{payment.id.slice(0, 8).toUpperCase()}</span>
                                                        <span className="text-sm font-semibold text-slate-900">{formatDate(payment.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                                                    <span className="text-xs font-medium text-slate-500">{payment.external_id || "N/A"}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold uppercase text-[9px] ">
                                                        {payment.payment_method}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-black text-slate-900">{payment.currency} {payment.amount.toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(payment.status)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};
