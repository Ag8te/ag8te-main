import { useState, useEffect, useCallback } from "react";
import {
    Loader2,
    MoreVertical,
    ShieldCheck,
    Ban,
    Edit,
    Trash2,
    User as UserIcon,
    Globe,
    Phone,
    Shield,
    Activity,
    UserCircle,
    CheckCircle2,
    Info,
    Mail,
    Plus,
    X as CloseIcon,
    Settings,
    Download,
    ExternalLink,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, getImageUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    role: string;
    is_approved: boolean;
    is_active: boolean;
    id_verification_status: string | null;
    created_at: string;
    phone?: string | null;
    gender?: string | null;
    is_sa_citizen?: boolean;
    sa_id_number?: string | null;
    next_of_kin_name?: string | null;
    next_of_kin_phone?: string | null;
    next_of_kin_email?: string | null;
    highest_qualification?: string | null;
    professional_body?: string | null;
    is_paid?: boolean;
    email_verified?: boolean;
    profile_image_url?: string | null;
    id_document_url?: string | null;
    proof_of_residence_url?: string | null;
    driver_license_url?: string | null;
    cv_resume_url?: string | null;
    qualification_urls?: string[];
    professional_services?: string[];
    provider_services?: string[];
    driver_services?: Array<string | Record<string, any>>;
    profile_data?: Record<string, any> | null;
    registration_documents?: {
        profile_image_url?: string | null;
        id_document_url?: string | null;
        proof_of_residence_url?: string | null;
        driver_license_url?: string | null;
        cv_resume_url?: string | null;
        qualification_urls?: string[];
    };
}

interface UsersResponse {
    users: User[];
    total: number;
    limit: number;
    offset: number;
}

