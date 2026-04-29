import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Filter, RefreshCcw, Calendar, User, ClipboardList } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ServiceRequest {
    id: string;
    request_type: string;
    requester_id?: string;
    requester_name?: string;
    provider_name?: string;
    status: string;
    payment_status?: string;
    payment_amount?: number;
    dispatch_state?: string;
    cancellation_reason?: string;
    car_type?: string;
    distance_km?: number;
    created_at: string;
}

export const RequestsManagement = () => {
    const { toast } = useToast();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters and pagination
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalRequests, setTotalRequests] = useState(0);
    const limit = 10;

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const offset = (page - 1) * limit;

            let url = `/api/admin/requests?limit=${limit}&offset=${offset}`;
            if (statusFilter !== "all") url += `&status=${statusFilter}`;
            if (typeFilter !== "all") url += `&type=${typeFilter}`;
            if (paymentFilter !== "all") url += `&payment_status=${paymentFilter}`;

            const res = await apiFetch(url, { headers: adminHeaders });
            if (res?.success) {
                setRequests(res.data.requests);
                setTotalRequests(res.data.total);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load requests.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, typeFilter, paymentFilter, toast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const totalPages = Math.ceil(totalRequests / limit);

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'accepted': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'unpaid': return 'bg-slate-50 text-slate-700 border-slate-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const getPaymentStyles = (status?: string) => {
        switch ((status || "").toLowerCase()) {
            case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'refunded': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'pending':
            default:
                return 'bg-amber-50 text-amber-700 border-amber-100';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'cab': return '🚕';
            case 'professional': return '💼';
            case 'provider': return '🛠️';
            default: return '📋';
        }
    };

    const getDispatchLabel = (req: ServiceRequest) => {
        if (req.request_type !== 'cab') return 'n/a';
        if (req.dispatch_state) return req.dispatch_state.replace(/_/g, ' ');
        return req.status;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Stats Summary can be added here if needed */}

            {/* Filters Section */}
            <div className="bg-white p-6  shadow-sm border border-slate-100 mb-6">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Filter className="w-3 h-3" />
                            Status Filter
                        </label>
                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                            <SelectTrigger className="h-11 ">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className=" border-slate-200">
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <ClipboardList className="w-3 h-3" />
                            Type Filter
                        </label>
                        <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                            <SelectTrigger className="h-11 ">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent className=" border-slate-200">
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="cab">Cab / Delivery</SelectItem>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="provider">Service Provider</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Filter className="w-3 h-3" />
                            Payment Filter
                        </label>
                        <Select value={paymentFilter} onValueChange={(val) => { setPaymentFilter(val); setPage(1); }}>
                            <SelectTrigger className="h-11 ">
                                <SelectValue placeholder="All Payments" />
                            </SelectTrigger>
                            <SelectContent className=" border-slate-200">
                                <SelectItem value="all">All Payments</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setPaymentFilter("all"); setPage(1); }}
                        className="h-11  border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 shrink-0 md:w-auto w-full"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Reset
                    </Button>
                </div>
            </div>

            {/* Requests Table */}
            <div className=" border border-slate-100 bg-white shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Request ID</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Service Type</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Ride Stage</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Request Status</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Payment</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Trip Meta</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Date Created</th>
                                    </tr>
                                </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="relative">
                                                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#5e35b1]  animate-spin" />
                                                <Loader2 className="w-6 h-6 text-[#5e35b1] absolute inset-0 m-auto animate-pulse" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-500">Fetching requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <ClipboardList className="w-12 h-12 text-slate-300" />
                                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">No requests matching your filters</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-[#5e35b1] bg-[#f3e8ff] px-2 py-0.5 rounded">
                                                    #{req.id.substring(0, 8)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{getTypeIcon(req.request_type)}</span>
                                                <span className="text-sm font-semibold text-slate-900 capitalize">
                                                    {req.request_type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm font-medium">
                                                    {req.requester_name || (req.requester_id ? req.requester_id.substring(0, 8) + '...' : 'N/A')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant="outline" className="border px-2.5 py-0.5 font-bold uppercase text-[10px] tracking-wider shadow-sm">
                                                {getDispatchLabel(req)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant="outline" className={cn(" border px-2.5 py-0.5 font-bold uppercase text-[10px] tracking-wider transition-all shadow-sm", getStatusStyles(req.status))}>
                                                {req.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant="outline" className={cn(" border px-2.5 py-0.5 font-bold uppercase text-[10px] tracking-wider transition-all shadow-sm", getPaymentStyles(req.payment_status))}>
                                                {req.payment_status || "pending"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-slate-900">
                                                R{Number(req.payment_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-semibold text-slate-600 space-y-1">
                                                {req.request_type === 'cab' && (
                                                    <>
                                                        <div>{req.car_type ? `Vehicle: ${req.car_type}` : 'Vehicle: n/a'}</div>
                                                        <div>{req.distance_km ? `Distance: ${req.distance_km.toFixed(1)} km` : 'Distance: n/a'}</div>
                                                    </>
                                                )}
                                                {req.cancellation_reason && (
                                                    <div className="max-w-[220px] truncate text-rose-600" title={req.cancellation_reason}>
                                                        Reason: {req.cancellation_reason}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar className="w-4 h-4 opacity-50" />
                                                <span className="text-xs font-semibold">
                                                    {new Date(req.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-8 py-6 border-t border-slate-50 flex justify-between items-center bg-white">
                        <Button
                            variant="ghost"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-10  font-bold text-slate-600 hover:bg-white hover:text-[#5e35b1] disabled:opacity-30 border border-transparent hover:border-slate-100 shadow-none"
                        >
                            Previous
                        </Button>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-[#5e35b1] uppercase tracking-[0.2em] mb-1">
                                Progress
                            </span>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1.5  transition-all duration-300",
                                            page === i + 1 ? "w-8 bg-[#5e35b1]" : "w-1.5 bg-slate-200"
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 mt-2">
                                Page {page} <span className="mx-1 text-slate-200">/</span> {totalPages}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="h-10  font-bold text-slate-600 hover:bg-white hover:text-[#5e35b1] disabled:opacity-30 border border-transparent hover:border-slate-100 shadow-none"
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
