import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Plus, Upload, MapPin, Tag, Info,
    ArrowLeft, ChevronRight, CheckCircle2,
    Camera, Image as ImageIcon, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PostAd = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        category_id: "",
        title: "",
        description: "",
        price: "",
        city: "",
        province: "",
        condition: "Used",
        images: [] as string[],
        contact_name: "",
        contact_phone: "",
        contact_email: ""
    });

    const { data: categoriesRes } = useQuery({
        queryKey: ["ads-categories"],
        queryFn: () => apiFetch("/api/ads/categories"),
    });

    const categories = categoriesRes?.data?.categories || [];

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // In a real app, we'd upload to S3/Cloudinary or our backend
        // For now, let's simulate with a temporary data URL or just use placeholder
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, reader.result as string].slice(0, 5)
            }));
        };
        reader.readAsDataURL(file);
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await apiFetch("/api/ads/ads", {
                method: "POST",
                body: JSON.stringify({
                    ...formData,
                    price: formData.price ? parseFloat(formData.price) : null
                })
            });

            if (res.success) {
                toast({
                    title: "Success",
                    description: "Your ad has been posted and is now live!"
                });
                navigate(`/ads/ad/${res.data.id}`);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: typeof res.error === 'string' ? res.error : (res.error?.message || "Failed to post ad")
                });
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Something went wrong"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-grow pt-24 pb-20">
                <div className="container mx-auto px-6 max-w-3xl">
                    <Button
                        variant="ghost"
                        className="mb-8 text-slate-500 hover:text-primary pl-0 gap-2"
                        onClick={() => navigate('/ads')}
                    >
                        <ArrowLeft size={18} /> Cancel
                    </Button>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200 border border-slate-100"
                    >
                        <div className="mb-10 text-center">
                            <h1 className="text-3xl font-black text-[#1e293b] mb-2 tracking-tight">List an <span className="text-primary italic">Item</span></h1>
                            <p className="text-slate-500">Reach thousands of buyers in your local area.</p>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex items-center justify-center gap-4 mb-12">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                                        {step > s ? <CheckCircle2 size={20} /> : s}
                                    </div>
                                    {s < 3 && <div className={`h-1 w-12 rounded-full ${step > s ? "bg-primary" : "bg-slate-100"}`} />}
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Step 1: Category & Photos */}
                            {step === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold ml-1">Category</Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {categories.map((cat: any) => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, category_id: cat.id })}
                                                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${formData.category_id === cat.id ? "bg-primary/5 border-primary text-primary shadow-lg shadow-primary/5" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"}`}
                                                >
                                                    <span className="text-xs font-bold leading-tight">{cat.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-sm font-bold ml-1">Photos (Up to 5)</Label>
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                                            {formData.images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 group">
                                                    <img src={img} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removeImage(idx)}
                                                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            {formData.images.length < 5 && (
                                                <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 cursor-pointer hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
                                                    <Camera size={24} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Add Photo</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        className="w-full h-14 rounded-2xl font-bold text-lg"
                                        disabled={!formData.category_id}
                                        onClick={() => setStep(2)}
                                    >
                                        Next Step <ChevronRight size={18} />
                                    </Button>
                                </motion.div>
                            )}

                            {/* Step 2: Details & Price */}
                            {step === 2 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold ml-1">Title</Label>
                                        <Input
                                            placeholder="e.g. 2020 MacBook Pro 13-inch"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="h-12 rounded-xl border-slate-200 focus:ring-primary h-14"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold ml-1">Price (ZAR)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Leave empty for POA"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="h-12 rounded-xl border-slate-200 focus:ring-primary h-14"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold ml-1">Description</Label>
                                        <Textarea
                                            placeholder="Describe what you're selling. Mention condition, features, etc."
                                            rows={6}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="rounded-2xl border-slate-200 focus:ring-primary resize-none"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button variant="outline" type="button" className="h-14 rounded-2xl font-bold" onClick={() => setStep(1)}>Back</Button>
                                        <Button
                                            type="button"
                                            className="h-14 rounded-2xl font-bold text-lg"
                                            disabled={!formData.title || !formData.description}
                                            onClick={() => setStep(3)}
                                        >
                                            Next Step <ChevronRight size={18} />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Location & Contact */}
                            {step === 3 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold ml-1">City</Label>
                                            <Input
                                                placeholder="e.g. Pretoria"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="rounded-xl h-14"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold ml-1">Province</Label>
                                            <Input
                                                placeholder="e.g. Gauteng"
                                                value={formData.province}
                                                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                                className="rounded-xl h-14"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
                                            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                                                <Info size={20} />
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Buyers will see your contact details to reach out. By posting, you agree to our ads Terms.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold ml-1">Contact Name</Label>
                                            <Input
                                                placeholder="e.g. Sipho"
                                                value={formData.contact_name}
                                                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                                className="rounded-xl h-14"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold ml-1">Contact Phone</Label>
                                            <Input
                                                placeholder="e.g. 012 345 6789"
                                                value={formData.contact_phone}
                                                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                                className="rounded-xl h-14"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button variant="outline" type="button" className="h-14 rounded-2xl font-bold" onClick={() => setStep(2)}>Back</Button>
                                        <Button
                                            type="submit"
                                            className="h-14 rounded-2xl font-bold text-lg bg-[#1e293b] hover:bg-black text-white"
                                            disabled={isSubmitting || !formData.city || !formData.contact_phone}
                                        >
                                            {isSubmitting ? "Posting..." : "Post Ad Now"}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </form>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PostAd;