export const UsersManagement = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters and pagination
    const [roleFilter, setRoleFilter] = useState("");
    const [approvalFilter, setApprovalFilter] = useState("");
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const limit = 10;

    // Modal states
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editFormData, setEditFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        role: "user",
        email: "",
        password: "",
        phone: "",
        gender: "",
        is_sa_citizen: false,
        sa_id_number: "",
        next_of_kin_name: "",
        next_of_kin_phone: "",
        next_of_kin_email: "",
        highest_qualification: "",
        professional_body: "",
        is_paid: false,
        is_approved: true,
        is_active: true,
        email_verified: true
    });

    const [professionalServices, setProfessionalServices] = useState<string[]>([]);
    const [providerServices, setProviderServices] = useState<string[]>([]);
    const [driverVehicles, setDriverVehicles] = useState<string[]>([]);

    const buildDocumentEntries = (user: User | null) => {
        if (!user) return [];

        const docs = user.registration_documents || {};
        const qualificationUrls = (docs.qualification_urls || user.qualification_urls || []).filter(Boolean);
        const entries = [
            { label: "Profile Photo", url: docs.profile_image_url || user.profile_image_url || "" },
            { label: "ID Document", url: docs.id_document_url || user.id_document_url || "" },
            { label: "Proof of Residence", url: docs.proof_of_residence_url || user.proof_of_residence_url || "" },
            { label: "Driver's License", url: docs.driver_license_url || user.driver_license_url || "" },
            { label: "CV / Resume", url: docs.cv_resume_url || user.cv_resume_url || "" },
        ].filter((doc) => Boolean(doc.url));

        qualificationUrls.forEach((url, index) => {
            entries.push({
                label: `Qualification Document ${index + 1}`,
                url,
            });
        });

        return entries;
    };

    const mapDriverVehicles = (driverServices?: Array<string | Record<string, any>>) => {
        if (!Array.isArray(driverServices)) return [];
        return driverServices.map((item) => {
            if (typeof item === "string") return item;
            const carMake = item?.car_make || item?.make || "";
            const carModel = item?.car_model || item?.model || "";
            const plate = item?.registration || item?.license_plate || item?.plate || "";
            return [carMake, carModel, plate].filter(Boolean).join(" ").trim() || "Registered vehicle";
        });
    };

    const normalizeUserDetail = (user: any): User => {
        const profile = user?.profile_data || user?.data || {};
        const nextOfKin = profile?.next_of_kin || {};
        return {
            ...user,
            phone: user?.phone ?? profile?.phone ?? "",
            gender: user?.gender ?? profile?.gender ?? "",
            is_sa_citizen: user?.is_sa_citizen ?? profile?.sa_citizen ?? false,
            sa_id_number: user?.sa_id_number ?? profile?.sa_id ?? "",
            next_of_kin_name: user?.next_of_kin_name ?? nextOfKin?.full_name ?? "",
            next_of_kin_phone: user?.next_of_kin_phone ?? nextOfKin?.contact_number ?? "",
            next_of_kin_email: user?.next_of_kin_email ?? nextOfKin?.contact_email ?? "",
            highest_qualification: user?.highest_qualification ?? profile?.highest_qualification ?? "",
            professional_body: user?.professional_body ?? profile?.professional_body ?? "",
            professional_services: user?.professional_services ?? profile?.professional_services ?? [],
            provider_services: user?.provider_services ?? profile?.provider_services ?? [],
            driver_services: user?.driver_services ?? profile?.driver_services ?? [],
            qualification_urls: user?.qualification_urls ?? profile?.qualification_urls ?? [],
            registration_documents: user?.registration_documents ?? {
                profile_image_url: user?.profile_image_url ?? null,
                id_document_url: user?.id_document_url ?? null,
                proof_of_residence_url: user?.proof_of_residence_url ?? null,
                driver_license_url: user?.driver_license_url ?? null,
                cv_resume_url: user?.cv_resume_url ?? null,
                qualification_urls: user?.qualification_urls ?? profile?.qualification_urls ?? [],
            },
        };
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const offset = (page - 1) * limit;

            let url = `/api/admin/users?limit=${limit}&offset=${offset}`;
            if (roleFilter) url += `&role=${roleFilter}`;
            if (approvalFilter) url += `&approved=${approvalFilter}`;

            const res = await apiFetch(url, { headers: adminHeaders });
            if (res?.success) {
                setUsers(res.data.users);
                setTotalUsers(res.data.total);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load users.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [roleFilter, approvalFilter, page, toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleApprove = async (userId: string) => {
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/users/${userId}/approve`, {
                method: "PATCH",
                headers: adminHeaders
            });
            if (res?.success) {
                toast({ title: "Success", description: "User approved successfully." });
                fetchUsers(); // Refresh list
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to approve user.",
                variant: "destructive"
            });
        }
    };

    const handleImpersonate = async (userId: string) => {
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/users/${userId}/impersonate`, {
                method: "POST",
                headers: adminHeaders
            });
            if (res?.success) {
                // Store impersonated token
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("user", JSON.stringify(res.data.user));
                toast({ title: "Impersonation Active", description: `You are now logged in as ${res.data.user.email}` });
                // Redirect to home
                window.location.href = "/";
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to impersonate user.",
                variant: "destructive"
            });
        }
    };

    const handleSuspend = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setSelectedUser(user);
            setIsSuspendDialogOpen(true);
        }
    };

    const handleReinstate = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setIsSubmitting(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/users/${user.id}/unsuspend`, {
                method: "PATCH",
                headers: adminHeaders
            });
            if (res?.success) {
                toast({ title: "Success", description: "User reinstated successfully." });
                setSelectedUser(null);
                fetchUsers();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to reinstate user.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSuspend = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/users/${selectedUser.id}/suspend`, {
                method: "PATCH",
                headers: adminHeaders
            });
            if (res?.success) {
                toast({ title: "Success", description: "User suspended successfully." });
                setIsSuspendDialogOpen(false);
                setSelectedUser(null);
                fetchUsers(); // Refresh list
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to suspend user.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setSelectedUser(user);
            setIsDeleteDialogOpen(true);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/users/${selectedUser.id}`, {
                method: "DELETE",
                headers: adminHeaders
            });
            if (res?.success) {
                toast({ title: "Success", description: "User deleted successfully." });
                setIsDeleteDialogOpen(false);
                setSelectedUser(null);
                setUsers((current) => current.filter((user) => user.id !== selectedUser.id));
                fetchUsers(); // Refresh list
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete user.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (user: User) => {
        setIsSubmitting(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const res = await apiFetch(`/api/admin/users/${user.id}`, { headers: adminHeaders });
            const detailedUser = normalizeUserDetail(res?.data || user);

            setSelectedUser(detailedUser);
            setEditFormData({
                first_name: detailedUser.first_name || "",
                last_name: detailedUser.last_name || "",
                username: detailedUser.username || "",
                role: detailedUser.role,
                email: detailedUser.email || "",
                password: "",
                phone: detailedUser.phone || "",
                gender: detailedUser.gender || "",
                is_sa_citizen: detailedUser.is_sa_citizen || false,
                sa_id_number: detailedUser.sa_id_number || "",
                next_of_kin_name: detailedUser.next_of_kin_name || "",
                next_of_kin_phone: detailedUser.next_of_kin_phone || "",
                next_of_kin_email: detailedUser.next_of_kin_email || "",
                highest_qualification: detailedUser.highest_qualification || "",
                professional_body: detailedUser.professional_body || "",
                is_paid: detailedUser.is_paid || false,
                is_approved: detailedUser.is_approved,
                is_active: detailedUser.is_active,
                email_verified: detailedUser.email_verified || false
            });

            setProfessionalServices(
                Array.isArray(detailedUser.professional_services) ? detailedUser.professional_services : []
            );
            setProviderServices(
                Array.isArray(detailedUser.provider_services) ? detailedUser.provider_services : []
            );
            setDriverVehicles(mapDriverVehicles(detailedUser.driver_services));

            setIsEditModalOpen(true);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to load user details.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenAddModal = () => {
        setSelectedUser(null);
        setEditFormData({
            first_name: "",
            last_name: "",
            username: "",
            role: "user",
            email: "",
            password: "",
            phone: "",
            gender: "",
            is_sa_citizen: false,
            sa_id_number: "",
            next_of_kin_name: "",
            next_of_kin_phone: "",
            next_of_kin_email: "",
            highest_qualification: "",
            professional_body: "",
            is_paid: false,
            is_approved: true,
            is_active: true,
            email_verified: true
        });
        setProfessionalServices([]);
        setProviderServices([]);
        setDriverVehicles([]);
        setIsEditModalOpen(true); // Reusing the same modal for simplicity
    };

    const addProfessionalService = () => setProfessionalServices([...professionalServices, ""]);
    const updateProfessionalService = (index: number, val: string) => {
        const updated = [...professionalServices];
        updated[index] = val;
        setProfessionalServices(updated);
    };
    const removeProfessionalService = (index: number) => setProfessionalServices(professionalServices.filter((_, i) => i !== index));

    const addProviderService = () => setProviderServices([...providerServices, ""]);
    const updateProviderService = (index: number, val: string) => {
        const updated = [...providerServices];
        updated[index] = val;
        setProviderServices(updated);
    };
    const removeProviderService = (index: number) => setProviderServices(providerServices.filter((_, i) => i !== index));

    const addDriverVehicle = () => setDriverVehicles([...driverVehicles, ""]);
    const updateDriverVehicle = (index: number, val: string) => {
        const updated = [...driverVehicles];
        updated[index] = val;
        setDriverVehicles(updated);
    };
    const removeDriverVehicle = (index: number) => setDriverVehicles(driverVehicles.filter((_, i) => i !== index));

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for new user
        if (!selectedUser && (!editFormData.email || !editFormData.password)) {
            toast({ title: "Validation Error", description: "Email and Password are required for new users.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
            const payload: any = {
                ...editFormData,
                professional_services: professionalServices.filter(s => s.trim() !== ""),
                provider_services: providerServices.filter(s => s.trim() !== ""),
                driver_vehicles: driverVehicles.filter(s => s.trim() !== "")
            };

            // Do not send blank password if editing
            if (selectedUser && !payload.password) {
                delete payload.password;
            }

            const url = selectedUser ? `/api/admin/users/${selectedUser.id}` : `/api/admin/users`;
            const method = selectedUser ? "PATCH" : "POST";

            const res = await apiFetch(url, {
                method: method,
                headers: adminHeaders,
                body: JSON.stringify(payload)
            });
            if (res?.success) {
                toast({ title: "Success", description: `User ${selectedUser ? 'updated' : 'created'} successfully.` });
                setIsEditModalOpen(false);
                fetchUsers();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || `Failed to ${selectedUser ? 'update' : 'create'} user.`,
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalPages = Math.ceil(totalUsers / limit);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">User Management</h3>
                    <p className="text-sm text-slate-500">Manage all registered users on the platform.</p>
                </div>
                <Button
                    onClick={handleOpenAddModal}
                    className="h-10  bg-[#5e35b1] hover:bg-[#4527a0] text-white shadow-lg shadow-purple-200"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                </Button>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-6  shadow-sm border border-gray-100 mb-8 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Role</label>
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                            className="w-full h-11 px-4 bg-[#f8fafc] border border-gray-200  focus:ring-2 focus:ring-[#5e35b1] focus:border-transparent transition-all outline-none text-sm font-medium text-[#121926]"
                        >
                            <option value="">All Roles</option>
                            <option value="client">Client</option>
                            <option value="driver">Driver</option>
                            <option value="professional">Professional</option>
                            <option value="service-provider">Service Provider</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Approval Status</label>
                        <select
                            value={approvalFilter}
                            onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }}
                            className="w-full h-11 px-4 bg-[#f8fafc] border border-gray-200  focus:ring-2 focus:ring-[#5e35b1] focus:border-transparent transition-all outline-none text-sm font-medium text-[#121926]"
                        >
                            <option value="">All</option>
                            <option value="true">Approved</option>
                            <option value="false">Pending</option>
                        </select>
                    </div>
                    <div>
                        <button
                            onClick={() => fetchUsers()}
                            className="bg-[#5e35b1] hover:bg-[#4527a0] text-white px-4 py-2  transition shadow-sm font-medium w-full h-11"
                        >
                            Apply Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className=" border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead>
                            <tr className="bg-[#f8fafc]">
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#697586] uppercase tracking-wider">Email/Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#697586] uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#697586] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#697586] uppercase tracking-wider">Verification</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-[#697586] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[#697586]">
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="animate-spin h-8 w-8 text-[#5e35b1] mb-3" />
                                            <span>Loading users...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[#697586]">
                                        No users found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-[#f8fafc] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-[#ede7f6]  flex items-center justify-center text-[#5e35b1] font-bold">
                                                    {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-[#121926]">
                                                        {user.first_name ? `${user.first_name} ${user.last_name || ""}` : (user.username || "Unknown")}
                                                    </div>
                                                    <div className="text-xs text-[#697586]">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold  bg-[#e3f2fd] text-[#1e88e5] capitalize tracking-wide">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.is_active ? (
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 ">
                                                    Active {user.is_approved ? "| Approved" : "| Pending"}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 ">
                                                    Suspended
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#697586]">
                                            {user.id_verification_status ? (
                                                <span className={`text-xs font-bold px-2 py-1  ${user.id_verification_status === 'verified'
                                                    ? 'text-green-600 bg-green-50'
                                                    : user.id_verification_status === 'rejected'
                                                        ? 'text-red-600 bg-red-50'
                                                        : 'text-orange-600 bg-orange-50'
                                                    }`}>
                                                    {user.id_verification_status.toUpperCase()}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">Not Uploaded</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {!user.is_approved && (
                                                    <button
                                                        onClick={() => handleApprove(user.id)}
                                                        className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-1.5  transition-colors"
                                                        title="Approve User"
                                                    >
                                                        <ShieldCheck className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleImpersonate(user.id)}
                                                    className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 p-1.5 transition-colors"
                                                    title="Impersonate User"
                                                >
                                                    <UserCircle className="h-4 w-4" />
                                                </button>
                                                {user.is_active ? (
                                                    <button
                                                        onClick={() => handleSuspend(user.id)}
                                                        className="text-orange-600 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 p-1.5  transition-colors"
                                                        title="Suspend User"
                                                        disabled={isSubmitting}
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReinstate(user.id)}
                                                        className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-1.5 transition-colors disabled:opacity-50"
                                                        title="Reinstate User"
                                                        disabled={isSubmitting}
                                                    >
                                                        <Activity className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-1.5  transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-1.5  transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
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
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-[#f8fafc]">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border border-gray-200  text-sm font-bold text-[#697586] hover:bg-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-bold text-[#697586] uppercase tracking-widest">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 border border-gray-200  text-sm font-bold text-[#697586] hover:bg-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[92vh] p-0 overflow-hidden flex flex-col border border-slate-200 shadow-xl bg-white ">
                    <DialogHeader className="px-8 py-6 border-b bg-slate-50 relative shrink-0">
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-xl font-bold text-slate-800">
                                Edit User Profile
                            </DialogTitle>
                            <DialogDescription className="text-xs font-medium text-slate-500 flex items-center gap-2">
                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 text-purple-700  border border-purple-100">
                                    <Settings className="w-3 h-3" />
                                    Account Management
                                </span>
                                • User ID: {selectedUser?.id}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 px-8 py-8">
                        <form id="editUserForm" onSubmit={handleSubmitEdit} className="space-y-10 pb-10">
                            {/* Core Identity Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <h4 className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Core Identity</h4>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 bg-white p-6  border border-slate-200 shadow-sm">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">First Name</Label>
                                        <Input
                                            id="first_name"
                                            value={editFormData.first_name || ""}
                                            onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                            className="font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Last Name</Label>
                                        <Input
                                            id="last_name"
                                            value={editFormData.last_name || ""}
                                            onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                            className="font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={editFormData.email || ""}
                                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                            className="font-bold"
                                            required={!selectedUser}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                            Password {selectedUser ? "(Leave blank to keep current)" : <span className="text-red-500">*</span>}
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={editFormData.password || ""}
                                            onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                            className="font-bold"
                                            required={!selectedUser}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="username" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</Label>
                                        <Input
                                            id="username"
                                            value={editFormData.username || ""}
                                            onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                            className="font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={editFormData.phone || ""}
                                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                            className="font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account Role</Label>
                                        <select
                                            id="role"
                                            value={editFormData.role}
                                            onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                            className="flex h-11 w-full  border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#5e35b1] focus:ring-[#5e35b1]/10 shadow-sm outline-none"
                                        >
                                            <option value="user">Standard User</option>
                                            <option value="professional">Professional</option>
                                            <option value="service-provider">Service Provider</option>
                                            <option value="driver">Driver</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gender</Label>
                                        <select
                                            id="gender"
                                            value={editFormData.gender}
                                            onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                                            className="flex h-11 w-full  border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#5e35b1] focus:ring-[#5e35b1]/10 shadow-sm outline-none"
                                        >
                                            <option value="">Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                            <option value="prefer_not_to_say">Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* Nationality & Identity Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <h4 className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Nationality & Identity</h4>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>
                                <div className="bg-white p-6  border border-slate-200 shadow-sm space-y-6">
                                    <div className="flex flex-col md:flex-row gap-6 items-center border-b border-slate-100 pb-6">
                                        <div className="flex items-center space-x-3 px-4 py-3 bg-white  border border-slate-200 shadow-sm hover:border-[#5e35b1]/50 transition-all cursor-pointer group">
                                            <Checkbox
                                                id="is_sa_citizen"
                                                checked={editFormData.is_sa_citizen}
                                                onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_sa_citizen: !!checked })}
                                                className="w-5 h-5 border-slate-300 data-[state=checked]:bg-[#5e35b1] data-[state=checked]:border-[#5e35b1]"
                                            />
                                            <Label htmlFor="is_sa_citizen" className="text-sm font-bold text-slate-700 cursor-pointer">
                                                South African Citizen
                                            </Label>
                                        </div>
                                        {editFormData.is_sa_citizen && (
                                            <div className="flex-1 space-y-2 w-full animate-in fade-in slide-in-from-left-2 duration-300">
                                                <Label htmlFor="sa_id_number" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">SA Identity Number</Label>
                                                <Input
                                                    id="sa_id_number"
                                                    value={editFormData.sa_id_number}
                                                    onChange={(e) => setEditFormData({ ...editFormData, sa_id_number: e.target.value })}
                                                    placeholder="e.g. 9001015000081"
                                                    className="font-mono tracking-wider font-bold"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-slate-500">
                                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        <p className="text-xs font-medium">
                                            Verification status: <span className="text-emerald-600 font-bold uppercase">{selectedUser?.id_verification_status || 'Pending'}</span>
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Emergency Contact Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <h4 className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Emergency Contact</h4>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6  border border-slate-200 shadow-sm">
                                    <div className="space-y-2">
                                        <Label htmlFor="nok_name" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</Label>
                                        <Input
                                            id="nok_name"
                                            value={editFormData.next_of_kin_name}
                                            onChange={(e) => setEditFormData({ ...editFormData, next_of_kin_name: e.target.value })}
                                            className="font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nok_phone" className="text-xs font-bold text-slate-600">Contact Number</Label>
                                        <Input
                                            id="nok_phone"
                                            value={editFormData.next_of_kin_phone}
                                            onChange={(e) => setEditFormData({ ...editFormData, next_of_kin_phone: e.target.value })}
                                            className="h-11 px-4  border-slate-200 focus:border-[#5e35b1] focus:ring-[#5e35b1]/10 bg-white shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nok_email" className="text-xs font-bold text-slate-600">Contact Email</Label>
                                        <Input
                                            id="nok_email"
                                            type="email"
                                            value={editFormData.next_of_kin_email}
                                            onChange={(e) => setEditFormData({ ...editFormData, next_of_kin_email: e.target.value })}
                                            className="h-11 px-4  border-slate-200 focus:border-[#5e35b1] focus:ring-[#5e35b1]/10 bg-white shadow-sm"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Registration Documents Section */}
                            {selectedUser && (
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <h4 className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Registration Documents</h4>
                                        <div className="h-px flex-1 bg-slate-100" />
                                    </div>
                                    <div className="bg-white p-6 border border-slate-200 shadow-sm space-y-4">
                                        {buildDocumentEntries(selectedUser).length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {buildDocumentEntries(selectedUser).map((doc) => (
                                                    <div
                                                        key={`${doc.label}-${doc.url}`}
                                                        className="border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 text-slate-800 font-semibold">
                                                                <FileText className="w-4 h-4 text-[#5e35b1]" />
                                                                <span className="truncate">{doc.label}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 truncate mt-1">{doc.url}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <a
                                                                href={getImageUrl(doc.url)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-[#5e35b1] bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors"
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                Open
                                                            </a>
                                                            <a
                                                                href={getImageUrl(doc.url)}
                                                                download
                                                                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500">
                                                No registration documents have been uploaded for this user yet.
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Role Specific Sections */}
                            <div className="space-y-8">
                                {editFormData.role === 'professional' && (
                                    <section className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 px-1">
                                            <h4 className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Academic & Professional</h4>
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </div>
                                        <div className="space-y-6 bg-white p-6  border border-slate-200 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="qualification" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Highest Qualification</Label>
                                                    <Input
                                                        id="qualification"
                                                        value={editFormData.highest_qualification}
                                                        onChange={(e) => setEditFormData({ ...editFormData, highest_qualification: e.target.value })}
                                                        className="font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="pro_body" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Professional Body</Label>
                                                    <Input
                                                        id="pro_body"
                                                        value={editFormData.professional_body}
                                                        onChange={(e) => setEditFormData({ ...editFormData, professional_body: e.target.value })}
                                                        className="font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center px-1">
                                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Services Offered</Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={addProfessionalService}
                                                        className="h-8 text-[#5e35b1] hover:text-[#4527a0] hover:bg-purple-50 font-bold  text-xs"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                                        Add Service
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {professionalServices.map((s, i) => (
                                                        <div key={i} className="flex gap-2">
                                                            <Input
                                                                value={s}
                                                                onChange={(e) => updateProfessionalService(i, e.target.value)}
                                                                placeholder="e.g. Legal Consulting"
                                                                className="font-bold flex-1"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => removeProfessionalService(i)}
                                                                className="h-11 w-11  border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50"
                                                            >
                                                                <CloseIcon className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {editFormData.role === 'service-provider' && (
                                    <section className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 px-1">
                                            <h4 className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Business Offerings</h4>
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </div>
                                        <div className="space-y-6 bg-white p-6  border border-slate-200 shadow-sm">
                                            <div className="flex justify-between items-center px-1">
                                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provider Services</Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={addProviderService}
                                                    className="h-8 text-[#5e35b1] hover:text-[#4527a0] hover:bg-purple-50 font-bold  text-xs"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Add New
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {providerServices.map((s, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <Input
                                                            value={s}
                                                            onChange={(e) => updateProviderService(i, e.target.value)}
                                                            className="font-bold flex-1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => removeProviderService(i)}
                                                            className="h-11 w-11  border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50"
                                                        >
                                                            <CloseIcon className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {editFormData.role === 'driver' && (
                                    <section className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 px-1">
                                            <h4 className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">Fleet Details</h4>
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </div>
                                        <div className="space-y-6 bg-white p-6  border border-slate-200 shadow-sm">
                                            <div className="flex justify-between items-center px-1">
                                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicles</Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={addDriverVehicle}
                                                    className="h-8 text-[#5e35b1] hover:text-[#4527a0] hover:bg-purple-50 font-bold  text-xs"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Register
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {driverVehicles.map((s, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <Input
                                                            value={s}
                                                            onChange={(e) => updateDriverVehicle(i, e.target.value)}
                                                            placeholder="Registration Number"
                                                            className="font-bold flex-1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => removeDriverVehicle(i)}
                                                            className="h-11 w-11  border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50"
                                                        >
                                                            <CloseIcon className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* System Access Control card */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <h4 className="text-[11px] font-extrabold text-[#5e35b1] uppercase tracking-wider">System Access Control</h4>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>
                                <div className="p-6 bg-white border border-slate-200 shadow-sm ">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-3 p-3 bg-white  border border-slate-100 shadow-sm">
                                            <Checkbox
                                                id="is_paid"
                                                className="w-5 h-5 border-slate-300 data-[state=checked]:bg-[#5e35b1] data-[state=checked]:border-[#5e35b1]"
                                                checked={editFormData.is_paid}
                                                onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_paid: !!checked })}
                                            />
                                            <div className="space-y-0.5">
                                                <Label htmlFor="is_paid" className="text-xs font-bold text-slate-700 cursor-pointer">Membership Paid</Label>
                                                <p className="text-[9px] text-slate-500 font-medium">Verified platform fee</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-white  border border-slate-100 shadow-sm">
                                            <Checkbox
                                                id="is_approved_status"
                                                className="w-5 h-5 border-slate-300 data-[state=checked]:bg-[#5e35b1] data-[state=checked]:border-[#5e35b1]"
                                                checked={editFormData.is_approved}
                                                onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_approved: !!checked })}
                                            />
                                            <div className="space-y-0.5">
                                                <Label htmlFor="is_approved_status" className="text-xs font-bold text-slate-700 cursor-pointer">Account Approved</Label>
                                                <p className="text-[9px] text-slate-500 font-medium">Administrative approval</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-white  border border-slate-100 shadow-sm">
                                            <Checkbox
                                                id="is_active_status"
                                                className="w-5 h-5 border-slate-300 data-[state=checked]:bg-[#5e35b1] data-[state=checked]:border-[#5e35b1]"
                                                checked={editFormData.is_active}
                                                onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_active: !!checked })}
                                            />
                                            <div className="space-y-0.5">
                                                <Label htmlFor="is_active_status" className="text-xs font-bold text-slate-700 cursor-pointer">Active State</Label>
                                                <p className="text-[9px] text-slate-500 font-medium">Global visibility</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-white  border border-slate-100 shadow-sm">
                                            <Checkbox
                                                id="email_verified"
                                                className="w-5 h-5 border-slate-300 data-[state=checked]:bg-[#5e35b1] data-[state=checked]:border-[#5e35b1]"
                                                checked={editFormData.email_verified}
                                                onCheckedChange={(checked) => setEditFormData({ ...editFormData, email_verified: !!checked })}
                                            />
                                            <div className="space-y-0.5">
                                                <Label htmlFor="email_verified" className="text-xs font-bold text-slate-700 cursor-pointer">Email Verified</Label>
                                                <p className="text-[9px] text-slate-500 font-medium">Confirmed user identity</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </form>
                    </ScrollArea>

                    <DialogFooter className="px-8 py-4 border-t bg-slate-50 flex gap-3 shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 h-11  text-slate-500 font-bold hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="editUserForm"
                            disabled={isSubmitting}
                            className="flex-1 h-11  bg-[#5e35b1] hover:bg-[#4527a0] text-white font-bold shadow-md transition-all active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Suspend Confirmation Dialog */}
            <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Suspend User?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to suspend <strong>{selectedUser?.email}</strong>?
                            This will prevent them from accessing the platform.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmSuspend();
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                            Yes, Suspend
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">Permanently Delete User?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action <strong>cannot be undone</strong>. Are you sure you want to
                            permanently delete <strong>{selectedUser?.email}</strong> and all their data?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmDelete();
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                            Delete Forever
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
