import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Star, MapPin, BadgeCheck, Calendar, Clock,
  CreditCard, Check, Loader2, AlertCircle, Search, ChevronRight,
  ShieldCheck, Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { getCurrentLocationAddress } from "@/lib/locationUtils";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_PLACE_LIBRARIES } from "@/lib/googleMaps";
import { openExternalUrl } from "@/lib/native";
import BookingStepWizard from "@/components/BookingStepWizard";
import { cn } from "@/lib/utils";

const DEFAULT_TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const DAYS_OF_WEEK: string[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface AppSetting { id: string; value: string; }
interface ProviderService { name: string; hourly_rate?: number; }

const BookService = () => {
  const { id, category } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isCustomService, setIsCustomService] = useState(false);
  const [isServiceLocked, setIsServiceLocked] = useState(false);
  const [customService, setCustomService] = useState("");
  const [calloutFee, setCalloutFee] = useState<number>(150);
  const [defaultCalloutFee, setDefaultCalloutFee] = useState<number>(150);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [selectedProvider, setSelectedProvider] = useState<"paypal" | "yoco">("yoco");
  const [enabledGateways, setEnabledGateways] = useState<{paypal: boolean, yoco: boolean}>({ paypal: true, yoco: true });
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);

  useEffect(() => {
    const fetchGateways = async () => {
      try {
        const response = await apiFetch("/api/public/payment-gateways");
        if (response.success && response.data) {
          const gateways = {
            paypal: response.data.paypal?.enabled ?? false,
            yoco: response.data.yoco?.enabled ?? false
          };
          setEnabledGateways(gateways);
          
          if (!gateways.paypal && gateways.yoco) {
            setSelectedProvider("yoco");
          } else if (gateways.paypal && !gateways.yoco) {
            setSelectedProvider("paypal");
          }
        }
      } catch (error) {
        console.error("Failed to fetch payment gateways:", error);
      }
    };
    fetchGateways();
  }, []);

  useEffect(() => {
    const serviceFromUrl = searchParams.get("service");
    if (serviceFromUrl) {
      setSelectedService(decodeURIComponent(serviceFromUrl));
      setIsServiceLocked(true);
    }
  }, [searchParams]);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_PLACE_LIBRARIES,
  });

  // Fetch provider data
  const { data: providerData, isLoading, error } = useQuery({
    queryKey: ['provider', category, id],
    queryFn: async () => {
      const endpoint = category === 'professionals'
        ? `/api/profile/professional/${id}`
        : `/api/profile/service-provider/${id}`;
      const res = await apiFetch(endpoint);
      return res.data;
    },
    enabled: !!id && !!category
  });

  const provider = category === 'professionals'
    ? providerData?.professional
    : providerData?.provider;
  const services = providerData?.services || [];

  // Fetch callout fee setting
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiFetch('/api/admin/settings');
        if (res.success) {
          const settingKey = category === 'professionals'
            ? 'professional_callout_fee_amount'
            : 'provider_callout_fee_amount';
          const setting = res.data.find((s: AppSetting) => s.id === settingKey) || res.data.find((s: AppSetting) => s.id === 'callout_fee_amount');
          if (setting) {
            const val = parseFloat(setting.value);
            setCalloutFee(val);
            setDefaultCalloutFee(val);
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchSettings();
  }, [category]);

  
  //Get today's date string in SAST for comparison
  const nowSAST = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
  const todayStr = `${nowSAST.getFullYear()}-${String(nowSAST.getMonth() + 1).padStart(2, "0")}-${String(nowSAST.getDate()).padStart(2, "0")}`;

  // Get current time in SAST (UTC+2)
  function getCurrentTimeSAST(): string {
    const nowSAST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Africa/Johannesburg" })
    );
    const hh = String(nowSAST.getHours()).padStart(2, "0");
    const mm = String(nowSAST.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  // Update available time slots when date changes
  useEffect(() => {
    if (!date) {
      setAvailableTimeSlots(DEFAULT_TIME_SLOTS);
      return;
    }
    if (!provider) {
      if (date === todayStr) {
        const currentTime = getCurrentTimeSAST();
        setAvailableTimeSlots(DEFAULT_TIME_SLOTS.filter(slot => slot > currentTime));
      } else {
        setAvailableTimeSlots(DEFAULT_TIME_SLOTS);
      }
      return;
    }

    const availability = provider?.data?.availability;
    if (!availability?.regular_hours) {
      // provider has not configured availability yet, show all default time slots
      const currentTime = date === todayStr ? getCurrentTimeSAST() : "00:00";
      setAvailableTimeSlots(DEFAULT_TIME_SLOTS.filter(slot => slot > currentTime));
      return;
    }

    const [year, month, dayNum] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, dayNum);
    const dayName = DAYS_OF_WEEK[selectedDate.getDay()] as string;
    const dayConfig = availability.regular_hours?.[dayName];

    // Check if date is blocked
    if (availability.blocked_dates?.includes(date)) {
      setAvailableTimeSlots([]);
      toast({ title: "Provider Unavailable", description: "Selected date is blocked by the provider.", variant: "destructive" });
      return;
    }

    if (dayConfig && dayConfig.enabled) {
      const start = dayConfig.start; // "08:00"
      const end = dayConfig.end;     // "17:00"

      // Fetch busy slots from backend
      const fetchBusySlots = async () => {
        try {
          const res = await apiFetch(`/api/requests/provider/${id}/busy-slots?date=${date}`);
          const busySlots = res.data?.busy_slots || [];
          
          const currentTime = date === todayStr ? getCurrentTimeSAST() : "00:00";
          const filtered = DEFAULT_TIME_SLOTS.filter(slot =>
            slot >= start && slot < end && !busySlots.includes(slot) && slot > currentTime);
        
          setAvailableTimeSlots(filtered);
        } catch (err) {
          // Fallback to regular hours only if API fails
          const currentTime = date === todayStr ? getCurrentTimeSAST() : "00:00";
          const filtered = DEFAULT_TIME_SLOTS.filter(slot => slot >= start && slot < end && slot > currentTime);
          setAvailableTimeSlots(filtered);
        }
      };

      fetchBusySlots();
    } else {
      setAvailableTimeSlots([]);
      toast({ title: "Provider Closed", description: `The provider does not work on ${dayName}s.`, variant: "destructive" });
    } 
  }, [date, provider, id, toast, todayStr]);

  useEffect(() => {
    if (time && !availableTimeSlots.includes(time)) {
      setTime("");
    }
  }, [time, availableTimeSlots]);

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setLocation(place.formatted_address || place.name || "");
        setCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };

  const handleUseCurrentLocation = () => {
    getCurrentLocationAddress(
      (address, _city, coords, _postalCode) => {
        setLocation(address);
        setCoords(coords);
      },
      (title, description) => toast({ variant: "destructive", title, description }),
      setIsLocating,
      'full_address'
    );
  };
  const handleSubmit = () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    const finalService = services.length > 0 && isCustomService ? customService : selectedService;

    if (!date || !time || !location || (!finalService && services.length > 0)) {
      toast({ title: "Please fill in all details", variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        date,
        time,
        notes,
        location: {
          address: location,
          lat: coords?.lat,
          lng: coords?.lng
        },
        preferences: {
          [category === 'professionals' ? 'professional_id' : 'provider_id']: id,
          service_name: (services.length > 0 && isCustomService) ? customService : selectedService
        },
        payment_amount: calloutFee
      };

      const isProfessional = category === 'professionals';
      const requestPayload = { ...payload, type: isProfessional ? 'professional' : 'provider' };

      const res = await apiFetch('/api/requests/professional-checkout', {
        method: 'POST',
        data: {
          ...requestPayload,
          is_rfq: services.length > 0 ? isCustomService : !selectedService,
          provider: selectedProvider
        }
      });

      if (res.success && res.data?.redirect_url) {
        await openExternalUrl(res.data.redirect_url);
      } else if (res.success) {
        // Fallback if no redirect URL is provided (shouldn't happen with Yoco, but good practice)
        setStep("done");
        toast({ title: "Booking confirmed!", description: `Your request with ${provider?.data?.full_name || 'the provider'} has been submitted.` });
      } else {
        const errorMap: Record<string, string> = {
          "PROV_DATE_BLOCKED": "The provider is unavailable on the selected date.",
          "PROV_OUT_OF_HOURS": "The selected time is outside the provider's working hours.",
          "TIME_SLOT_TAKEN": "This time slot has already been booked. Please choose another.",
          "INVALID_DATE_FORMAT": "Invalid date selected. Please try again.",
          "PROVIDER_ID_REQUIRED": "No provider selected. Please go back and try again.",
        };
        const friendlyMessage = res.message && errorMap[res.message]
          ? errorMap[res.message]
          : res.message || "Failed to initiate payment";
        toast({ title: "Booking Failed",
                description: friendlyMessage,
                variant: "destructive"
         });
      }
    } catch (err: unknown) {

      const message = err instanceof Error ? err.message: "Failed to process booking";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Navbar />
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-6" />
        <p className="font-bold text-slate-500">Loading provider details...</p>
      </main>
    );
  }

  if (error || !provider) {
    return (
      <main className="min-h-screen bg-white">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-24 px-6">
          <div className="text-center p-12 bg-white rounded-[2.5rem] border border-slate-50 shadow-2xl shadow-slate-200/60 max-w-md">
            <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-[#222222] mb-4">Provider not found</h2>
            <p className="text-slate-500 mb-8">We couldn't find the provider you're looking for. They may have been removed or the link is invalid.</p>
            <Button className="h-14 px-8 rounded-2xl font-bold bg-primary text-white" onClick={() => navigate("/services")}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Back to Services
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const fullName = `${provider.data?.full_name || ''} ${provider.data?.surname || ''}`.trim() || provider.data?.business_name || "Provider";

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* ── Page header ── */}
      <section className="pt-32 pb-12 bg-white relative overflow-hidden border-b border-slate-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23EEF2FF\' fill-opacity=\'1\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-70" />
        <div className="container mx-auto px-6 max-w-5xl relative z-10 text-center">
          <span className="inline-block mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Booking</span>
          <h1 className="text-4xl md:text-5xl font-bold text-[#222222] tracking-tight leading-tight">
            {category === 'professionals' ? 'Request a Professional' : 'Request a Service Provider'}
          </h1>
          <p className="mt-4 text-xl text-slate-500 font-normal max-w-2xl mx-auto">
            {category === 'professionals'
              ? 'Find and book verified experts in minutes.'
              : 'Reliable plumbers, electricians, and local services at your doorstep.'}
          </p>
        </div>
      </section>

      <div className="flex-1 bg-white">
        <div className="container mx-auto px-6 py-12 max-w-5xl">
          <BookingStepWizard currentStep={step === "form" ? 2 : (step === "confirm" ? 3 : 3)} />

          <div className="mt-12">
            {/* Step 2: Details */}
            {step === "form" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Form */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-8 space-y-10">
                  <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-50 p-8 sm:p-12">
                    <h3 className="text-3xl font-bold text-[#222222] mb-8">Service details</h3>

                    {!isAuthenticated && (
                      <div className="mb-10 rounded-[1.5rem] bg-blue-50 border border-blue-100 p-6 text-sm text-blue-700 font-medium">
                        <strong>Note:</strong> You'll need to <button onClick={() => navigate("/login")} className="font-bold underline">log in</button> or <button onClick={() => navigate("/register")} className="font-bold underline">register</button> to complete your booking.
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-10">
                      {/* Service Selection */}
                      <div className="relative group">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                          {services.length > 0 ? "Choose Service" : "Service Required"}
                        </label>
                        {isServiceLocked && selectedService ? (
                          <div className="w-full h-16 px-6 bg-slate-50 rounded-2xl flex items-center justify-between">
                            <span className="font-bold text-[#222222] text-lg">{selectedService}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsServiceLocked(false);
                                setSelectedService(null);
                              }}
                              className="text-xs font-bold text-primary hover:underline"
                            >
                              Change
                            </button>
                          </div>
                        ) : services.length > 0 && !isCustomService ? (
                        
                          <Select value={selectedService || ""} onValueChange={(val) => {
                            if (val === "custom") {
                              setIsCustomService(true);
                              setCalloutFee(0);
                            } else {
                              setSelectedService(val);
                              const svc = services.find((s: ProviderService) => s.name === val);
                              if (svc?.hourly_rate && svc.hourly_rate > 0) {
                                setCalloutFee(svc.hourly_rate);
                              } else {
                                setCalloutFee(defaultCalloutFee);
                              }
                            }
                          }}>
                            <SelectTrigger className="w-full h-16 px-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all">
                              <SelectValue placeholder="Select a specific service" />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-2xl shadow-2xl border-slate-50 z-[100]">
                              {services.map((svc: ProviderService) => (
                                <SelectItem key={svc.name} value={svc.name} className="py-4 focus:bg-slate-50 cursor-pointer">
                                  <div className="flex flex-col items-start text-left">
                                    <span className="font-bold text-[#222222]">{svc.name}</span>
                                    {svc.hourly_rate && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">R{svc.hourly_rate} per hour</span>}
                                  </div>
                                </SelectItem>
                              ))}
                              <SelectItem value="custom" className="py-4 focus:bg-slate-50 cursor-pointer border-t border-slate-50 rounded-none">
                                <div className="flex flex-col items-start text-left">
                                  <span className="font-bold text-primary">Other / Custom Service</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Specify your exact needs</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="relative">
                            <Input
                              value={services.length > 0 ? customService : selectedService || ""}
                              onChange={(e) => {
                                if (services.length > 0) setCustomService(e.target.value);
                                else setSelectedService(e.target.value);
                              }}
                              placeholder={services.length > 0 ? "e.g. Specific plumbing repair..." : "Type the service you need..."}
                              className="w-full h-16 pl-6 pr-24 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all"
                            />
                            {services.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                onClick={() => {
                                  setIsCustomService(false);
                                  setCustomService("");
                                  setSelectedService("");
                                  setCalloutFee(defaultCalloutFee);
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Location */}
                      <div className="relative group">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Location</label>
                        <div className="relative">
                          <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                          <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all z-10"
                            title="Use current location"
                          >
                            {isLocating
                             ? <Loader2 className="h-5 w-5 animate-spin" />
                             : <Navigation className="h-5 w-5" />
                            }
                          </button>
                          {isLoaded ? (
                            <Autocomplete
                              onLoad={ref => autocompleteRef.current = ref}
                              onPlaceChanged={onPlaceChanged}
                            >
                              <input
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Enter service address"
                                className="w-full h-16 pl-16 pr-14 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all"
                              />
                            </Autocomplete>
                          ) : (
                            <input placeholder="Loading maps..." disabled className="w-full h-16 bg-slate-50 rounded-2xl pl-16" />
                          )}
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="relative group">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Preferred Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                              type="date"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full h-16 pl-16 pr-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all"
                            />
                          </div>
                        </div>

                        <div className="relative group">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Preferred Time</label>
                          <div className="relative">
                            <Clock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Select value={time} onValueChange={setTime} disabled={availableTimeSlots.length === 0}>
                              <SelectTrigger className="w-full h-16 pl-16 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all">
                                <SelectValue placeholder={availableTimeSlots.length === 0 ? "No slots available" : "Select a time slot"} />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl shadow-2xl border-slate-50">
                                {availableTimeSlots.map((t) => <SelectItem key={t} value={t} className="py-3 focus:bg-slate-50 cursor-pointer">{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="relative group">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Job Description</label>
                        <textarea
                          id="requestNotes"
                          rows={4}
                          placeholder="Describe the job in detail..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full p-6 bg-slate-50 rounded-3xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="ghost"
                      className="h-16 px-8 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-all"
                      onClick={() => navigate(-1)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-16 rounded-2xl bg-primary text-white font-bold text-xl shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-1"
                      onClick={handleSubmit}
                    >
                      {(services.length > 0 && isCustomService) || (services.length === 0 && !selectedService) ? "Request a Quote" : "Review Now"}
                    </Button>
                  </div>
                </motion.div>

                {/* Right: Summary */}
                <div className="lg:col-span-4">
                  <div className="sticky top-28 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-50 p-8 space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center text-primary font-bold text-lg shadow-inner">
                        {fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#222222] text-lg">{fullName}</h4>
                        <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{category === 'professionals' ? 'Professional' : 'Provider'}</p>
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Service Type</p>
                        <p className="font-bold text-[#222222] text-lg">{(services.length > 0 && isCustomService) ? customService : selectedService || "Not selected"}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {((services.length > 0 && isCustomService) || (services.length === 0 && !selectedService)) ? "Expected range" : "Booking Fee"}
                        </p>
                        <p className="text-xl font-bold text-primary">
                          {((services.length > 0 && isCustomService) || (services.length === 0 && !selectedService)) ? "TBD" : `R${calloutFee.toFixed(2)}`}
                        </p>
                      </div>
                      <BadgeCheck className="h-6 w-6 text-primary" />
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed font-normal">
                      * The call-out fee is required to secure your booking. Final rates are discussed with your provider.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === "confirm" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto w-full">
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-50 overflow-hidden">
                  <div className="bg-[#222222] p-8 sm:p-10 text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-white shadow-2xl">
                      <Check className="h-10 w-10" strokeWidth={3} />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">Review & Confirm</h3>
                    <p className="text-slate-400 text-lg">Double check your request details below.</p>
                  </div>

                  <div className="p-10 sm:p-12 space-y-10">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] p-8 flex items-start">
                      <div className="bg-emerald-100 p-3 rounded-xl mr-5">
                        <BadgeCheck className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-emerald-900 mb-2">Verified Secure Booking</h3>
                        <p className="text-emerald-700 leading-relaxed font-medium">
                          You're booking with a verified partner. Your payment is held securely until the job is completed.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-end pb-6 border-b border-slate-50">
                        <span className="text-slate-400 font-bold uppercase tracking-[0.15em] text-[10px]">
                          {((services.length > 0 && isCustomService) || (services.length === 0 && !selectedService)) ? "Quotation Status" : "Booking Fee"}
                        </span>
                        <span className="text-4xl font-bold text-[#222222]">
                          {((services.length > 0 && isCustomService) || (services.length === 0 && !selectedService)) ? "Requesting Quote" : `R${calloutFee.toFixed(2)}`}
                        </span>
                      </div>

                      {/* Payment Provider Selection */}
                      {((services.length > 0 && !isCustomService) || (services.length === 0 && selectedService)) && (
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Payment Method</p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {enabledGateways.paypal && (
                              <div 
                                onClick={() => setSelectedProvider("paypal")}
                                className={cn(
                                  "cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col gap-3",
                                  selectedProvider === "paypal" ? "border-primary bg-primary/5" : "border-slate-100 bg-white"
                                )}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="h-6 w-12 bg-contain bg-no-repeat bg-left" 
                                       style={{ backgroundImage: "url('https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg')" }} />
                                  {selectedProvider === "paypal" && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
                                </div>
                                <span className="text-sm font-bold text-[#222222]">PayPal / Card</span>
                              </div>
                            )}

                            {enabledGateways.yoco && (
                              <div 
                                onClick={() => setSelectedProvider("yoco")}
                                className={cn(
                                  "cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col gap-3",
                                  selectedProvider === "yoco" ? "border-primary bg-primary/5" : "border-slate-100 bg-white"
                                )}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="h-5 w-10 bg-contain bg-no-repeat bg-left" 
                                       style={{ backgroundImage: "url('https://cdn.yoco.com/images/yoco-logo-dark.svg')" }} />
                                  {selectedProvider === "yoco" && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
                                </div>
                                <span className="text-sm font-bold text-[#222222]">Yoco</span>
                              </div>
                            )}

                            {!enabledGateways.paypal && !enabledGateways.yoco && (
                              <div className="col-span-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-slate-500 text-sm font-medium">No payment methods currently available.</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Encrypted & Secure Payment</span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Service Requested</p>
                          <p className="font-bold text-[#222222] text-lg">{(services.length > 0 && isCustomService) ? customService : selectedService}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                          <p className="font-bold text-[#222222] text-lg">{date} at {time}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</p>
                          <p className="font-bold text-[#222222] text-lg">{location}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 space-y-4">
                      <Button
                        className="w-full h-16 rounded-2xl bg-primary text-white font-bold text-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-70"
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        ) : (
                          <CreditCard className="mr-2 h-6 w-6" />
                        )}
                        {((services.length > 0 && isCustomService) || (services.length === 0 && !selectedService)) ? 'Submit Quote Request' : 'Secure Booking Now'}
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full h-14 font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-colors"
                        onClick={() => setStep("form")}
                      >
                        Back to Edit Details
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {step === "done" && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-20 text-center bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-50 max-w-2xl mx-auto w-full p-10">
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-inner">
                  <Check className="h-12 w-12" />
                </div>
                <h2 className="mb-4 text-4xl font-bold text-[#222222]">Request Sent!</h2>
                <p className="mb-12 text-slate-500 text-xl max-w-sm mx-auto">
                  Your request with {fullName} has been successfully submitted. We'll notify you once they accept.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button
                    variant="ghost"
                    className="h-16 px-10 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    onClick={() => navigate("/services")}
                  >
                    Browse More
                  </Button>
                  <Button
                    className="h-16 px-10 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg hover:opacity-90 transition-all"
                    onClick={() => navigate("/")}
                  >
                    Back to Home
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default BookService;
