import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Mail, Phone, Shield, Camera,
    Loader2, Save, ChevronRight, CheckCircle2,
    Trash2, MapPin, Globe, CreditCard,
    Clock, Calendar, X, Plus, AlertCircle
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SOUTH_AFRICAN_AREAS = [
    "Sandton, Johannesburg", "Rosebank, Johannesburg", "Midrand, Johannesburg", "Randburg, Johannesburg",
    "Soweto, Johannesburg", "Pretoria Central", "Centurion, Pretoria", "Hatfield, Pretoria",
    "Cape Town City Bowl", "Sea Point, Cape Town", "Claremont, Cape Town", "Bellville, Cape Town",
    "Umhlanga, Durban", "Durban Central", "Pinetown, Durban", "Gqeberha Central", "Bloemfontein Central"
];


const Profile = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [photoLoading, setPhotoLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isProvider = ['driver', 'professional', 'service-provider'].includes(user?.role || "");
    const isDriver = user?.role === "driver";
    const isProfessional = ["professional", "service-provider"].includes(user?.role || "");
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState<any>({
        full_name: user?.data?.full_name || "",
        surname: user?.data?.surname || "",
        phone: user?.phone || user?.data?.phone || "",
        gender: user?.data?.gender || "",
        next_of_kin: {
            full_name: user?.data?.next_of_kin?.full_name || "",
            contact_number: user?.data?.next_of_kin?.contact_number || "",
            contact_email: user?.data?.next_of_kin?.contact_email || "",
        },
        operating_areas: user?.data?.operating_areas || [],
        availability: user?.data?.availability || {
        is_online: false, // for driver
        schedule: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
    }
}
    });

    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('nok_')) {
            const nokField = name.replace('nok_', '');
            setFormData((prev: any) => ({
                ...prev,
                next_of_kin: {
                    ...prev.next_of_kin,
                    [nokField]: value
                }
            }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPhotoLoading(true);
        const uploadData = new FormData();
        uploadData.append('photo', file);

        try {
            const res = await apiFetch('/api/profile/upload-photo', {
                method: 'POST',
                body: uploadData,
                headers: {}
            });

            if (res.success) {
                toast({
                    title: "Success",
                    description: "Profile photo updated successfully",
                });
                window.location.reload();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to upload photo",
                variant: "destructive"
            });
        } finally {
            setPhotoLoading(false);
        }
    };

    const addArea = (area: string) => {
        if (!formData.operating_areas.includes(area) && formData.operating_areas.length < 5) {
            setFormData((prev: any) => ({
                ...prev,
                operating_areas: [...prev.operating_areas, area]
            }));
        }
    };

    const removeArea = (area: string) => {
        setFormData((prev: any) => ({
            ...prev,
            operating_areas: prev.operating_areas.filter((a: string) => a !== area)
        }));
    };


   

     const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
    setLoading(true);

    try {
        const cleanedData = {
       phone: formData.phone,
       next_of_kin: formData.next_of_kin,
      availability: formData.availability   //ADDED THIS
     };
        const res = await apiFetch('/api/profile', {
            method: 'PATCH',
            data: cleanedData
        });

        if (res.success) {
            setSubmitted(true);
            toast({
                title: "Submitted",
                description: "Your changes are pending admin approval"
            });
        }

    } catch (error: any) {
        toast({
            title: "Update Failed",
            description: error.message || "Something went wrong",
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }

};

const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 ${
                enabled ? "bg-emerald-500" : "bg-slate-300"
            }`}
        >
            <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                    enabled ? "translate-x-7" : "translate-x-1"
                }`}
            />
        </button>
    );
};



    return (
        <main className="min-h-screen bg-slate-50/50 flex flex-col">
            <Navbar />

            <section className="pt-32 pb-12 bg-white border-b border-slate-100">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="flex flex-col md:flex-row items-center gap-10">
                        {/* Profile Image Section */}
                        <div className="relative group">
                            <div className="h-32 w-32 rounded-[2.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
                                {user?.profile_image_url ? (
                                    <img
                                        src={getImageUrl(user.profile_image_url)}
                                        alt={user.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                                        <User size={64} />
                                    </div>
                                )}
                                {photoLoading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 h-10 w-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                disabled={photoLoading}
                            >
                                <Camera size={18} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoUpload}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                                    {user?.role}
                                </span>
                                {user?.is_approved && (
                                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                                        <CheckCircle2 size={10} /> Verified
                                    </span>
                                )}
                            </div>
                            <h1 className="text-4xl font-bold text-[#222222] tracking-tight">{user?.name || "Your Profile"}</h1>
                            <p className="text-slate-500 mt-1 font-medium">{user?.email}</p>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px]">
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tracking Number</p>
                                <p className="font-mono font-bold text-primary tracking-tighter">{user?.tracking_number || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-12 flex-1">
                <div className="container mx-auto px-6 max-w-5xl">

    {submitted && (
    <div className="bg-yellow-100 text-yellow-800 p-4 rounded-xl mb-4">
        Your changes are pending admin approval.
    </div>
)}

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                        {/* Left Column: Info Sections */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Personal Info */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-primary/40" />
                                <h3 className="text-xl font-bold text-[#222222] mb-8 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                        <User size={20} />
                                    </div>
                                    Personal Information
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">First Name</label>
                                        <Input
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleInputChange}
                                            placeholder="John"
                                            disabled
                                            className="bg-slate-100 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Surname</label>
                                        <Input
                                            name="surname"
                                            value={formData.surname}
                                            onChange={handleInputChange}
                                            placeholder="Doe"
                                            disabled
                                            className="bg-slate-100 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                                        <Input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="+27 00 000 0000"
                                            className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                                        <Input
                                            name="Email Address"
                                            value={user?.email}
                                            disabled
                                            className="bg-slate-100 cursor-not-allowed"
                                                                                    />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Gender</label>
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleInputChange}
                                             disabled
                                            className="bg-slate-100 cursor-not-allowed"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>


                            {/* Provider Specific: Operating Areas */}
                            {isProvider && (
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-400" />
                                    <h3 className="text-xl font-bold text-[#222222] mb-2 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <MapPin size={20} />
                                        </div>
                                        Operating Areas
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-8 ml-13">Select up to 5 areas where you provide services.</p>

                                    <div className="space-y-6">
                                        <div className="flex gap-2 flex-wrap mb-4">
                                            {formData.operating_areas.map((area: string) => (
                                                <span
                                                    key={area}
                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold border border-indigo-100 group shadow-sm"
                                                >
                                                    {area}
                                                    <button type="button" onClick={() => removeArea(area)} className="hover:text-rose-500 transition-colors">
                                                        <X size={14} strokeWidth={3} />
                                                    </button>
                                                </span>
                                            ))}
                                            {formData.operating_areas.length === 0 && (
                                                <p className="text-xs text-slate-400 italic">No areas selected yet.</p>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <select
                                                className="w-full h-14 rounded-2xl bg-slate-50/50 border border-slate-100 px-6 font-bold text-slate-600 appearance-none outline-none focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
                                                onChange={(e) => {
                                                    if (e.target.value) addArea(e.target.value);
                                                    e.target.value = "";
                                                }}
                                            >
                                                <option value="">+ Add an area...</option>
                                                {SOUTH_AFRICAN_AREAS.filter(a => !formData.operating_areas.includes(a)).map(area => (
                                                    <option key={area} value={area}>{area}</option>
                                                ))}
                                            </select>
                                            <Plus className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Provider Availability (Simplified) */}
{isDriver && (
    <div className="bg-white rounded-[2.5rem] border p-8 shadow-sm">
        <h3 className="text-xl font-bold mb-6">Driver Status</h3>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border">
            <span className="font-semibold">
                {formData.availability.is_online ? "Online" : "Offline"}
            </span>

            <ToggleSwitch
                enabled={formData.availability.is_online}
                onToggle={() =>
                    setFormData((prev: any) => ({
                        ...prev,
                        availability: {
                            ...prev.availability,
                            is_online: !prev.availability.is_online
                        }
                    }))
                }
            />
        </div>
    </div>
)}

{isProfessional && (
    <div className="bg-white rounded-[2.5rem] border p-8 shadow-sm">
        <h3 className="text-xl font-bold mb-6">Weekly Availability</h3>

        <div className="space-y-3">
            {Object.entries(formData.availability.schedule).map(([day, value]) => (
                <div
                    key={day}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border"
                >
                    <span className="capitalize font-semibold">
                        {day} (09:00 - 17:00)
                    </span>

                    <ToggleSwitch
                        enabled={value as boolean}
                        onToggle={() =>
                            setFormData((prev: any) => ({
                                ...prev,
                                availability: {
                                    ...prev.availability,
                                    schedule: {
                                        ...prev.availability.schedule,
                                        [day]: !value
                                    }
                                }
                            }))
                        }
                    />
                </div>
            ))}
        </div>
    </div>
)}
                            {/* Next of Kin */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-amber-400" />
                                <h3 className="text-xl font-bold text-[#222222] mb-8 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                        <Shield size={20} />
                                    </div>
                                    Next of Kin
                                </h3>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                                        <Input
                                            name="nok_full_name"
                                            value={formData.next_of_kin.full_name}
                                            onChange={handleInputChange}
                                            placeholder="Emergency Contact Name"
                                            className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all font-semibold"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Contact Number</label>
                                            <Input
                                                name="nok_contact_number"
                                                value={formData.next_of_kin.contact_number}
                                                onChange={handleInputChange}
                                                placeholder="+27 00 000 0000"
                                                className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                                            <Input
                                                name="nok_contact_email"
                                                value={formData.next_of_kin.contact_email}
                                                onChange={handleInputChange}
                                                placeholder="nok@example.com"
                                                className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all font-semibold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Status & Actions */}
                        <div className="space-y-8">
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                                <h3 className="text-lg font-bold text-[#222222] mb-6">Account Status</h3>

                                <div className="space-y-5">
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-600">Email Verified</span>
                                        </div>
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center",
                                                user?.is_approved ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                                            )}>
                                                {user?.is_approved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                            </div>
                                            <span className="text-sm font-semibold text-slate-600">Account Approval</span>
                                        </div>
                                        <span className={cn(
                                            "h-2 w-2 rounded-full",
                                            user?.is_approved ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                        )} />
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center",
                                                user?.is_paid ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                                            )}>
                                                {user?.is_paid ? <CheckCircle2 size={16} /> : <CreditCard size={16} />}
                                            </div>
                                            <span className="text-sm font-semibold text-slate-600">Registration Paid</span>
                                        </div>
                                        <span className={cn(
                                            "h-2 w-2 rounded-full",
                                            user?.is_paid ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                        )} />
                                    </div>
                                </div>

                                <div className="mt-10 space-y-4">
                                   <Button type="submit" disabled={submitted || loading}>
                                         {submitted ? "Pending Approval" : "Save Changes"}
                                    </Button>

                                    {user?.role !== 'client' && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] text-center text-slate-500 font-bold uppercase leading-relaxed">
                                                Certain profile changes for professionals require admin review before being applied.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Verification Info */}
                            {!user?.is_approved && user?.role !== 'client' && (
                                <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-8 shadow-inner">
                                    <h4 className="font-bold text-amber-700 flex items-center gap-2 mb-3">
                                        <Shield size={18} /> Verification Pending
                                    </h4>
                                    <p className="text-sm text-amber-600 leading-relaxed font-medium">
                                        Our team is currently reviewing your documents. You can still update your details, but changes will be queued for approval.
                                    </p>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </section>

            <Footer />
        </main>
    );
};

export default Profile;
