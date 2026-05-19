import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Calendar, MapPin, Clock, CreditCard,
    Package, ShoppingBag, Car, Wrench,
    User, CheckCircle2, ChevronRight,
    ArrowRight, Info, ShieldCheck, Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import { TripLiveMap } from "@/components/trips/TripLiveMap";
import {
    formatShipmentStatus,
    getDeliveryEtaLabel,
    getDeliveryServiceLabel,
    getTrackingSummary,
} from "@/lib/shipping";
import { formatUTCtoSAST, formatSASTDate, formatSASTTime } from "@/lib/dateUtils";

interface BookingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    type: 'service' | 'ride' | 'order';
}

export const BookingDetailsModal = ({ isOpen, onClose, data, type }: BookingDetailsModalProps) => {
    if (!data) return null;

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return "bg-blue-50 text-blue-500 border-blue-100";
            case 'accepted': return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case 'completed': case 'paid': case 'delivered': return "bg-slate-50 text-slate-500 border-slate-100";
            case 'cancelled': case 'failed': return "bg-rose-50 text-rose-500 border-rose-100";
            default: return "bg-amber-50 text-amber-600 border-amber-100";
        }
    };

    const safeLocation = (req: any) => {
        const loc = req.location_data?.location || req.location_data?.pickup;
        if (!loc) return "Address detailed in request";
        if (typeof loc === "object") return loc.address || "Address detailed in request";
        return loc;
    };

    const getIcon = () => {
        if (type === 'ride') return <Car className="h-6 w-6" />;
        if (type === 'order') return <ShoppingBag className="h-6 w-6" />;
        return <Wrench className="h-6 w-6" />;
    };

    const getTitle = () => {
        if (type === 'ride') return "Ride Details";
        if (type === 'order') return "Order Summary";
        return data.details?.service_name || "Service Details";
    };

    const getRideStageLabel = () => {
        if (type !== 'ride') return null;
        switch (data.ride_stage) {
            case 'completed': return 'Completed';
            case 'on_trip': return 'On Trip';
            case 'driver_arrived': return 'Driver Arrived';
            case 'driver_assigned': return 'Driver En Route';
            case 'no_drivers_available': return 'Waiting for Drivers';
            case 'searching': return 'Finding Driver';
            case 'awaiting_payment': return 'Awaiting Payment';
            default: return data.status;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl my-auto"
                    >
                        {/* Header */}
                        <div className="relative p-8 sm:p-10 border-b border-slate-50">
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 h-12 w-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                            >
                                <X className="h-6 w-6 text-slate-400" />
                            </button>

                            <div className="flex items-center gap-4 mb-4">
                                <div className={cn(
                                    "h-12 w-12 rounded-xl flex items-center justify-center shadow-inner",
                                    type === 'ride' ? "bg-blue-50 text-blue-500" :
                                        type === 'order' ? "bg-primary/5 text-primary" : "bg-primary/5 text-primary"
                                )}>
                                    {getIcon()}
                                </div>
                                <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusColor(data.status))}>
                                    {type === 'ride' ? getRideStageLabel() : data.status}
                                </div>
                            </div>

                            <h2 className="text-3xl font-bold text-[#222222] tracking-tight">{getTitle()}</h2>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">
                                ID: {data.id.toUpperCase()}
                            </p>
                        </div>

                        <div className="p-8 sm:p-10 max-h-[60vh] overflow-y-auto space-y-10 custom-scrollbar">

                            {/* Service Banner Image */}
                            {data.service_image_url && type !== 'order' && (
                                <div className="w-full h-48 rounded-[2rem] overflow-hidden -mt-4 border border-slate-100 shadow-sm relative">
                                    <img
                                        src={getImageUrl(data.service_image_url)}
                                        alt="Service"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                </div>
                            )}

                            {/* Main Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                {/* Date & Time */}
                                {type !== 'order' && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={12} /> Schedule
                                        </p>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="font-bold text-[#222222]">
                                                {formatUTCtoSAST(data.scheduled_date, data.scheduled_time)}
                                            </p>  
                                        </div>
                                    </div>
                                )}

                                {/* For Orders: Placed At */}
                                {type === 'order' && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={12} /> Ordered On
                                        </p>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="font-bold text-[#222222]">
                                                {formatSASTDate(data.placed_at)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Amount / Price */}
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <CreditCard size={12} /> Total Amount
                                    </p>
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                        <p className="text-2xl font-black text-primary">
                                            R{(data.total || data.payment_amount || data.quote_amount || 0).toFixed(2)}
                                        </p>
                                        <p className={cn("text-[10px] font-black uppercase mt-1", data.payment_status === 'paid' ? 'text-emerald-500' : 'text-amber-500')}>
                                            {data.payment_status?.toUpperCase() || data.status?.toUpperCase()}
                                        </p>
                                    </div>
                                </div>

                                {type === 'order' && (data.shipping?.quote || data.shipping?.shipment_status || data.shipping?.tracking_reference) && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Truck size={12} /> Delivery Tracking
                                        </p>
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <div className="grid gap-4 sm:grid-cols-3">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 mb-1">Service</p>
                                                    <p className="font-bold text-emerald-950">{getDeliveryServiceLabel(data.shipping)}</p>
                                                    {getDeliveryEtaLabel(data.shipping) ? (
                                                        <p className="mt-1 text-xs font-medium text-emerald-700">{getDeliveryEtaLabel(data.shipping)}</p>
                                                    ) : null}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 mb-1">Shipment Status</p>
                                                    <p className="font-bold capitalize text-emerald-950">{formatShipmentStatus(data.shipping?.shipment_status)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 mb-1">Tracking Ref</p>
                                                    <p className="font-bold text-emerald-950">{getTrackingSummary(data.shipping)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {type === 'ride' && (
                                    <>
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Car size={12} /> Ride Type
                                            </p>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="font-bold text-[#222222] capitalize">
                                                    {String(data.details?.car_type || data.driver_vehicle?.car_type || data.details?.selected_driver?.car_type || 'standard').replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <ArrowRight size={12} /> Distance
                                            </p>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="font-bold text-[#222222]">
                                                    {data.distance_km ? `${Number(data.distance_km).toFixed(1)} km` : 'Not available'}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Partners / Professional */}
                            {type !== 'order' && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Provider</p>
                                    <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                        <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 overflow-hidden border border-slate-100">
                                            {data.provider_profile_image_url || data.driver_profile_image_url ? (
                                                <img src={getImageUrl(data.provider_profile_image_url || data.driver_profile_image_url)} alt="Provider" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#222222]">
                                                {data.driver_name || data.details?.provider_name || data.details?.professional_name || "Pending Assignment"}
                                            </p>
                                            <p className="text-xs text-slate-500">Verified ads Partner</p>
                                            {type === 'ride' && data.driver_phone && (
                                                <p className="text-xs text-slate-400 mt-1">{data.driver_phone}</p>
                                            )}
                                        </div>
                                        {data.provider_id && (
                                            <div className="ml-auto">
                                                <ShieldCheck className="text-emerald-500 h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Logistics / Locations */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {type === 'ride' ? 'Route Details' : 'Location / Shipping'}
                                </p>
                                <div className="space-y-3">
                                    {/* Pickup / General Location */}
                                    <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                        <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                                                {type === 'ride' ? 'Pickup' : type === 'order' ? 'Shipping Address' : 'Service Location'}
                                            </p>
                                            <p className="font-bold text-[#222222]">
                                                {type === 'order' ? (data.shipping?.delivery_address || "Default Address") : safeLocation(data)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dropoff (Rides only) */}
                                    {type === 'ride' && data.location_data?.dropoff && (
                                        <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                            <div className="h-5 w-5 text-rose-500 shrink-0 mt-0.5 flex items-center justify-center">
                                                <div className="h-2 w-2 rounded-full bg-rose-500 shadow-lg shadow-rose-200" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Dropoff</p>
                                                <p className="font-bold text-[#222222]">
                                                    {typeof data.location_data.dropoff === 'object'
                                                        ? data.location_data.dropoff.address
                                                        : data.location_data.dropoff}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {type === 'ride' && data.driver_current_location?.updated_at && (
                                        <div className="flex items-start gap-4 p-5 bg-blue-50 rounded-3xl border border-blue-100">
                                            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Driver Tracking</p>
                                                <p className="font-bold text-[#222222]">
                                                    {data.ride_stage === 'driver_assigned'
                                                        ? 'Your driver is on the way.'
                                                        : data.ride_stage === 'driver_arrived'
                                                            ? 'Your driver has arrived at pickup.'
                                                            : data.ride_stage === 'on_trip'
                                                                ? 'Trip is currently in progress.'
                                                                : 'Latest driver location update received.'}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Last location sync: {formatSASTTime(data.driver_current_location.updated_at)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {type === 'ride' && data.ride_stage === 'on_trip' && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Trip Map</p>
                                    <TripLiveMap
                                        currentLocation={data.driver_current_location}
                                        destination={data.location_data?.dropoff}
                                        currentLabel="Driver live location"
                                        destinationLabel="Trip destination"
                                    />
                                </div>
                            )}

                            {/* Items Section (Orders only) */}
                            {type === 'order' && data.items && data.items.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ordered Items ({data.items.length})</p>
                                    </div>
                                    <div className="space-y-3">
                                        {data.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-slate-50 rounded-2xl group hover:border-primary/20 transition-all shadow-sm">
                                                <div className="h-16 w-16 rounded-xl bg-slate-50 overflow-hidden shrink-0">
                                                    {item.image_url ? (
                                                        <img
                                                            src={getImageUrl(item.image_url)}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-50">
                                                            <Package size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[#222222] truncate">{item.product_name || "Unnamed Product"}</p>
                                                    <p className="text-xs text-slate-400 mt-1">Quantity: <span className="text-[#222222] font-bold">{item.quantity}</span></p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-900">R{((item.price || 0) * item.quantity).toFixed(2)}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">R{(item.price || 0).toFixed(2)} ea</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description / Additional Notes */}
                            {(data.details?.notes || data.details?.description) && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Additional Notes</p>
                                    <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 text-sm italic text-slate-600 leading-relaxed font-medium">
                                        "{data.details?.notes || data.details?.description}"
                                    </div>
                                </div>
                            )}

                            {type === 'ride' && (data.cancellation_charge > 0 || data.details?.cancellation_reason) && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cancellation Details</p>
                                    <div className="p-6 bg-rose-50/60 rounded-3xl border border-rose-100 text-sm text-rose-700 leading-relaxed font-medium">
                                        {data.details?.cancellation_reason && (
                                            <p className="mb-2"><span className="font-bold">Reason:</span> {data.details.cancellation_reason}</p>
                                        )}
                                        <p><span className="font-bold">Cancellation charge:</span> R{(data.cancellation_charge || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Tip / Warning */}
                            {data.status === 'pending' && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                                    <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                        This request is currently pending. Please stay tuned for updates from our partners.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-8 sm:p-10 bg-slate-50/50 flex gap-4">
                            <Button
                                variant="outline"
                                className="flex-1 h-14 rounded-2xl font-bold border-slate-200"
                                onClick={onClose}
                            >
                                Close
                            </Button>
                            {type === 'order' && data.status === 'pending' && (
                                <Button
                                    className="flex-1 h-14 rounded-2xl font-bold bg-primary text-white"
                                    onClick={() => window.location.href = `/checkout?order_id=${data.id}`}
                                >
                                    Proceed to Payment
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
