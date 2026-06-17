import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import {
  Calendar, MapPin, MessageSquare, Star,
  ChevronRight, Loader2, Package,
  History, ShieldAlert, X, CreditCard,
  Car, ShoppingBag, Wrench, CheckCircle2,
  XCircle, Clock, ArrowRight, Truck
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiFetch, getImageUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { openExternalUrl } from "@/lib/native";
import { ChatOverlay } from "@/components/ChatOverlay";
import { RatingModal } from "@/components/dashboards/RatingModal";
import { ProviderReviewModal } from "@/components/dashboards/ProviderReviewModal";
import { BookingDetailsModal } from "@/components/dashboards/BookingDetailsModal";
import { TripLiveMap } from "@/components/trips/TripLiveMap";
import { PanicButton, shouldShowPanic } from "@/components/dashboards/PanicButton";
import { cn } from "@/lib/utils";
import { formatUTCtoSAST, formatSASTDate, formatSASTTime } from "@/lib/dateUtils";
import {
  formatShipmentStatus,
  getDeliveryEtaLabel,
  getDeliveryServiceLabel,
  getTrackingSummary,
} from "@/lib/shipping";

type Tab = 'services' | 'rides' | 'orders';

const MyBookings = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart, clearCart } = useCart();
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatJob, setChatJob] = useState<{ id: string, name: string } | null>(null);
  const [ratingJob, setRatingJob] = useState<{ id: string, name: string } | null>(null);
  const [reportingJob, setReportingJob] = useState<{ id: string, name: string } | null>(null);
  const [reviewJob, setReviewJob] = useState<{ id: string, name: string, type: 'professional' | 'provider' | 'cab' } | null>(null);
  const [detailsJob, setDetailsJob] = useState<{ data: any, type: 'service' | 'ride' | 'order' } | null>(null);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [cancellingRideId, setCancellingRideId] = useState<string | null>(null);
  const [hasHandledLandingRequest, setHasHandledLandingRequest] = useState(false);

  const fetchAll = async (showLoader: boolean = true) => {
    if (showLoader) setLoading(true);
    try {
      const [reqRes, ordRes] = await Promise.all([
        apiFetch('/api/requests'),
        apiFetch('/api/shop/orders'),
      ]);
      if (reqRes.success) setRequests(reqRes.data.requests || []);
      if (ordRes.success) setOrders(ordRes.data.orders || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleAcceptQuote = async (requestId: string) => {
    setIsPaying(requestId);
    try {
      const res = await apiFetch(`/api/requests/${requestId}/pay-quote`, { method: 'POST' });
      if (res.success && res.data?.redirect_url) await openExternalUrl(res.data.redirect_url);
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message || "Failed to initiate payment", variant: "destructive" });
    } finally {
      setIsPaying(null);
    }
  };

  const handleCancelRide = async (requestId: string) => {
    const reason = window.prompt("Why are you cancelling this ride?")?.trim() || "";
    setCancellingRideId(requestId);
    try {
      const res = await apiFetch(`/api/requests/${requestId}/cancel`, {
        method: 'POST',
        data: { reason }
      });
      if (res.success) {
        toast({
          title: "Ride Cancelled",
          description: `Refund: R${(res.data?.refund_amount || 0).toFixed(2)} | Cancellation fee: R${(res.data?.cancellation_charge || 0).toFixed(2)}`
        });
        fetchAll(false);
      }
    } catch (err: any) {
      toast({ title: "Cancellation Error", description: err.message || "Failed to cancel ride", variant: "destructive" });
    } finally {
      setCancellingRideId(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchAll();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = window.setInterval(() => {
      fetchAll(false);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated]);

  // ── Split requests and apply search ──────────────────────────────────────
  const lowerSearch = searchTerm.toLowerCase();

  const filteredRequests = requests.filter(r => {
    if (!searchTerm) return true;
    const name = getProviderName(r).toLowerCase();
    const serviceName = (r.details?.service_name || "").toLowerCase();
    if (r.id.toLowerCase().includes(lowerSearch)) return true;
    if (name.includes(lowerSearch)) return true;
    if (serviceName.includes(lowerSearch)) return true;
    if (r.status.toLowerCase().includes(lowerSearch)) return true;
    return false;
  });

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true;
    if (o.id.toLowerCase().includes(lowerSearch)) return true;
    if (o.status.toLowerCase().includes(lowerSearch)) return true;
    if (o.items?.some((i: any) => i.product_name && i.product_name.toLowerCase().includes(lowerSearch))) return true;
    return false;
  });

  const serviceRequests = filteredRequests.filter(r => r.request_type !== 'cab');
  const cabRides = filteredRequests.filter(r => r.request_type === 'cab');

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return "bg-blue-50 text-blue-500 border-blue-100";
      case 'accepted': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case 'completed': case 'paid': case 'delivered': return "bg-slate-50 text-slate-500 border-slate-100";
      case 'cancelled': case 'failed': return "bg-rose-50 text-rose-500 border-rose-100";
      default: return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  const getRideStatusLabel = (req: any) => {
    if (req.request_type !== 'cab') return req.status;

    switch (req.ride_stage) {
      case 'completed':
        return 'completed';
      case 'on_trip':
        return 'on trip';
      case 'driver_arrived':
        return 'driver arrived';
      case 'driver_assigned':
        return 'driver on the way';
      case 'no_drivers_available':
        return 'waiting for drivers';
      case 'searching':
        return 'finding driver';
      case 'awaiting_payment':
        return 'awaiting payment';
      default:
        return req.status;
    }
  };

  const getProviderName = (req: any) => {
    if (req.request_type === 'cab') return req.driver_name || "Assigned Driver";
    return req.details?.provider_name || req.details?.professional_name || "Service Provider";
  };

  const getRideVehicleLabel = (req: any) => {
    const carType = req.details?.car_type || req.driver_vehicle?.car_type || req.details?.selected_driver?.car_type;
    if (!carType) return "Standard ride";
    return String(carType).replace(/_/g, ' ');
  };

  const isActiveRideStage = (req: any) => (
    ['searching', 'no_drivers_available', 'driver_assigned', 'driver_arrived', 'on_trip'].includes(req.ride_stage)
  );

  const getRideTimeline = (req: any) => {
    const stage = req.ride_stage;
    return [
      { key: 'searching', label: 'Finding driver', done: stage !== 'awaiting_payment' && stage !== 'cancelled' },
      { key: 'driver_assigned', label: 'Driver assigned', done: ['driver_assigned', 'driver_arrived', 'on_trip', 'completed'].includes(stage) },
      { key: 'driver_arrived', label: 'Driver arrived', done: ['driver_arrived', 'on_trip', 'completed'].includes(stage) },
      { key: 'on_trip', label: 'Trip in progress', done: ['on_trip', 'completed'].includes(stage) },
      { key: 'completed', label: 'Completed', done: stage === 'completed' },
    ];
  };

  const safeLocation = (req: any) => {
    const loc = req.location_data?.location || req.location_data?.pickup;
    if (!loc) return "Address detailed in request";
    if (typeof loc === "object") return loc.address || "Address detailed in request";
    return loc;
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'services', label: 'Services', icon: <Wrench className="h-4 w-4" />, count: serviceRequests.length },
    { key: 'rides', label: 'Cab Rides', icon: <Car className="h-4 w-4" />, count: cabRides.length },
    { key: 'orders', label: 'Shop Orders', icon: <ShoppingBag className="h-4 w-4" />, count: orders.length },
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'rides' || tab === 'services' || tab === 'orders') {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const requestId = params.get('request_id');
    if (!isAuthenticated || hasHandledLandingRequest || !requestId) return;

    const targetRequest = requests.find((request) => request.id === requestId && request.request_type === 'cab');
    if (!targetRequest) return;

    setActiveTab('rides');
    setDetailsJob({ data: targetRequest, type: 'ride' });
    setHasHandledLandingRequest(true);

    if (payment === 'success') {
      toast({ title: 'Ride Request Created', description: 'Your cab request is now live and being tracked here.' });
    } else if (payment === 'cancelled') {
      toast({ title: 'Payment Cancelled', description: 'Your cab request was not paid for, so dispatch did not start.', variant: 'destructive' });
    } else if (payment === 'error') {
      toast({ title: 'Payment Error', description: 'We could not complete your cab payment. Please try again.', variant: 'destructive' });
    }
  }, [isAuthenticated, hasHandledLandingRequest, location.search, requests, toast]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const payment = params.get('payment');

    if (tab === 'orders') {
      setActiveTab('orders');
    }

    if (tab === 'orders' && payment === 'success') {
      clearCart();
      const timer = setTimeout(() => setBannerDismissed(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Navbar />
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-6" />
        <p className="font-bold text-slate-400">Loading your history...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* ── Page header ── */}
      <section className="pt-32 pb-12 bg-white relative overflow-hidden border-b border-slate-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23EEF2FF\' fill-opacity=\'1\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-70" />
        <div className="container mx-auto px-6 max-w-5xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-block mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                History
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-[#222222] tracking-tight">
                My Bookings
              </h1>
              <p className="text-xl text-slate-500 font-normal mt-3">
                Your services, rides and shop orders in one place
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative group w-full sm:w-80">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="w-full h-12 pl-12 pr-4 bg-white border border-slate-100 rounded-2xl focus:bg-slate-50 focus:border-primary/20 outline-none font-medium text-slate-700 transition-all shadow-sm"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                onClick={fetchAll}
                className="h-12 px-6 rounded-2xl bg-white border border-slate-100 shadow-sm font-bold text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <History className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-2 mt-10 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all",
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-white border border-slate-100 text-slate-500 hover:border-primary/20 hover:text-primary",
                )}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={cn(
                    "ml-1 px-2 py-0.5 rounded-full text-[10px] font-black",
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex-1 bg-white">
        <div className="container mx-auto px-6 py-12 max-w-5xl">
          {/* ══ Payment banners for shop orders ══ */}
          {(() => {
            const params = new URLSearchParams(location.search);
            const tab = params.get('tab');
            const payment = params.get('payment');
            if (tab !== 'orders' || bannerDismissed) return null;
            if (payment === 'success') {
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 p-10 flex flex-col items-center text-center shadow-sm relative"
                >
                  <button
                    onClick={() => setBannerDismissed(true)}
                    className="absolute top-4 right-4 p-2 rounded-full text-emerald-400 hover:bg-emerald-100 transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                  <div className="bg-white p-4 rounded-2xl mb-6 shadow-sm shadow-emerald-200/50">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-emerald-900 mb-3 tracking-tight">Payment Successful!</h2>
                  <p className="text-emerald-700 text-lg max-w-md mx-auto font-medium leading-relaxed">
                    Your order has been placed successfully. You'll receive a confirmation email shortly.
                  </p>
                </motion.div>
              );
            }
            if (payment === 'cancelled') {
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8 rounded-[2rem] bg-amber-50 border border-amber-100 p-10 flex flex-col items-center text-center shadow-sm relative"
                >
                  <button
                    onClick={() => setBannerDismissed(true)}
                    className="absolute top-4 right-4 p-2 rounded-full text-amber-400 hover:bg-amber-100 transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                  <div className="bg-white p-4 rounded-2xl mb-6 shadow-sm shadow-amber-200/50">
                    <XCircle className="h-10 w-10 text-amber-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-amber-900 mb-3 tracking-tight">Payment Cancelled</h2>
                  <p className="text-amber-700 text-lg max-w-md mx-auto font-medium leading-relaxed">
                    No charge was made. Your cart items are still saved — you can go back and try again whenever you're ready.
                  </p>
                  <Button
                    className="mt-8 h-14 px-10 rounded-2xl bg-primary text-white font-bold text-lg"
                    onClick={() => navigate('/checkout')}
                  >
                    Return to Checkout
                  </Button>
                </motion.div>
              );
            }
            return null;
          })()}

          {/* ══════════════ SERVICES TAB ══════════════ */}
          {activeTab === "services" &&
            (serviceRequests.length === 0 ? (
              <EmptyState
                icon={<Wrench className="h-12 w-12 text-slate-200" />}
                title="No service bookings yet"
                subtitle="Book a professional or service provider to get started."
                actions={[
                  { label: "Find Professionals", href: "/professionals" },
                  { label: "Browse Services", href: "/services" },
                ]}
              />
            ) : (
              <div className="space-y-8">
                {serviceRequests.map((req) => (
                  <ServiceCard
                    key={req.id}
                    req={req}
                    getStatusColor={getStatusColor}
                    getProviderName={getProviderName}
                    safeLocation={safeLocation}
                    isPaying={isPaying}
                    onChat={(r) =>
                      setChatJob({ id: r.id, name: getProviderName(r) })
                    }
                    onPay={handleAcceptQuote}
                    onRate={(r) =>
                      setReviewJob({
                        id: r.id,
                        name: getProviderName(r),
                        type:
                          r.request_type === "professional"
                            ? "professional"
                            : "provider",
                      })
                    }
                    onReport={(r) =>
                      setReportingJob({ id: r.id, name: getProviderName(r) })
                    }
                    onView={(r: any) =>
                      setDetailsJob({ data: r, type: "service" })
                    }
                  />
                ))}
              </div>
            ))}

          {/* ══════════════ CAB RIDES TAB ══════════════ */}
          {activeTab === "rides" &&
            (cabRides.length === 0 ? (
              <EmptyState
                icon={<Car className="h-12 w-12 text-slate-200" />}
                title="No cab rides yet"
                subtitle="Book your first ride to see it here."
                actions={[{ label: "Book a Ride", href: "/transport" }]}
              />
            ) : (
              <div className="space-y-6">
                {cabRides.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 p-8 sm:p-10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                      <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-inner">
                          <Car className="h-8 w-8" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                getStatusColor(req.status),
                              )}
                            >
                              {getRideStatusLabel(req)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                              #{req.id.slice(-8)}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold text-[#222222] tracking-tight">
                            Cab Ride
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {formatUTCtoSAST(
                              req.scheduled_date,
                              req.scheduled_time,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {(req.status === "pending" ||
                          req.status === "accepted") && (
                          <Button
                            variant="ghost"
                            className="h-11 px-5 rounded-2xl text-rose-500 bg-rose-50 hover:bg-rose-100 font-bold"
                            onClick={() => handleCancelRide(req.id)}
                            disabled={cancellingRideId === req.id}
                          >
                            {cancellingRideId === req.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Cancel Ride
                          </Button>
                        )}
                        {req.payment_status === "paid" &&
                          !req.has_driver_rating && (
                            <Button
                              className="h-11 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md"
                              onClick={() =>
                                setReviewJob({
                                  id: req.id,
                                  name: getProviderName(req),
                                  type: "cab",
                                })
                              }
                            >
                              <Star className="h-4 w-4 mr-2" /> Rate Driver
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          className="h-11 px-5 rounded-2xl text-rose-500 bg-rose-50 hover:bg-rose-100 font-bold"
                          onClick={() =>
                            setReportingJob({
                              id: req.id,
                              name: getProviderName(req),
                            })
                          }
                        >
                          <ShieldAlert className="h-4 w-4 mr-2" /> Report
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-11 px-5 rounded-2xl text-primary bg-primary/5 hover:bg-primary/10 font-bold"
                          onClick={() =>
                            setDetailsJob({ data: req, type: "ride" })
                          }
                        >
                          Details <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-6 border-y border-slate-50">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Driver
                        </p>
                        <p className="font-bold text-[#222222]">
                          {req.driver_name ||
                            (req.ride_stage === "no_drivers_available"
                              ? "No nearby driver yet"
                              : "Finding nearby driver...")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Amount
                        </p>
                        <p className="text-2xl font-black text-primary">
                          R
                          {(
                            req.payment_amount ||
                            req.quote_amount ||
                            0
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Payment
                        </p>
                        <p
                          className={cn(
                            "font-bold capitalize",
                            req.payment_status === "paid"
                              ? "text-emerald-600"
                              : "text-amber-500",
                          )}
                        >
                          {req.payment_status || "Unpaid"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Ride Type
                        </p>
                        <p className="font-bold text-[#222222] capitalize">
                          {getRideVehicleLabel(req)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Distance
                        </p>
                        <p className="font-bold text-[#222222]">
                          {req.distance_km
                            ? `${Number(req.distance_km).toFixed(1)} km`
                            : "Estimating"}
                        </p>
                      </div>
                    </div>

                    {isActiveRideStage(req) && (
                      <div className="mt-6 rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">
                              Live Ride Progress
                            </p>
                            <p className="mt-2 text-lg font-bold text-[#222222]">
                              {req.ride_stage === "no_drivers_available"
                                ? "We are still looking for another nearby driver."
                                : req.ride_stage === "searching"
                                  ? "Your request is being offered to nearby drivers."
                                  : req.ride_stage === "driver_assigned"
                                    ? `${req.driver_name || "Your driver"} is on the way.`
                                    : req.ride_stage === "driver_arrived"
                                      ? `${req.driver_name || "Your driver"} has arrived at pickup.`
                                      : "You are currently on the trip."}
                            </p>
                            {req.driver_current_location?.updated_at && (
                              <p className="mt-2 text-sm text-slate-500">
                                Last driver location sync:{" "}
                                {formatSASTTime(
                                  req.driver_current_location.updated_at,
                                )}
                              </p>
                            )}
                            {req.driver_phone && (
                              <p className="mt-1 text-sm text-slate-500">
                                Driver contact: {req.driver_phone}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            className="h-11 px-5 rounded-2xl text-primary bg-white border border-blue-100 hover:bg-blue-50 font-bold shrink-0"
                            onClick={() =>
                              setDetailsJob({ data: req, type: "ride" })
                            }
                          >
                            Track Ride <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                          {shouldShowPanic(req) && ( 
                            <PanicButton bookingId={req.id} variant="compact" />
                          )}
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-5">
                          {getRideTimeline(req).map((step) => (
                            <div
                              key={step.key}
                              className={cn(
                                "rounded-2xl border px-4 py-3 transition-colors",
                                step.done
                                  ? "border-emerald-100 bg-emerald-50"
                                  : "border-slate-100 bg-white",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {step.done ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-slate-300" />
                                )}
                                <span
                                  className={cn(
                                    "text-xs font-bold uppercase tracking-wide",
                                    step.done
                                      ? "text-emerald-700"
                                      : "text-slate-400",
                                  )}
                                >
                                  {step.label}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {req.ride_stage === "on_trip" && (
                      <TripLiveMap
                        className="mt-6"
                        currentLocation={req.driver_current_location}
                        destination={req.location_data?.dropoff}
                        currentLabel="Driver live location"
                        destinationLabel="Trip destination"
                      />
                    )}

                    <div className="mt-6 flex items-center gap-4 text-slate-400 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{safeLocation(req)}</span>
                      </div>
                      {req.location_data?.dropoff && (
                        <>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                          <span className="truncate">
                            {typeof req.location_data.dropoff === "object"
                              ? req.location_data.dropoff.address
                              : req.location_data.dropoff}
                          </span>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}

          {/* ══════════════ SHOP ORDERS TAB ══════════════ */}
          {activeTab === "orders" &&
            (filteredOrders.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-12 w-12 text-slate-200" />}
                title={searchTerm ? "No orders found" : "No orders yet"}
                subtitle={
                  searchTerm
                    ? "Try adjusting your search query."
                    : "Head to the shop to browse products and place your first order."
                }
                actions={
                  searchTerm ? [] : [{ label: "Visit Shop", href: "/shop" }]
                }
              />
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 p-8 sm:p-10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-6">
                      <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-primary/5 text-primary flex items-center justify-center shrink-0 shadow-inner">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                getStatusColor(order.status),
                              )}
                            >
                              {order.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                              #{order.id.slice(-8)}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold text-[#222222] tracking-tight">
                            {order.items?.length || 0} Item
                            {order.items?.length !== 1 ? "s" : ""}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {formatSASTDate(order.placed_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Total
                        </p>
                        <p className="text-3xl font-black text-primary">
                          R{(order.total || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {order.status !== 'cancelled' && (order.shipping?.quote ||
                      order.shipping?.shipment_status ||
                      order.shipping?.tracking_reference) && (
                      <div className="mb-6 rounded-[2rem] border border-emerald-100 bg-emerald-50/70 px-5 py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div className="grid flex-1 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                Delivery Service
                              </p>
                              <p className="mt-1 text-sm font-bold text-emerald-950">
                                {getDeliveryServiceLabel(order.shipping)}
                              </p>
                              {getDeliveryEtaLabel(order.shipping) ? (
                                <p className="mt-1 text-xs font-medium text-emerald-700">
                                  {getDeliveryEtaLabel(order.shipping)}
                                </p>
                              ) : null}
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                Shipment Status
                              </p>
                              <p className="mt-1 text-sm font-bold capitalize text-emerald-950">
                                {formatShipmentStatus(
                                  order.shipping?.shipment_status,
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                Tracking Reference
                              </p>
                              <p className="mt-1 text-sm font-bold text-emerald-950">
                                {getTrackingSummary(order.shipping)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Order items */}
                    {order.items && order.items.length > 0 && (
                      <div className="py-6 border-y border-slate-50 space-y-3">
                        {(() => {
                          const bundleMap: Record<string, any[]> = {};
                          const regularItems: any[] = [];
                          order.items.forEach((item: any) => {
                            if (item.bundle_name) {
                              if (!bundleMap[item.bundle_name]) bundleMap[item.bundle_name] = [];
                              bundleMap[item.bundle_name].push(item);
                            } else {
                              regularItems.push(item);
                            }
                          });
                          return (
                            <>
                              {Object.entries(bundleMap).map(([bundleName, bundleItems]) => (
                                <div key={bundleName} className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                                  <div className="px-3 py-2 border-b border-primary/10 flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Bundle</span>
                                    <span className="text-xs font-bold text-slate-800 truncate">{bundleName}</span>
                                  </div>
                                  <div className="divide-y divide-primary/10">
                                    {bundleItems.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          {item.image_url ? (
                                            <img
                                              src={getImageUrl(item.image_url)}
                                              alt={item.product_name}
                                              className="h-9 w-9 rounded-lg object-cover bg-slate-50"
                                            />
                                          ) : (
                                            <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center">
                                              <Package className="h-4 w-4 text-slate-300" />
                                            </div>
                                          )}
                                          <div>
                                            <p className="font-bold text-[#222222] text-xs">{item.product_name || "Product"}</p>
                                            <p className="text-[10px] text-slate-400">Qty: {item.quantity}</p>
                                          </div>
                                        </div>
                                        {item.price && (
                                          <p className="font-bold text-slate-600 text-xs">
                                            R{(item.price * item.quantity).toFixed(2)}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="px-3 py-2 border-t border-primary/10 flex justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Bundle total</span>
                                    <span className="text-xs font-black text-primary">
                                      R{bundleItems.reduce((acc: number, i: any) => acc + (i.price || 0) * (i.quantity || 1), 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {regularItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {(() => {
                                      const displayUrl = item.color_image_url || item.image_url;
                                      return displayUrl ? (
                                        <img
                                          src={getImageUrl(displayUrl)}
                                          alt={item.product_name}
                                          className="h-11 w-11 rounded-xl object-cover bg-slate-50"
                                        />
                                      ) : (
                                        <div className="h-11 w-11 rounded-xl bg-slate-50 flex items-center justify-center">
                                          <Package className="h-5 w-5 text-slate-300" />
                                        </div>
                                      );
                                    })()}
                                    <div>
                                      <p className="font-bold text-[#222222] text-sm">{item.product_name || "Product"}</p>
                                      {item.variant_label && (
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">
                                          {item.variant_label}
                                        </p>
                                      )}
                                      <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                                    </div>
                                  </div>
                                  {item.price && (
                                    <p className="font-bold text-[#222222] text-sm">
                                      R{(item.price * item.quantity).toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        {order.status === "paid" ||
                        order.status === "delivered" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : order.status === "cancelled" ? (
                          <XCircle className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="font-medium capitalize">
                          {order.status}
                        </span>
                      </div>
                      {order.status === 'cancelled' ? (
                        <Button
                          className="h-10 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90"
                          onClick={() => {
                            clearCart();
                            order.items.forEach((item: any) => {
                              addToCart(
                                {
                                  id: item.product_id,
                                  name: item.product_name,
                                  price: item.price,
                                  image: item.image_url,
                                } as any,
                                item.quantity
                              );
                            });
                            navigate('/checkout');
                          }}
                        >
                          Try Again <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="h-10 px-4 rounded-xl text-primary font-bold text-sm"
                          onClick={() =>
                            setDetailsJob({ data: order, type: "order" })
                          }
                        >
                          View Details <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
        </div>
      </div>

      <Footer />

      {/* ── Overlays & Modals ── */}
      {chatJob && (
        <ChatOverlay
          requestId={chatJob.id}
          recipientName={chatJob.name}
          isOpen={!!chatJob}
          onClose={() => setChatJob(null)}
        />
      )}

      {ratingJob && (
        <RatingModal
          isOpen={!!ratingJob}
          onClose={() => setRatingJob(null)}
          jobId={ratingJob.id}
          clientName={ratingJob.name}
          onSuccess={fetchAll}
        />
      )}

      {reviewJob && (
        <ProviderReviewModal
          isOpen={!!reviewJob}
          onClose={() => setReviewJob(null)}
          requestId={reviewJob.id}
          requestType={reviewJob.type}
          providerName={reviewJob.name}
          onSuccess={fetchAll}
        />
      )}

      {detailsJob && (
        <BookingDetailsModal
          isOpen={!!detailsJob}
          onClose={() => setDetailsJob(null)}
          data={detailsJob.data}
          type={detailsJob.type}
        />
      )}

      {/* Reporting modal */}
      <AnimatePresence>
        {reportingJob && (
          <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-10 sm:p-12">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-3xl font-bold text-[#222222] tracking-tight">
                    Report issue
                  </h3>
                  <button
                    onClick={() => setReportingJob(null)}
                    className="h-12 w-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    <X className="h-6 w-6 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Reason for report
                    </label>
                    <div className="relative">
                      <select
                        id="reportReason"
                        className="w-full h-16 rounded-2xl bg-slate-50 px-6 font-bold text-[#222222] outline-none appearance-none"
                      >
                        <option value="no_show">Provider No-Show</option>
                        <option value="unprofessional">
                          Unprofessional Behavior
                        </option>
                        <option value="poor_service">
                          Poor Service Quality
                        </option>
                        <option value="overcharged">
                          Payment Issue / Overcharged
                        </option>
                        <option value="other">Other Issue</option>
                      </select>
                      <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      What happened?
                    </label>
                    <textarea
                      id="reportDesc"
                      rows={5}
                      className="w-full rounded-3xl bg-slate-50 p-6 font-medium text-[#222222] outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                      placeholder="Please describe the issue in detail..."
                    />
                  </div>
                  <Button
                    className="w-full h-16 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xl shadow-lg shadow-rose-100"
                    onClick={async () => {
                      const reason = (
                        document.getElementById(
                          "reportReason",
                        ) as HTMLSelectElement
                      ).value;
                      const desc = (
                        document.getElementById(
                          "reportDesc",
                        ) as HTMLTextAreaElement
                      ).value;
                      if (!desc) {
                        toast({
                          title: "Please provide a description",
                          variant: "destructive",
                        });
                        return;
                      }
                      try {
                        const res = await apiFetch("/api/reports", {
                          method: "POST",
                          data: {
                            reason,
                            description: desc,
                            request_id: reportingJob.id,
                          },
                        });
                        if (res.success) {
                          toast({
                            title: "Report Submitted",
                            description:
                              "Our team will investigate this issue.",
                          });
                          setReportingJob(null);
                        }
                      } catch {
                        toast({
                          title: "Error",
                          description: "Failed to submit report",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Submit Report
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const EmptyState = ({ icon, title, subtitle, actions }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actions: { label: string; href: string }[];
}) => (
  <div className="bg-white rounded-[3rem] border border-slate-50 p-16 text-center shadow-2xl shadow-slate-200/60">
    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">{icon}</div>
    <h3 className="text-2xl font-bold text-[#222222]">{title}</h3>
    <p className="text-slate-500 mt-4 text-lg max-w-sm mx-auto leading-relaxed font-normal">{subtitle}</p>
    <div className="mt-10 flex flex-wrap justify-center gap-4">
      {actions.map((a, i) => (
        <Button
          key={i}
          className={cn("h-14 px-8 rounded-2xl font-bold", i === 0 ? "bg-primary text-white" : "bg-slate-50 text-[#222222]")}
          onClick={() => window.location.href = a.href}
        >
          {a.label}
        </Button>
      ))}
    </div>
  </div>
);

const ServiceCard = ({
  req, getStatusColor, getProviderName, safeLocation,
  isPaying, onChat, onPay, onRate, onReport, onView
}: any) => (
  <motion.div
    key={req.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="group bg-white rounded-[2.5rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 overflow-hidden"
  >
    <div className="p-8 sm:p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[1.5rem] bg-primary/5 text-primary flex items-center justify-center shrink-0 shadow-inner overflow-hidden border border-slate-100">
            {req.provider_profile_image_url || req.service_image_url ? (
              <img src={req.provider_profile_image_url || req.service_image_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Wrench className="h-8 w-8" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusColor(req.status))}>
                {req.status}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">#{req.id.slice(-8)}</span>
            </div>
            <h3 className="text-2xl font-bold text-[#222222] tracking-tight">
              {req.details?.service_name || "Service Request"}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {req.status === 'accepted' && (
            <Button variant="ghost" className="h-12 px-6 rounded-2xl text-primary bg-primary/5 hover:bg-primary/10 font-bold"
              onClick={() => onChat(req)}>
              <MessageSquare className="h-4 w-4 mr-2" /> Chat
            </Button>
          )}
          {req.status === 'pending' && req.quote_amount > 0 && (
            <Button className="h-12 px-6 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20"
              onClick={() => onPay(req.id)} disabled={isPaying === req.id}>
              {isPaying === req.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Accept & Pay Quote
            </Button>
          )}
          {req.payment_status === 'paid' && !req.has_professional_rating && !req.has_provider_rating && (
            <Button className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-100"
              onClick={() => onRate(req)}>
              <Star className="h-4 w-4 mr-2" /> Rate Service
            </Button>
          )}
          <Button variant="ghost" className="h-12 px-6 rounded-2xl text-rose-500 bg-rose-50 hover:bg-rose-100 font-bold"
            onClick={() => onReport(req)}>
            <ShieldAlert className="h-4 w-4 mr-2" /> Report
          </Button>
          <Button variant="ghost" className="h-12 px-6 rounded-2xl text-slate-500 bg-slate-50 hover:bg-slate-100 font-bold"
            onClick={() => onView(req)}>
            Details <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 py-8 border-y border-slate-50">
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partner</p>
          <p className="text-lg font-bold text-[#222222]">{getProviderName(req)}</p>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scheduled</p>
          <p className="text-lg font-bold text-[#222222] flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-300" />
            {formatUTCtoSAST(req.scheduled_date, req.scheduled_time)}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {req.payment_status === 'paid' ? 'Amount Paid' : 'Quote Amount'}
          </p>
          <p className="text-3xl font-black text-primary">
            R{(req.payment_status === 'paid' ? req.payment_amount : req.quote_amount)?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 text-slate-400">
        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
          <MapPin className="h-5 w-5" />
        </div>
        <p className="text-base font-medium truncate">{safeLocation(req)}</p>
      </div>
    </div>
  </motion.div>
);

export default MyBookings;
