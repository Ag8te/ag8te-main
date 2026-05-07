import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    ArrowDownLeft,
    Search,
    User,
    Mail,
    Filter,
    MessageSquare,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface WithdrawalRequest {
    id: string;
    user_id: string;
    amount: number;
    status: 'pending' | 'paid' | 'reversed';
    admin_notes: string | null;
    created_at: string;
    processed_at: string | null;
    user_name?: string;
    user_email?: string;
    user_role?: string;
    banking_details?: {
        bank_name: string;
        account_number: string;
        account_holder: string;
        branch_code: string;
    };
}

export const WithdrawalsManagement = () => {
    const { toast } = useToast();
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal States
    const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionNotes, setActionNotes] = useState("");
    const [processingAction, setProcessingAction] = useState(false);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch("/api/admin/withdrawal-requests", { headers: adminHeaders });
            if (res?.success) {
                setRequests(res.data.withdrawal_requests);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load withdrawal requests.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleAction = async (status: 'paid' | 'reversed') => {
        if (!selectedRequest) return;
        setProcessingAction(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/withdrawal-requests/${selectedRequest.id}`, {
                method: "PATCH",
                headers: adminHeaders,
                data: {
                    status,
                    admin_notes: actionNotes
                }
            });

            if (res?.success) {
                toast({
                    title: "Success",
                    description: `Request marked as ${status}.`,
                    className: status === 'paid' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                });
                setIsActionModalOpen(false);
                fetchRequests();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Action failed", variant: "destructive" });
        } finally {
            setProcessingAction(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'paid') return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100  px-2 py-0.5 font-bold uppercase text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
        if (s === 'pending') return <Badge className="bg-amber-50 text-amber-600 border-amber-100  px-2 py-0.5 font-bold uppercase text-[10px]"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
        return <Badge className="bg-rose-50 text-rose-600 border-rose-100  px-2 py-0.5 font-bold uppercase text-[10px]"><RefreshCw className="w-3 h-3 mr-1" /> Reversed</Badge>;
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = (req.user_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (req.user_email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            req.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
                        Withdrawal Requests
                        <Badge variant="outline" className=" bg-[#ede7f6] text-[#5e35b1] border-[#d1c4e9] font-bold text-[10px]">{requests.filter(r => r.status === 'pending').length} New</Badge>
                    </h3>
                    <p className="text-sm text-slate-500">Approve or reverse withdrawal requests from earners.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search requests..."
                            className="pl-10 font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {['all', 'pending', 'paid', 'reversed'].map((status) => (
                    <Button
                        key={status}
                        variant={statusFilter === status ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                            " px-4 h-8 font-bold text-[11px] uppercase tracking-wider transition-all",
                            statusFilter === status ? "bg-[#5e35b1] hover:bg-[#4527a0] shadow-md shadow-purple-200" : "text-slate-400 hover:bg-slate-100"
                        )}
                    >
                        {status}
                    </Button>
                ))}
            </div>

            {/* Requests Table */}
            <div className=" border border-slate-100 bg-white shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">UserInfo / Date</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-24 text-center"><Loader2 className="animate-spin h-8 w-8 text-[#5e35b1] mx-auto" /></td></tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-24 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No requests found.</td></tr>
                            ) : (
                                filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="h-6 w-6  bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">
                                                        {req.user_name?.charAt(0).toUpperCase() || "U"}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">{req.user_name || "User"}</span>
                                                    <Badge variant="outline" className="text-[8px] font-bold uppercase border-slate-200 text-slate-400  px-1">{req.user_role}</Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {req.user_email}</span>
                                                    <span className="flex items-center gap-1 font-mono uppercase">ID: {req.id.slice(0, 8)}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-300 font-bold mt-1 uppercase italic">{new Date(req.created_at).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-slate-900 tracking-tighter">R {req.amount.toFixed(2)}</span>
                                                {req.admin_notes && <span className="text-[10px] text-slate-400 italic flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" /> notes present</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(req.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {req.status === 'pending' ? (
                                                <Button
                                                    onClick={() => { setSelectedRequest(req); setActionNotes(req.admin_notes || ""); setIsActionModalOpen(true); }}
                                                    className="h-8  bg-[#5e35b1] hover:bg-[#4527a0] font-bold text-[11px] uppercase tracking-wider px-4 shadow-sm"
                                                >
                                                    Resolve
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setSelectedRequest(req); setActionNotes(req.admin_notes || ""); setIsActionModalOpen(true); }}
                                                    className="h-8  text-slate-400 font-bold hover:bg-slate-100"
                                                >
                                                    View
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resolution Modal */}
            <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
                <DialogContent className=" border-none shadow-2xl bg-white sm:max-w-[450px] p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Resolve Withdrawal</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {selectedRequest?.status === 'pending'
                                ? "Complete the payment or reverse the funds back to user wallet."
                                : "Reviewing completed withdrawal details."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                        <div className="bg-[#ede7f6]/30 p-4  border border-[#ede7f6] flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-[#5e35b1] uppercase tracking-widest">Amount to Pay</p>
                                <p className="text-3xl font-bold text-slate-900 tracking-tighter">R {selectedRequest?.amount.toFixed(2)}</p>
                            </div>
                        </div>

                        {selectedRequest?.banking_details?.bank_name ? (
                            <div className="bg-slate-50 border border-slate-100 p-4 space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bank Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Bank Name</p>
                                        <p className="text-sm font-bold text-slate-900 tracking-tighter">{selectedRequest?.banking_details.bank_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Account Holder</p>
                                        <p className="text-sm font-bold text-slate-900 tracking-tighter">{selectedRequest?.banking_details.account_holder}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Account Number</p>
                                        <p className="text-sm font-bold text-slate-900 tracking-tighter">{selectedRequest?.banking_details.account_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Branch Code</p>
                                        <p className="text-sm font-bold text-slate-900 tracking-tighter">{selectedRequest?.banking_details.branch_code}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-50 border border-amber-100 p-3">
                                <p className="text-[11px] font-bold text-amber-600">No bank details provided for this request.</p>
                                </div>
                             
                        )}

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Administrative Notes</label>
                            <Textarea
                                placeholder="Payment reference, transaction ID, or reason for reversal..."
                                className="font-medium resize-none p-4"
                                value={actionNotes}
                                readOnly={selectedRequest?.status !== 'pending'}
                                onChange={(e) => setActionNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3">
                        {selectedRequest?.status === 'pending' ? (
                            <>
                                <Button
                                    variant="outline"
                                    disabled={processingAction}
                                    className="flex-1 h-12  font-bold border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                    onClick={() => handleAction('reversed')}
                                >
                                    Reverse Funds
                                </Button>
                                <Button
                                    disabled={processingAction}
                                    className="flex-1 h-12  bg-emerald-500 hover:bg-emerald-600 font-bold px-8 shadow-lg shadow-emerald-200"
                                    onClick={() => handleAction('paid')}
                                >
                                    {processingAction ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirm Paid"}
                                </Button>
                            </>
                        ) : (
                            <Button className="w-full h-12  bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold" onClick={() => setIsActionModalOpen(false)}>Close Review</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
