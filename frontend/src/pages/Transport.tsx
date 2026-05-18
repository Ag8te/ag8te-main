import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MapPin, Navigation, Car, Users, Clock, Loader2, PlaySquare, Calendar, Star,
  CheckCircle2, AlertCircle, ChevronRight, PhoneCall, Wallet, Check, Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useJsApiLoader, Autocomplete, GoogleMap, Marker } from "@react-google-maps/api";
import { formatUTCtoSAST, getMinBookableTimeSAST } from "@/lib/dateUtils";
import { getCurrentLocationAddress } from "@/lib/locationUtils";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_PLACE_LIBRARIES } from "@/lib/googleMaps";
import { openExternalUrl } from "@/lib/native";
import { useSearchParams } from "react-router-dom";

type Step = 1 | 2 | 3;

const VEHICLE_TYPES = [
  { id: "hatchback", name: "Small Hatchback", desc: "Affordable compact rides", icon: Car, capacity: 3, multiplier: 1, details: "Perfect for zip city travel" },
  { id: "sedan", name: "Sedan", desc: "Comfortable everyday rides", icon: Car, capacity: 4, multiplier: 1.2, details: "Our most popular standard ride" },
  { id: "suv", name: "SUV", desc: "Spacious for groups", icon: Users, capacity: 6, multiplier: 1.8, details: "Plenty of room for luggage" },
  { id: "luxury", name: "Luxury", desc: "Travel in style", icon: Star, capacity: 4, multiplier: 2.5, details: "Premium high-end vehicles" },
];

