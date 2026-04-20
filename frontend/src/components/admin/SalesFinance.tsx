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
    DollarSign
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
    user_id: string;
    total_amount: number;
    status: string;
    placed_at: string;
    shipping_address?: string;
    user_email?: string;
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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredOrders = orders.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPayments = payments.filter(payment =>
        payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.external_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isSuccessfulPayment = (status: string) => ['paid', 'completed', 'success', 'successful', 'succeeded'].includes(status.toLowerCase());

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (['paid', 'completed', 'success', 'successful'].includes(s)) {
            return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100  px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> {status}</Badge>;
        }
        if (['pending', 'processing'].includes(s)) {
            return <Badge className="bg-amber-50 text-amber-600 border-amber-100  px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
        }
        return <Badge className="bg-rose-50 text-rose-600 border-rose-100  px-2 py-0.5 font-black uppercase text-[10px] shadow-sm"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Sales & Reconciliation</h3>
                    <p className="text-sm text-slate-500">Monitor transactions, orders, and overall site revenue.</p>
                </div>
                <Button variant="outline" className="h-10  border-slate-200 hover:bg-slate-50 font-bold text-slate-600">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className=" border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Volume</span>
                            <div className="h-10 w-10  bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <DollarSign className="h-5 w-5" />
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
                            R {orders.length > 0 ? (orders.reduce((acc, o) => acc + o.total_amount, 0) / orders.length).toFixed(2) : "0.00"}
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
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8  bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                            {order.user_email?.charAt(0).toUpperCase() || "U"}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-600">{order.user_email || "Anonymous"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-black text-slate-900">R {order.total_amount.toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(order.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <Button variant="ghost" size="sm" className="h-8  text-[#5e35b1] font-bold hover:bg-[#ede7f6]">View Details</Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>

                    <TabsContent value="payments" className="m-0">
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
