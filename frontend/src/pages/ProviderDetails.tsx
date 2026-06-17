import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    MapPin, Star, ShieldCheck, Mail, Phone, Globe,
    Briefcase, GraduationCap, Award, Clock, ArrowLeft, Loader2,
    MessageSquare, CalendarCheck, Package, Quote, Calendar, Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChatOverlay } from "@/components/ChatOverlay";
import { cn } from "@/lib/utils";

const ProviderDetails = () => {
    const { id, category } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { toast } = useToast();

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatJobId, setChatJobId] = useState<string | null>(null);
    const [creatingChat, setCreatingChat] = useState(false);

    const { data: fetchResult, isLoading, error } = useQuery({
        queryKey: ['provider', category, id],
        queryFn: async () => {
            const endpoint = (category === 'professionals' || category === 'professional')
                ? `/api/profile/professional/${id}`
                : `/api/profile/service-provider/${id}`;
            const res = await apiFetch(endpoint);
            return res.data;
        },
        enabled: !!id && !!category
    });

    const { data: reviewsData } = useQuery({
        queryKey: ['provider-reviews', id],
        queryFn: async () => {
            const res = await apiFetch(`/api/requests/reviews/${id}`);
            return res.data;
        },
        enabled: !!id,
    });

    const profile = (category === 'professionals' || category === 'professional') ? fetchResult?.professional : fetchResult?.provider;
    const services = fetchResult?.services || [];
    const reviews: any[] = reviewsData?.reviews || [];
    const avgRating: number = reviewsData?.average_rating || 0;
    const totalReviews: number = reviewsData?.total || 0;

    const handleStartChat = async () => {
        if (!isAuthenticated) {
            toast({ title: "Please login", description: "You need to be logged in to chat with providers.", variant: "destructive" });
            navigate('/login');
            return;
        }

        setCreatingChat(true);
        try {
            // Create a dummy/inquiry request to attach the chat to
            const res = await apiFetch('/api/requests', {
                method: 'POST',
                data: {
                    type: 'provider',
                    date: new Date().toISOString().split('T')[0],
                    time: '00:00', // Time doesn't matter much for inquiry
                    location: { address: 'General Inquiry' },
                    notes: 'Initial inquiry via profile',
                    preferences: {
                        [(category === 'professionals' || category === 'professional') ? 'professional_id' : 'provider_id']: id,
                        service_name: 'General Inquiry'
                    }
                }
            });

            if (res.success && res.data?.request?.id) {
                setChatJobId(res.data.request.id);
                setIsChatOpen(true);
            } else {
                toast({ title: "Error", description: "Could not initiate chat. Please try again.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to start chat.", variant: "destructive" });
        } finally {
            setCreatingChat(false);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-white flex flex-col items-center justify-center">
                <Navbar />
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-6" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Loading Profile...</p>
            </main>
        );
    }

    if (error || !profile) {
        return (
            <main className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-6">
                <Navbar />
                <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mb-6">
                    <Package className="h-10 w-10 text-rose-500" />
                </div>
                <h2 className="text-3xl font-bold text-[#222222] mb-4">Profile Unavailable</h2>
                <p className="text-slate-500 mb-8 max-w-sm">We couldn't find this provider's profile. They might have been removed or the link is invalid.</p>
                <Button onClick={() => navigate(-1)} className="h-14 px-8 rounded-2xl bg-primary text-white font-bold">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Go Back
                </Button>
            </main>
        );
    }

    const data = profile.data || {};
    const userDetails = profile || {};

    const fullName = (category === 'professionals' || category === 'professional')
        ? `${data.full_name || ''} ${data.surname || ''}`.trim() || profile.full_name || profile.name
        : data.business_name || `${data.full_name || ''} ${data.surname || ''}`.trim() || profile.full_name || profile.name || "Service Provider";

    const avatarUrl = userDetails.profile_image_url
        ? (getImageUrl(userDetails.profile_image_url))
        : null;

    const bannerUrl = userDetails.banner_url
        ? (getImageUrl(userDetails.banner_url))
        : "https://images.unsplash.com/photo-1541888081628-912235c4eb5e?q=80&w=1200&fm=jpg&fit=crop";

    // Detect if they offer any priced services
    const hasPricedServices = services.some((svc: any) => parseFloat(svc.hourly_rate) > 0);
    const isQuoteRequired = services.length > 0 && !hasPricedServices;

    return (
        <main className="min-h-screen bg-white flex flex-col">
            <Navbar />

            {/* Banner / Header */}
            <section className="relative pt-20 h-[350px] w-full bg-slate-100 overflow-hidden">
                <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 container mx-auto max-w-6xl">
                    <Button
                        variant="ghost"
                        className="mb-8 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-bold tracking-wide"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" /> Back to listings
                    </Button>
                </div>
            </section>

            <section className="container mx-auto px-6 max-w-6xl relative -mt-16 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Main Content */}
                    <div className="lg:col-span-8 flex flex-col gap-10">
                        {/* Profile Overview */}
                        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-50 relative">
                            <div className="flex flex-col sm:flex-row gap-8">
                                <div className="h-32 w-32 rounded-[2rem] border-4 border-white shadow-xl bg-slate-50 overflow-hidden shrink-0 -mt-16 bg-white flex items-center justify-center text-4xl font-black text-slate-300">
                                    {avatarUrl ? <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" /> : fullName[0]}
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                                        <h1 className="text-3xl sm:text-4xl font-bold text-[#222222] tracking-tight">{fullName}</h1>
                                        {userDetails.is_approved && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                <ShieldCheck className="h-4 w-4" /> Verified Partner
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-lg text-slate-500 font-medium leading-relaxed mb-6">
                                        {category === 'professionals' ? data.highest_qualification : data.service_type || 'Professional Service Provider'}
                                    </p>

                                    <div className="flex flex-wrap gap-6 border-t border-slate-50 pt-6">
                                        <div className="flex items-center gap-2">
                                            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                                            <span className="font-bold text-[#222222] text-lg">
                                                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                                            </span>
                                            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                                                ({totalReviews} Review{totalReviews !== 1 ? 's' : ''})
                                            </span>
                                        </div>
                                        {data.city && (
                                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                                <MapPin className="h-5 w-5" />
                                                {data.city}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* About / Bio */}
                        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-slate-50">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">About</h2>
                            <p className="text-slate-600 text-lg leading-relaxed font-normal whitespace-pre-wrap">
                                {data.bio || data.description || "No description provided by the provider yet. They specialize in offering high-quality services to clients in their area."}
                            </p>
                        </div>

                        {/* Qualifications / Specific Details */}
                        {category === 'professionals' && (
                            <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-slate-50">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Qualifications & Credentials</h2>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    {data.id_number && (
                                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="bg-white p-2 rounded-xl shadow-sm"><ShieldCheck className="h-6 w-6 text-primary" /></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Verification</p>
                                                <p className="text-[#222222] font-bold">Verified</p>
                                            </div>
                                        </div>
                                    )}
                                    {data.highest_qualification && (
                                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="bg-white p-2 rounded-xl shadow-sm"><GraduationCap className="h-6 w-6 text-primary" /></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Education</p>
                                                <p className="text-[#222222] font-bold line-clamp-2">{data.highest_qualification}</p>
                                            </div>
                                        </div>
                                    )}
                                    {data.years_experience && (
                                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="bg-white p-2 rounded-xl shadow-sm"><Briefcase className="h-6 w-6 text-primary" /></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                                                <p className="text-[#222222] font-bold">{data.years_experience} Years</p>
                                            </div>
                                        </div>
                                    )}
                                    {data.professional_body && (
                                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="bg-white p-2 rounded-xl shadow-sm"><Award className="h-6 w-6 text-primary" /></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registration</p>
                                                <p className="text-[#222222] font-bold line-clamp-2">{data.professional_body}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Setup for Operating Areas & Availability extracted from data */}
                        {(data.operating_areas?.length > 0 || data.availability) && (
                            <div className="grid sm:grid-cols-2 gap-8">
                                {/* Operating Areas */}
                                {data.operating_areas?.length > 0 && (
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Map className="w-32 h-32" /></div>
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2"><MapPin className="w-4 h-4" /> Service Areas</h2>
                                        <div className="flex flex-wrap gap-2 relative z-10">
                                            {data.operating_areas.map((area: string, idx: number) => (
                                                <div key={idx} className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-bold text-sm shadow-sm">{area}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Availability / Schedule */}
                                {data.availability?.regular_hours && (
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Calendar className="w-32 h-32" /></div>
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2"><Clock className="w-4 h-4" /> Standard Hours</h2>
                                        <div className="space-y-3 relative z-10">
                                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                                                const schedule = data.availability.regular_hours[day];
                                                if (!schedule) return null;
                                                return (
                                                    <div key={day} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                                        <span className="capitalize text-slate-500 font-bold text-sm w-24">{day}</span>
                                                        {schedule.enabled ? (
                                                            <span className="text-slate-700 font-bold bg-slate-50 px-3 py-1 rounded-lg text-xs border border-slate-100 shadow-sm">
                                                                {schedule.start} - {schedule.end}
                                                            </span>
                                                        ) : (
                                                            <span className="text-rose-400 font-bold text-xs uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-lg">Closed</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Services Offered */}
                        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-slate-50">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Services Offered</h2>
                            {services.length > 0 ? (
                                <div className="space-y-4">
                                    {services.map((svc: any, idx: number) => (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-slate-100 hover:border-primary/20 transition-colors bg-slate-50/50">
                                            <div>
                                                <h3 className="text-xl font-bold text-[#222222] mb-1">{svc.name}</h3>
                                                <p className="text-sm text-slate-500 leading-relaxed max-w-lg">{svc.description}</p>
                                            </div>
                                            <div className="shrink-0 text-left sm:text-right">
                                                {svc.hourly_rate ? (
                                                    <>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate</p>
                                                        <p className="text-2xl font-black text-primary">R{svc.hourly_rate}<span className="text-sm text-slate-400 font-bold">/hr</span></p>
                                                    </>
                                                ) : (
                                                    <p className="text-lg font-bold text-slate-500 uppercase tracking-widest">Quote On Request</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-slate-500">No specific services listed. Contact provider for details.</p>
                                </div>
                            )}
                        </div>

                        {/* Client Reviews */}
                        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-slate-50">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                                Client Reviews
                                {totalReviews > 0 && <span className="ml-2 normal-case text-slate-300">({totalReviews})</span>}
                            </h2>
                            {reviews.length > 0 ? (
                                <div className="space-y-6">
                                    {reviews.map((rev: any) => (
                                        <div key={rev.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <Star key={s} className={cn(
                                                            "h-4 w-4",
                                                            s <= rev.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
                                                        )} />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }) : ''}
                                                </span>
                                            </div>
                                            {rev.review_text && (
                                                <div className="flex items-start gap-3">
                                                    <Quote className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                                                    <p className="text-slate-600 text-sm leading-relaxed">{rev.review_text}</p>
                                                </div>
                                            )}
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-3">Anonymous Client</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-100">
                                    <Star className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No reviews yet.</p>
                                    <p className="text-slate-400 text-sm mt-1">Be the first to leave a review after booking.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Actions */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-28 space-y-6">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/60 border border-slate-50">
                                <h3 className="text-xl font-bold text-[#222222] mb-6">Ready to hire?</h3>

                                <div className="space-y-4">
                                    <Button
                                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20 transition-all hover:-translate-y-1"
                                        onClick={() => navigate(`/book/${category}/${id}`)}
                                    >
                                        <CalendarCheck className="mr-3 h-5 w-5" />
                                        {isQuoteRequired ? "Request Quote" : "Book Now"}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full h-16 rounded-2xl border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-lg transition-all"
                                        onClick={handleStartChat}
                                        disabled={creatingChat}
                                    >
                                        {creatingChat ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <MessageSquare className="mr-3 h-5 w-5" />}
                                        Message Provider
                                    </Button>
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <Clock className="h-5 w-5 text-slate-400" />
                                        <span className="font-medium text-sm">Usually responds within 1 hr</span>
                                    </div>
                                    {data.city && (
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <MapPin className="h-5 w-5 text-slate-400" />
                                            <span className="font-medium text-sm">Serves {data.city} and surrounds</span>
                                        </div>
                                    )}
                                    {userDetails.phone && (
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <Phone className="h-5 w-5 text-slate-400" />
                                            <span className="font-medium text-sm hidden group-hover:block">Click to reveal</span>
                                            <span className="font-medium text-sm blur hover:blur-none transition-all cursor-pointer select-none">Reveal Phone</span>
                                        </div>
                                    )}
                                    {data.email && (
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <Mail className="h-5 w-5 text-slate-400" />
                                            <span className="font-medium text-sm blur hover:blur-none transition-all cursor-pointer select-none">Reveal Email</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            <Footer />

            {/* Chat Overlay */}
            {chatJobId && (
                <ChatOverlay
                    requestId={chatJobId}
                    recipientName={fullName}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </main>
    );
};

export default ProviderDetails;