/** Local calendar date as YYYY-MM-DD (avoids UTC day-shift from `toISOString()`). */
function formatLocalDateYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const mapStyles = [
  {
    "featureType": "all",
    "elementType": "geometry.fill",
    "stylers": [{ "weight": "2.00" }]
  },
  {
    "featureType": "all",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#9c9c9c" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "landscape",
    "elementType": "all",
    "stylers": [{ "color": "#f2f2f2" }]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "poi",
    "elementType": "all",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "elementType": "all",
    "stylers": [{ "saturation": -100 }, { "lightness": 45 }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#eeeeee" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#7b7b7b" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "all",
    "stylers": [{ "visibility": "simplified" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "transit",
    "elementType": "all",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "water",
    "elementType": "all",
    "stylers": [{ "color": "#46bcec" }, { "visibility": "on" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#c8d7d4" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#070707" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#ffffff" }]
  }
];

const SA_CENTER = { lat: -26.2041, lng: 28.0473 }; // Johannesburg

const VEHICLE_TYPE_ALIASES: Record<string, string[]> = {
  hatchback: ["hatchback", "small_hatchback"],
  small_hatchback: ["hatchback", "small_hatchback"],
  sedan: ["sedan", "standard"],
  standard: ["sedan", "standard"],
  suv: ["suv"],
  luxury: ["luxury", "premium"],
  premium: ["luxury", "premium"],
};

const expandVehicleTypes = (value: string) => {
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, "_");
  const parts = normalized.split(/[/,|+&]+/).filter(Boolean);
  const source = parts.length ? parts : [normalized];
  return source.flatMap((part) => VEHICLE_TYPE_ALIASES[part] || [part]);
};

const getDriversForVehicle = (drivers: any[], vehicleId: string | null) => {
  if (!vehicleId) return [];
  const aliases = VEHICLE_TYPE_ALIASES[vehicleId] || [vehicleId];
  return drivers.filter((driver) =>
    Array.isArray(driver.car_types) &&
    driver.car_types.some((carType: string) =>
      expandVehicleTypes(carType).some((expandedType) => aliases.includes(expandedType))
    )
  );
};

const pickSuggestedDriver = (drivers: any[]) => {
  if (!drivers.length) return null;
  return [...drivers].sort((a, b) => {
    const distanceDelta = (a.distance_km || 0) - (b.distance_km || 0);
    if (distanceDelta !== 0) return distanceDelta;
    const ratingDelta = (b.average_rating || 0) - (a.average_rating || 0);
    if (ratingDelta !== 0) return ratingDelta;
    return (b.reviews_count || 0) - (a.reviews_count || 0);
  })[0];
};

const Transport = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_PLACE_LIBRARIES,
  });

  const [step, setStep] = useState<Step>(1);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [pickupValid, setPickupValid] = useState(false);
  const [dropoffValid, setDropoffValid] = useState(false);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [date, setDate] = useState(() => formatLocalDateYYYYMMDD(new Date()));
  const [time, setTime] = useState("12:00");
  const [driverPref, setDriverPref] = useState("");

  const [quote, setQuote] = useState<{ amount: number, rate: number } | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);


  // Refs for focusing and controlling Autocomplete
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const dropoffInputRef = useRef<HTMLInputElement>(null);
  const pickupAutocompleteRef = useRef<any>(null);
  const dropoffAutocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (loadError) {
      console.error("Google Maps Load Error:", loadError);
      toast({ variant: "destructive", title: "Maps Error", description: "Failed to load Google Maps. Suggestions may not work." });
    }
  }, [loadError, toast]);

  useEffect (() => {
    if (searchParams.get("payment") === "cancelled") {
      const timer = setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Payment Cancelled",
          description: "Your payment process was cancelled. Please try booking again.",
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const handlePopState = () => {
      if (step > 1) {
        //Browser back arrow pressed mid-flow - go back a step, don't checkout
        setStep((prev) => (prev - 1) as Step);
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [step]);


  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [suggestedDriver, setSuggestedDriver] = useState<any | null>(null);

  const handleUseCurrentLocation = async () => {
    getCurrentLocationAddress(
      (address, _city, coords, _postalCode) => {
        setPickup(address || "Current location");
        setPickupCoords(coords);
        setPickupValid(true);
      },
      (title, description) => toast({ variant: "destructive", title, description }),
      setIsLocating,
      'full_address',
      { allowApproximateAddress: true, fallbackAddress: "Current location" }
    );
  };

  const handleSetRoute = async () => {
    if (!pickup || !dropoff || !pickupCoords || !dropoffCoords) {
      toast({
        variant: "destructive",
        title: "Missing locations",
        description: "Please select both pick-up and drop-off locations from the suggestions."
      });
      return;
    }
    setIsCalculating(true);

    // Fetch nearby drivers when pickup is set
    try {
      const nearbyRes = await apiFetch(`/api/public/drivers-nearby?lat=${pickupCoords.lat}&lng=${pickupCoords.lng}&radius=10`);
      if (nearbyRes.success) {
        setNearbyDrivers(nearbyRes.data.drivers || []);
      }
    } catch (err) {
      console.error("Nearby drivers fetch error:", err);
    }

    if (isLoaded && window.google) {
      try {
        const service = new google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
          {
            origins: [new google.maps.LatLng(pickupCoords.lat, pickupCoords.lng)],
            destinations: [new google.maps.LatLng(dropoffCoords.lat, dropoffCoords.lng)],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
          },
          (response, status) => {
            setIsCalculating(false);
            if (status === 'OK' && response && response.rows[0].elements[0].status === 'OK') {
              const distMetres = response.rows[0].elements[0].distance.value;
              setDistanceKm(distMetres / 1000);
              setStep(2);
            } else {
              const elementStatus = response?.rows[0]?.elements[0]?.status;
              toast({
                variant: "destructive",
                title: "Route Error",
                description: `Could not calculate driving distance. Status: ${status} ${elementStatus ? `(${elementStatus})` : ''}. Please try again.`
              });
            }
          }
        );
      } catch (err) {
        setIsCalculating(false);
        console.error("Distance Matrix Error:", err);
      }
    } else {
      setIsCalculating(false);
      toast({ variant: "destructive", title: "Error", description: "Google Maps service is not ready." });
    }
  };

  useEffect(() => {
    const fetchFare = async () => {
      if (distanceKm && selectedVehicle) {
        try {
          const res = await apiFetch(`/api/public/calculate-fare?distance=${distanceKm}&car_type=${selectedVehicle}`);
          if (res.success && res.data?.fare) {
            setQuote({ amount: res.data.fare, rate: res.data.fare / distanceKm });
          } else {
            const v = VEHICLE_TYPES.find(v => v.id === selectedVehicle);
            if (v) {
              const rate = 12 * v.multiplier;
              const baseFare = 25;
              const total = baseFare + (distanceKm * rate);
              setQuote({ amount: total, rate: rate });
            }
          }
        } catch (error) {
          console.error("Failed to fetch fare:", error);
        }
      }
    };
    fetchFare();
  }, [distanceKm, selectedVehicle]);

  useEffect(() => {
    const matchingDrivers = getDriversForVehicle(nearbyDrivers, selectedVehicle);
    setSuggestedDriver(pickSuggestedDriver(matchingDrivers));
  }, [nearbyDrivers, selectedVehicle]);

  const minSelectableDate = formatLocalDateYYYYMMDD(new Date());
  const isToday = date === minSelectableDate;

  useEffect(() => {
    if (scheduleType === "later" && isToday) {
      const min = getMinBookableTimeSAST();
      if (time < min) {
        setTime(min);
      }
    }
  }, [date, scheduleType]);


  const handleRequestRide = async () => {
    if (!quote || !selectedVehicle) return;

    if (scheduleType === "later" && (!date || !time)) {
      toast({ variant: "destructive", title: "Missing Schedule", description: "Please provide both date and time for scheduled rides." });
      return;
    }

    if (scheduleType === "later") {
      const todayLocal = formatLocalDateYYYYMMDD(new Date());
      if (date < todayLocal) {
        toast({
          variant: "destructive",
          title: "Invalid date",
          description: "Please choose today or a future date.",
        });
        return;
      }
      const scheduled = new Date(`${date}T${time}:00`);
      if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
        toast({
          variant: "destructive",
          title: "Invalid schedule",
          description: "Pick a date and time in the future.",
        });
        return;
      }
    }

    setIsRequesting(true);
    try {
      const payload = {
        pickup: {
          address: pickup,
          lat: pickupCoords?.lat,
          lng: pickupCoords?.lng
        },
        dropoff: {
          address: dropoff,
          lat: dropoffCoords?.lat,
          lng: dropoffCoords?.lng
        },
        schedule_type: scheduleType,
        date,
        time,
        preferences: {
          car_type: selectedVehicle,
          driver_preference: driverPref
        },
        selected_driver_id: suggestedDriver?.id || null,
        payment_amount: quote.amount,
        distance_km: distanceKm
      };

      const res = await apiFetch('/api/requests/cab-checkout', {
        method: 'POST',
        data: payload
      });

      if (res.success && res.data?.redirect_url) {
        toast({ title: "Redirecting", description: "Taking you to secure checkout..." });
        setTimeout(() => {
          void openExternalUrl(res.data.redirect_url);
        }, 1000);
      } else {
        toast({
          variant: "destructive",
          title: "Request failed",
          description: res.message || "Could not initiate checkout."
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Request failed",
        description: e.message || "An unexpected error occurred."
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const onMapLoad = (map: google.maps.Map) => {
    console.log("Map Loaded");
  };

  const timeSlots = Array.from({ length:48 }, (_, i) => {
    const hh = String(Math.floor(i / 2)).padStart(2, "0");
    const mm = i % 2 === 0 ? "00" : "30";
    return `${hh}:${mm}`;
  });
  
  const minBookableTime = isToday && scheduleType === "later" ? getMinBookableTimeSAST() : null;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* ── Page header ── */}
      <section className="pt-24 pb-8 bg-white relative overflow-hidden border-b border-slate-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23EEF2FF\' fill-opacity=\'1\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-70" />
        <div className="container mx-auto px-6 max-w-5xl relative z-10 text-center">
          <span className="inline-block mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Transport</span>
          <h1 className="text-3xl md:text-4xl font-bold text-[#222222] tracking-tight leading-tight">
            Where would you like to go?
          </h1>
          <p className="mt-2 text-lg text-slate-500 font-normal max-w-2xl mx-auto">Safe, reliable, and convenient city travel across Mzansi.</p>
        </div>
      </section>

      <div className="flex-1 bg-white">
        <div className="container mx-auto px-6 py-8 max-w-5xl">
          {/* Custom Wizard Step Indicators */}
          <div className="relative mb-12 max-w-2xl mx-auto">
            <div className="flex justify-between relative z-10 px-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex flex-col items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-700 border",
                    step >= s ? "bg-[#222222] text-white border-transparent shadow-2xl shadow-slate-200 scale-110" : "bg-white text-slate-300 border-slate-100"
                  )}>
                    {step > s ? <Check className="h-6 w-6" strokeWidth={3} /> : s}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.15em] transition-colors duration-500",
                    step >= s ? "text-[#222222]" : "text-slate-300"
                  )}>
                    {s === 1 ? "Route" : s === 2 ? "Ride" : "Confirm"}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute top-6 left-0 right-0 h-[1px] bg-slate-100 -z-0">
              <motion.div
                initial={false}
                animate={{ width: `${((step - 1) / 2) * 100}%` }}
                className="h-full bg-primary transition-all duration-700"
              />
            </div>
          </div>

          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-50 overflow-hidden relative min-h-[500px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 md:p-8 lg:p-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-10">
                      <div>
                        <button
                          onClick={() => navigate(-1)}
                          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary mb-4 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180"/> Back
                        </button>
                        <h2 className="text-3xl font-bold text-[#222222] mb-4">Select your route</h2>
                        <p className="text-lg text-slate-500 font-normal">Pick-up and drop-off points for your journey.</p>
                      </div>
                      <div className="space-y-6">
                        <div className="relative group">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Pick-up Location</label>
                          <div className="relative">
                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <button
                              type="button"
                              onClick={handleUseCurrentLocation}
                              disabled={isLocating}
                              aria-label="Use current location as pickup"
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all z-10 disabled:opacity-60"
                              title="Use current location"
                            >
                              {isLocating
                                ? <Loader2 className="h-5 w-5 animate-spin" />
                                : <Navigation className="h-5 w-5" />
                              }
                            </button>
                            {isLoaded ? (
                              <Autocomplete
                                onLoad={ref => pickupAutocompleteRef.current = ref}
                                onPlaceChanged={() => {
                                  if (pickupAutocompleteRef.current) {
                                    const place = pickupAutocompleteRef.current.getPlace();
                                    if (place && place.geometry && place.geometry.location) {
                                      const components = place.address_components || [];
                                      const hasStreet = components.some((c: any) => 
                                        c.types.includes("street_number") || c.types.includes("route")
                                    );
                                      if (!hasStreet) {
                                        toast({
                                          variant: "destructive",
                                          title: "Invalid Pickup Location",
                                          description: "Please enter a valid street address. Not just a city or region.",
                                        });
                                        setPickup("");
                                        setPickupCoords(null);
                                        setPickupValid(false);
                                        return;
                                      }
                                      setPickup(place.formatted_address || place.name || "");
                                      setPickupCoords({
                                        lat: place.geometry.location.lat(),
                                        lng: place.geometry.location.lng()
                                      });
                                      setPickupValid(true);
                                    }
                                  }
                                }}
                              >
                                <input
                                  type="text"
                                  value={pickup}
                                  onChange={(e) => {
                                    setPickup(e.target.value);
                                    setPickupValid(false);
                                    setPickupCoords(null);
                                  }}
                                  placeholder="Enter origin address"
                                  className="w-full h-16 pl-16 pr-14 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all"
                                />
                              </Autocomplete>
                            ) : (
                              <input disabled placeholder="Loading maps..." className="w-full h-16 bg-slate-50 rounded-2xl p-4 pl-16 outline-none" />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleUseCurrentLocation}
                            disabled={isLocating}
                            className="mt-3 h-10 px-3 rounded-xl text-sm font-bold text-primary hover:bg-primary/10"
                          >
                            {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
                            Use current location
                          </Button>
                        </div>

                        <div className="relative group">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Drop-off Location</label>
                          <div className="relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            {isLoaded ? (
                              <Autocomplete
                                onLoad={ref => dropoffAutocompleteRef.current = ref}
                                onPlaceChanged={() => {
                                  if (dropoffAutocompleteRef.current) {
                                    const place = dropoffAutocompleteRef.current.getPlace();
                                    if (place && place.geometry && place.geometry.location) {
                                      const components = place.address_components || [];
                                      const hasStreet = components.some((c: any) => c.types.includes("street_number") || c.types.includes("route")
                                      );
                                      if (!hasStreet) {
                                        toast({
                                          variant: "destructive",
                                          title: "Invalid Dropoff Location",
                                          description: "Please enter a valid street address. Not just a city or region.",
                                        });
                                        setDropoff("");
                                        setDropoffCoords(null);
                                        setDropoffValid(false);
                                        return;
                                      }
                                      setDropoff(place.formatted_address || place.name || "");
                                      setDropoffCoords({
                                        lat: place.geometry.location.lat(),
                                        lng: place.geometry.location.lng()
                                      });
                                      setDropoffValid(true);
                                    }
                                  }
                                }}
                              >
                                <input
                                  type="text"
                                  value={dropoff}
                                  onChange={(e) => {
                                    setDropoff(e.target.value);
                                    setDropoffValid(false);
                                    setDropoffCoords(null);
                                  }}
                                  placeholder="Enter destination address"
                                  className="w-full h-16 pl-16 pr-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all"
                                />
                              </Autocomplete>
                            ) : (
                              <input disabled placeholder="Loading maps..." className="w-full h-16 bg-slate-50 rounded-2xl p-4 pl-16 outline-none" />
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full h-16 rounded-2xl bg-[#FF385C] hover:bg-[#D90B3E] text-white font-bold text-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95"
                        onClick={handleSetRoute}
                        disabled={!pickupValid || !dropoffValid || isCalculating}
                      >
                        {isCalculating ? <Loader2 className="animate-spin h-6 w-6" /> : "Find Rides"}
                      </Button>
                    </div>

                    <div className="relative h-[450px] rounded-[3rem] overflow-hidden shadow-sm border border-slate-50">
                      {isLoaded ? (
                        <GoogleMap
                          mapContainerStyle={{ width: "100%", height: "100%" }}
                          center={pickupCoords || SA_CENTER}
                          zoom={pickupCoords ? 14 : 5}
                          options={{ disableDefaultUI: true, styles: mapStyles }}
                          onLoad={onMapLoad}
                        >
                          {pickupCoords && <Marker position={pickupCoords} />}
                          {dropoffCoords && <Marker position={dropoffCoords} />}
                          {nearbyDrivers.map((driver) => (
                            <Marker
                              key={driver.id}
                              position={driver.location}
                              icon={{
                                url: "https://maps.google.com/mapfiles/kml/shapes/library_maps.png", // Generic car-like icon placeholder or custom SVG
                                scaledSize: new google.maps.Size(30, 30),
                              }}
                              title={driver.name}
                            />
                          ))}
                        </GoogleMap>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-50">
                          <Loader2 className="animate-spin h-10 w-10 text-slate-200" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 md:p-12 lg:p-16"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8 space-y-8">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-3xl font-bold text-[#222222]">Select your ride</h2>
                        <Button variant="ghost" onClick={() => setStep(1)} className="text-primary font-bold hover:bg-primary/5 rounded-xl">
                          Change Route
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {VEHICLE_TYPES.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => setSelectedVehicle(v.id)}
                            className={cn(
                              "group cursor-pointer rounded-3xl p-6 border transition-all duration-500",
                              selectedVehicle === v.id
                                ? "bg-[#222222] border-transparent shadow-2xl shadow-slate-300"
                                : "bg-white border-slate-50 hover:border-primary/20 hover:shadow-xl hover:shadow-slate-100"
                            )}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className={cn(
                                "p-3 rounded-2xl transition-colors duration-500",
                                selectedVehicle === v.id ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                              )}>
                                <v.icon className="h-8 w-8" />
                              </div>
                              {selectedVehicle === v.id && <CheckCircle2 className="h-6 w-6 text-primary" />}
                            </div>
                            <h3 className={cn("text-xl font-bold mb-1", selectedVehicle === v.id ? "text-white" : "text-[#222222]")}>
                              {v.name}
                            </h3>
                            <p className={cn("text-sm font-normal mb-1", selectedVehicle === v.id ? "text-slate-400" : "text-slate-500")}>
                              {v.capacity} seats • {v.details}
                            </p>
                            {getDriversForVehicle(nearbyDrivers, v.id).length > 0 ? (
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", selectedVehicle === v.id ? "text-emerald-400" : "text-emerald-600")}>
                                  {getDriversForVehicle(nearbyDrivers, v.id).length} cars nearby • {Math.min(...getDriversForVehicle(nearbyDrivers, v.id).map(d => Math.max(1, Math.round(d.distance_km * 2))))} min away
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="h-2 w-2 rounded-full bg-slate-300" />
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", selectedVehicle === v.id ? "text-slate-500" : "text-slate-400")}>
                                  No cars nearby
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-8 border-t border-slate-50">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Suggested Driver</h3>
                        {selectedVehicle && suggestedDriver ? (
                          <div className="mb-8 rounded-3xl border border-slate-100 bg-slate-50/70 p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Closest match</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-xl font-bold text-[#222222]">{suggestedDriver.first_name || suggestedDriver.name}</h4>
                                  {suggestedDriver.is_verified && (
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                                      Verified driver
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-amber-600">
                                  <Star className="h-4 w-4 fill-current" />
                                  {suggestedDriver.average_rating?.toFixed?.(1) || "New"}{suggestedDriver.reviews_count ? ` (${suggestedDriver.reviews_count} reviews)` : " driver"}
                                </p>
                                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
                                  <PhoneCall className="h-4 w-4 text-primary" />
                                  {suggestedDriver.phone || "Phone number unavailable"}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Approx</p>
                                <p className="text-sm font-bold text-emerald-700">{suggestedDriver.eta_min || Math.max(1, Math.round((suggestedDriver.distance_km || 0) * 2))} min away</p>
                              </div>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Car make</p>
                                <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.make || "Not provided"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Car model</p>
                                <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.model || "Not provided"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">License plate</p>
                                <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.license_plate || "Not provided"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Car color</p>
                                <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.color || "Not provided"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ride category</p>
                                <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.category_label || "Not provided"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Seats</p>
                                <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.seats || "Not provided"}</p>
                              </div>
                            </div>
                          </div>
                        ) : selectedVehicle ? (
                          <div className="mb-8 rounded-3xl border border-slate-100 bg-slate-50/70 p-6">
                            <p className="text-sm font-bold text-slate-500">No matching online drivers nearby for this ride type yet.</p>
                          </div>
                        ) : null}

                        <div className="pt-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Ride Options</h3>
                        <div className="flex flex-wrap gap-4">
                          <Button
                            variant={scheduleType === "now" ? "default" : "outline"}
                            className={cn("h-14 px-8 rounded-2xl font-bold", scheduleType === "now" ? "bg-[#222222]" : "border-slate-100 text-slate-500 hover:bg-slate-50")}
                            onClick={() => setScheduleType("now")}
                          >
                            <Clock className="mr-2 h-5 w-5" /> Ride Now
                          </Button>
                          <Button
                            variant={scheduleType === "later" ? "default" : "outline"}
                            className={cn("h-14 px-8 rounded-2xl font-bold", scheduleType === "later" ? "bg-[#222222]" : "border-slate-100 text-slate-500 hover:bg-slate-50")}
                            onClick={() => {
                              setScheduleType("later");
                              const min = formatLocalDateYYYYMMDD(new Date());
                              setDate((d) => (d < min ? min : d));
                            }}
                          >
                            <Calendar className="mr-2 h-5 w-5" /> Schedule for later
                          </Button>
                        </div>

                        {scheduleType === "later" && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-wrap gap-4">
                            <input
                              type="date"
                              min={minSelectableDate}
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="h-14 px-6 rounded-2xl bg-slate-50 border-none outline-none font-bold text-[#222222]"
                            />
                            <div className="relative">
                              <select
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="h-14 px-6 rounded-2xl bg-slate-50 border-none outline-none font-bold text-[#222222] appearance-none cursor-pointer"
                              >
                                {timeSlots.map((slot) => {
                                  const isDisabled = minBookableTime !== null && slot < minBookableTime;
                                  return (
                                    <option 
                                      key={slot}
                                      value={slot}
                                      disabled={isDisabled}
                                      className={isDisabled ? "text-slate-300" : "text-[#222222]"}
                                    >
                                      {slot}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </motion.div>
                        )}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4">
                      <div className="sticky top-28 bg-white border border-slate-50 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50">
                        <h3 className="text-xl font-bold text-[#222222] mb-6">Trip Summary</h3>
                        <div className="space-y-6 mb-8">
                          <div className="flex gap-4">
                            <div className="h-6 w-6 mt-1 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-[10px]">A</div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Pickup</p>
                              <p className="text-sm font-bold text-[#222222] line-clamp-2">{pickup}</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="h-6 w-6 mt-1 flex items-center justify-center rounded-full bg-rose-100 text-rose-600 font-bold text-[10px]">B</div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Drop-off</p>
                              <p className="text-sm font-bold text-[#222222] line-clamp-2">{dropoff}</p>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-slate-50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Journey</p>
                            <p className="text-sm font-bold text-[#222222]">{distanceKm?.toFixed(1)} km trip</p>
                          </div>
                        </div>

                        {quote ? (
                          <div className="space-y-6 pt-6 border-t border-slate-50">
                            {selectedVehicle && (
                              <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-slate-500">Cars nearby</span>
                                  <span className="text-sm font-bold text-[#222222]">{getDriversForVehicle(nearbyDrivers, selectedVehicle).length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-slate-500">Suggested driver</span>
                                  <span className="text-sm font-bold text-[#222222]">{suggestedDriver?.name || "Waiting for match"}</span>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-500">Estimated Total</span>
                              <span className="text-3xl font-bold text-[#222222]">R{quote.amount.toFixed(2)}</span>
                            </div>
                            <Button
                              className="w-full h-16 rounded-2xl bg-[#FF385C] hover:bg-[#D90B3E] text-white font-bold text-lg shadow-lg shadow-rose-200/50 transition-all font-bold"
                              onClick={() => setStep(3)}
                              disabled={!selectedVehicle}
                            >
                              Review Request
                            </Button>
                          </div>
                        ) : (
                          <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-center">
                            <p className="text-sm font-bold text-slate-400">Select a vehicle to see fare</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 md:p-12 lg:p-16 max-w-2xl mx-auto"
                >
                  <div className="text-center mb-10">
                    <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-[#222222] mb-2">Almost there!</h2>
                    <p className="text-lg text-slate-500 font-normal">Please review your trip details before confirming.</p>
                  </div>

                    <div className="bg-slate-50/50 rounded-3xl p-8 space-y-6 mb-10 text-left border border-slate-50">
                      <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vehicle</p>
                        <p className="font-bold text-[#222222]">{VEHICLE_TYPES.find(v => v.id === selectedVehicle)?.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Schedule</p>
                        <p className="font-bold text-[#222222]">{scheduleType === "now" ? "Immediate" : `${date} ${time}`}</p>
                      </div>
                    </div>
                    {suggestedDriver && (
                      <div className="rounded-3xl border border-slate-100 bg-white p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Assigned preview</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Driver name</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.first_name || suggestedDriver.name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Driver rating</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.average_rating?.toFixed?.(1) || "New"}{suggestedDriver.reviews_count ? ` (${suggestedDriver.reviews_count} reviews)` : ""}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cellphone</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.phone || "Phone number unavailable"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Car make</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.make || "Not provided"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Car model</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.model || "Not provided"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">License plate</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.license_plate || "Not provided"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Car color</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.color || "Not provided"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ride category</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.category_label || "Not provided"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Seats</p>
                            <p className="font-bold text-[#222222]">{suggestedDriver.vehicle?.seats || "Not provided"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Total Quote</span>
                      <span className="text-2xl font-bold text-primary">R{quote?.amount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <Button
                      className="h-16 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg hover:opacity-90 transition-all font-bold"
                      onClick={handleRequestRide}
                      disabled={isRequesting}
                    >
                      {isRequesting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}
                      Confirm & Pay Now
                    </Button>
                    <Button variant="ghost" className="h-14 font-bold text-slate-500 rounded-2xl hover:bg-slate-50" onClick={() => setStep(2)}>
                      Go Back
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default Transport;
