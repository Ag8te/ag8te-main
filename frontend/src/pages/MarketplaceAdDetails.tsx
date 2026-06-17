import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Clock, Tag, User, Phone, Mail,
    Share2, Flag, Heart, ArrowLeft, ChevronLeft,
    ChevronRight, ShieldCheck, MessageSquare, ExternalLink, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChatOverlay } from "@/components/ChatOverlay";
import { useAuth } from "@/contexts/AuthContext";

interface Ad {
    id: string;
    user_id: string;
    title: string;
    description: string;
    price: number | null;
    city: string;
    province: string;
    category_name: string;
    condition: string;
    images: string[];
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    created_at: string;
    user: {
        name: string;
        is_verified: boolean;
        email: string;
    };
}

const MarketplaceAdDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showContact, setShowContact] = useState(false);

    // Chat state
    const [chatOpen, setChatOpen] = useState(false);
    const [chatRequestId, setChatRequestId] = useState<string | null>(null);
    const [chatRecipientName, setChatRecipientName] = useState("");
    const [initializingChat, setInitializingChat] = useState(false);

    const { data: adRes, isLoading, error } = useQuery({
        queryKey: ["ads-ad", id],
        queryFn: () => apiFetch(`/api/ads/ads/${id}`),
        enabled: !!id
    });

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (error || !adRes?.success) return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-4">Ad not found</h2>
            <Button onClick={() => navigate('/ads')}>Back to ads</Button>
        </div>
    );

    const ad: Ad = adRes.data;

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({
            title: "Link copied",
            description: "Ad link copied to clipboard"
        });
    };

    const handleSendMessage = async () => {
        if (!id) return;
        if (!currentUser) {
            toast({
                title: "Login Required",
                description: "Please login to message the seller",
                variant: "destructive"
            });
            navigate("/login", { state: { from: `/ads/ad/${id}` } });
            return;
        }

        if (currentUser.id === ad.user_id) {
            toast({
                title: "Invalid Action",
                description: "You cannot message yourself",
                variant: "destructive"
            });
            return;
        }

        setInitializingChat(true);
        try {
            const res = await apiFetch("/api/chat/initialize-ad-chat", {
                method: "POST",
                data: { ad_id: id }
            });

            if (res.success) {
                setChatRequestId(res.data.request_id);
                setChatRecipientName(res.data.recipient_name);
                setChatOpen(true);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to start chat",
                variant: "destructive"
            });
        } finally {
            setInitializingChat(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Navbar />

            <main className="flex-grow pt-24 pb-20">
                <div className="container mx-auto px-6 max-w-7xl">

                    {/* Breadcrumbs / Back button */}
                    <div className="flex items-center justify-between mb-8">
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-primary pl-0 gap-2"
                            onClick={() => navigate('/ads')}
                        >
                            <ArrowLeft size={18} /> Back to ads
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-200" onClick={handleShare}>
                                <Share2 size={16} />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-200">
                                <Heart size={16} />
                            </Button>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-5 gap-12">

                        {/* Left: Gallery & Description (3 columns) */}
                        <div className="lg:col-span-3 space-y-10">

                            {/* main Image Viewer */}
                            <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-slate-100 group">
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={activeImageIndex}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        src={ad.images[activeImageIndex] || "https://images.unsplash.com/photo-1549421263-5ec394a5ad4c?q=80&w=1200&fm=jpg&fit=crop"}
                                        className="w-full h-full object-cover"
                                    />
                                </AnimatePresence>

                                {ad.images.length > 1 && (
                                    <>
                                        <button
                                            className="absolute left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                            onClick={() => setActiveImageIndex(prev => (prev === 0 ? ad.images.length - 1 : prev - 1))}
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button
                                            className="absolute right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                            onClick={() => setActiveImageIndex(prev => (prev === ad.images.length - 1 ? 0 : prev + 1))}
                                        >
                                            <ChevronRight size={24} />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Thumbnails */}
                            {ad.images.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                    {ad.images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            className={`relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 transition-all border-2 ${activeImageIndex === idx ? "border-primary ring-4 ring-primary/10" : "border-transparent"}`}
                                            onClick={() => setActiveImageIndex(idx)}
                                        >
                                            <img src={img} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Details Section */}
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none">{ad.category_name}</Badge>
                                    <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-none">{ad.condition}</Badge>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black text-[#1e293b] leading-tight">{ad.title}</h1>

                                <div className="flex flex-wrap items-center gap-6 text-slate-500 text-sm">
                                    <div className="flex items-center gap-2"><MapPin size={16} /> {ad.city}, {ad.province}</div>
                                    <div className="flex items-center gap-2"><Clock size={16} /> Posted {new Date(ad.created_at).toLocaleDateString()}</div>
                                    <div className="flex items-center gap-2"><Tag size={16} /> ID: {ad.id}</div>
                                </div>

                                <div className="pt-8 border-t border-slate-100">
                                    <h3 className="text-xl font-bold text-[#1e293b] mb-4">Description</h3>
                                    <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {ad.description}
                                    </div>
                                </div>

                                <div className="pt-10 flex items-center gap-4">
                                    <Button variant="ghost" className="text-slate-400 hover:text-rose-500 gap-2 font-bold px-0">
                                        <Flag size={16} /> Report this ad
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right: Price & Contact Info (2 columns) */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Price Card */}
                            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl shadow-slate-100 sticky top-32">
                                <div className="mb-8">
                                    <div className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Asking Price</div>
                                    <div className="text-5xl font-black text-primary flex items-baseline gap-1">
                                        {ad.price ? `R ${ad.price.toLocaleString()}` : "POA"}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-10">
                                    <p className="text-slate-500 text-sm italic">
                                        "Please mention that you found this ad on MzansiServe when contacting the seller."
                                    </p>
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-xl font-bold text-slate-600 border border-slate-100">
                                            {ad.user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1e293b flex items-center gap-2]">
                                                {ad.user.name}
                                                {ad.user.is_verified && <ShieldCheck size={16} className="text-primary" />}
                                            </div>
                                            <div className="text-xs text-slate-400">Verified Seller</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {!showContact ? (
                                        <Button
                                            className="w-full h-16 rounded-2xl bg-[#1e293b] hover:bg-black text-white font-bold text-lg gap-2"
                                            onClick={() => setShowContact(true)}
                                        >
                                            <Phone size={20} /> Reveal Contact Details
                                        </Button>
                                    ) : (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col items-center">
                                                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Cell Number</div>
                                                <div className="text-xl font-black text-[#1e293b]">{ad.contact_phone || "No phone provided"}</div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</div>
                                                <div className="text-sm font-bold text-[#1e293b] truncate w-full text-center">{ad.contact_email || ad.user.email}</div>
                                            </div>
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="w-full h-16 rounded-2xl border-slate-200 text-slate-700 font-bold text-lg gap-2"
                                        onClick={handleSendMessage}
                                        disabled={initializingChat}
                                    >
                                        {initializingChat ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <MessageSquare size={20} />
                                        )}
                                        Send Message
                                    </Button>
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-4">Safety Tips</div>
                                    <ul className="text-[11px] text-slate-400 text-left space-y-2">
                                        <li className="flex gap-2"><span>•</span> Meet at a secure public place</li>
                                        <li className="flex gap-2"><span>•</span> Inspect the item before paying</li>
                                        <li className="flex gap-2"><span>•</span> Avoid paying in advance</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            {chatRequestId && (
                <ChatOverlay
                    requestId={chatRequestId}
                    recipientName={chatRecipientName}
                    isOpen={chatOpen}
                    onClose={() => setChatOpen(false)}
                />
            )}
        </div>
    );
};

export default MarketplaceAdDetails;
