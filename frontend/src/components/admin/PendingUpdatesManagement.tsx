import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Mail,
    Search,
    Eye,
    ArrowRight,
    AlertCircle,
    BadgeCheck
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

interface PendingUpdate {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    payload: Record<string, any>;
    created_at: string;
    user_email: string | null;
    user_role: string | null;
    user_full_name: string;
    rejection_reason: string | null;
}

export const PendingUpdatesManagement = () => {
    const { toast } = useToast();
    const [updates, setUpdates] = useState<PendingUpdate[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal States
    const [selectedUpdate, setSelectedUpdate] = useState<PendingUpdate | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    const fetchUpdates = useCallback(async () => {
        setLoading(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch("/api/admin/pending-profile-updates", { headers: adminHeaders });
            if (res?.success) {
                const list = Array.isArray(res.data) ? res.data : (res.data?.pending_updates || []);
                setUpdates(list);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load pending updates.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchUpdates();
    }, [fetchUpdates]);

    const handleApprove = async () => {
        if (!selectedUpdate) return;
        setProcessing(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/pending-profile-updates/${selectedUpdate.id}/approve`, {
                method: "POST",
                headers: adminHeaders
            });

            if (res?.success) {
                toast({ title: "Approved", description: "Profile changes applied successfully.", className: "bg-emerald-500 text-white" });
                setIsReviewModalOpen(false);
                fetchUpdates();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Approval failed", variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedUpdate || !rejectionReason.trim()) {
            toast({ title: "Reason Required", description: "Please provide a reason for rejection.", variant: "destructive" });
            return;
        }
        setProcessing(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/pending-profile-updates/${selectedUpdate.id}/reject`, {
                method: "POST",
                headers: adminHeaders,
                data: { reason: rejectionReason }
            });

            if (res?.success) {
                toast({ title: "Rejected", description: "Update request rejected.", className: "bg-rose-500 text-white" });
                setIsReviewModalOpen(false);
                fetchUpdates();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Rejection failed", variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const handleInlineApprove = async (id: string) => {
        if (!window.confirm("Apply this user's pending changes to their profile?")) return;
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/pending-profile-updates/${id}/approve`, {
                method: "POST",
                headers: adminHeaders
            });

            if (res?.success) {
                toast({ title: "Approved", description: "Profile changes applied successfully.", className: "bg-emerald-500 text-white" });
                fetchUpdates();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Approval failed", variant: "destructive" });
        }
    };

    const handleInlineReject = async (id: string) => {
        const reason = window.prompt("Rejection reason (optional):");
        if (reason === null) return;
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/pending-profile-updates/${id}/reject`, {
                method: "POST",
                headers: adminHeaders,
                data: { reason: reason || "" }
            });

            if (res?.success) {
                toast({ title: "Rejected", description: "Update request rejected.", className: "bg-rose-500 text-white" });
                fetchUpdates();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Rejection failed", variant: "destructive" });
        }
    };

    const formatPayloadSummary = (payload: any) => {
        if (!payload || typeof payload !== 'object') return '—';
        const parts = [];
        if (payload.phone) parts.push('Phone');
        if (payload.next_of_kin && Object.keys(payload.next_of_kin).length) parts.push('Next of kin');
        if (payload.driver_services && (Array.isArray(payload.driver_services) ? payload.driver_services.length : 1)) parts.push('Driver services (Cars)');
        if (payload.provider_services && (Array.isArray(payload.provider_services) ? payload.provider_services.length : 1)) parts.push('Add your services');
        if (payload.professional_services && (Array.isArray(payload.professional_services) ? payload.professional_services.length : 1)) parts.push('Professional services');
        if (payload.highest_qualification) parts.push('Highest qualification');
        if (payload.professional_body) parts.push('Professional body');
        if (payload.proof_of_residence_url) parts.push('Proof of residence');
        if (payload.driver_license_url) parts.push('Driver\'s license');
        if (payload.qualification_urls && payload.qualification_urls.length) parts.push('Qualification documents');
        return parts.length ? parts.join(', ') : '—';
    };

    const filteredUpdates = updates.filter(update =>
        (update.user_full_name.toLowerCase()).includes(searchTerm.toLowerCase()) ||
        (update.user_email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

const renderPayloadDiff = (payload: Record<string, any>) => {
    return (
        <div className="grid grid-cols-1 gap-3">

            {/* EXISTING LOGIC (UNCHANGED) */}
            {Object.entries(payload).map(([key, value]) => (
                <div key={key} className="bg-slate-50 p-3 border border-slate-100 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-[#5e35b1] uppercase tracking-widest">
                        {key.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                        <ArrowRight className="w-3 h-3 text-emerald-500" />
                        <span className="text-slate-900 font-bold truncate">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                    </div>
                </div>
            ))}

            {/* ========================= */}
            {/* NEW: VEHICLE DISPLAY */}
            {/* ========================= */}
            {payload?.driver_services && Array.isArray(payload.driver_services) && (
                <div className="mt-4 space-y-4">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                        Vehicles Submitted
                    </h4>

                    {payload.driver_services.map((vehicle: any, i: number) => (
                        <div key={i} className="border p-4 rounded-lg bg-white space-y-2">

                            <div className="font-bold text-slate-900">
                                {vehicle.car_make} {vehicle.car_model}
                            </div>

                            <div className="text-sm text-slate-600">
                                Color: {vehicle.color}
                            </div>

                            <div className="text-sm text-slate-600">
                                Reg: {vehicle.registration_number}
                            </div>

                            {/*  IMAGES */}
                            {vehicle.images && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {vehicle.images.map((img: string, idx: number) => (
                                        <img
                                            key={idx}
                                            src={img}
                                            className="w-20 h-20 object-cover rounded border"
                                        />
                                    ))}
                                </div>
                            )}

                            {/*  DISK */}
                            {vehicle.disk_document && (
                                <a
                                    href={vehicle.disk_document}
                                    target="_blank"
                                    className="text-blue-600 text-sm underline"
                                >
                                    View Vehicle Disk
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
};

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
                        Pending Profile Updates
                        <Badge className="bg-amber-50 text-amber-600 border-amber-100  px-2 py-0.5 font-bold text-[10px] uppercase">
                            {updates.length} Review Required
                        </Badge>
                    </h3>
                    <p className="text-sm text-slate-500">Moderation queue for sensitive profile changes (Service Providers, etc.)</p>
                </div>
                <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by user name or email..."
                        className="pl-10 font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Updates List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-24 text-center"><Loader2 className="animate-spin h-8 w-8 text-[#5e35b1] mx-auto" /></div>
                ) : filteredUpdates.length === 0 ? (
                    <div className="py-24 text-center border-2 border-dashed border-slate-100  bg-slate-50">
                        <BadgeCheck className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Queue is clean. Good job!</p>
                    </div>
                ) : (
                    filteredUpdates.map((update) => (
                        <div key={update.id} className="group bg-white  border border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl hover:shadow-purple-100/30 transition-all duration-500">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="h-14 w-14  bg-[#ede7f6] text-[#5e35b1] flex items-center justify-center font-black text-lg">
                                    {update.user_full_name.charAt(0)}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-black text-slate-900 text-lg leading-tight">{update.user_full_name}</h4>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {update.user_email}</span>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-100 px-1 py-0">{update.user_role}</Badge>
                                    </div>
                                    <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Requested {new Date(update.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden lg:flex flex-col text-right mr-4">
                                    <span className="text-[10px] font-black text-[#5e35b1] uppercase tracking-widest">Modified Fields</span>
                                    <span className="text-sm font-bold text-slate-600">{formatPayloadSummary(update.payload)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => handleInlineApprove(update.id)}
                                        className="h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Approve
                                    </Button>
                                    <Button
                                        onClick={() => handleInlineReject(update.id)}
                                        className="h-10 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4"
                                    >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Reject
                                    </Button>
                                    <Button
                                        onClick={() => { setSelectedUpdate(update); setRejectionReason(""); setIsReviewModalOpen(true); }}
                                        variant="outline"
                                        className="h-10 font-bold px-4 border-slate-200 hover:bg-slate-50"
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Review
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Review Modal */}
            <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogContent className=" border-none shadow-2xl bg-white sm:max-w-xl p-8 max-h-[90vh] overflow-y-auto thin-scrollbar">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Review Profile Update
                            <Badge className="bg-amber-50 text-amber-600 border-none  px-2 font-black text-[10px]">VERIFICATION</Badge>
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium italic">
                            Applying these changes will immediately update the user's public profile and capabilities.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Changes</label>
                            {selectedUpdate && renderPayloadDiff(selectedUpdate.payload)}
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-50">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Rejection Reason</label>
                            <p className="text-[10px] text-slate-400 font-medium mb-1 italic">* Only required if rejecting the update.</p>
                            <Textarea
                                placeholder="Tell the user why this update was rejected (e.g. invalid document, typo, suspicious content)..."
                                className="font-medium resize-none p-4"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50">
                        <Button
                            variant="outline"
                            disabled={processing}
                            className="flex-1 h-14  font-bold border-slate-100 text-slate-400 hover:bg-slate-50"
                            onClick={() => setIsReviewModalOpen(false)}
                        >
                            Defer Decision
                        </Button>
                        <div className="flex flex-1 gap-3">
                            <Button
                                variant="outline"
                                disabled={processing}
                                className="flex-1 h-14  font-bold border-rose-100 text-rose-500 hover:bg-rose-50"
                                onClick={handleReject}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                            </Button>
                            <Button
                                disabled={processing}
                                className="flex-[2] h-14  bg-emerald-500 hover:bg-emerald-600 font-black shadow-xl shadow-emerald-200"
                                onClick={handleApprove}
                            >
                                {processing ? <Loader2 className="animate-spin h-5 w-5" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Apply</>}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
