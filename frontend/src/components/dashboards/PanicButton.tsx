/**
 * PanicButton — shared component
 *
 * Used in:
 *   - MyBookings.tsx          (client, beside Track Ride button)
 *   - BookingDetailsModal.tsx (client, inside modal footer)
 *
 * Shows during active ride stages only: driver_assigned | driver_arrived | on_trip
 * Hides during: searching, no_drivers_available, completed, cancelled
 */

import { useState } from "react";
import { AlertTriangle, Phone, X, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PanicButtonProps {
  bookingId?: string;
  /** Pass variant="compact" for inline use next to other buttons */
  variant?: "default" | "compact";
  className?: string;
}

const ACTIVE_STAGES = ["driver_assigned", "driver_arrived", "on_trip"];

/** Returns true when the panic button should be visible for this request */
export function shouldShowPanic(req: any): boolean {
  if (!req) return false;
  if (req.request_type === "cab") {
    return ACTIVE_STAGES.includes(req.ride_stage);
  }
  // For service jobs: show when status is accepted (job in progress)
  return req.status === "accepted";
}

export const PanicButton = ({
  bookingId,
  variant = "default",
  className,
}: PanicButtonProps) => {
  const { toast } = useToast();
  const [phase, setPhase] = useState<
    "idle" | "confirming" | "submitting" | "confirmed"
  >("idle");
  const [alertData, setAlertData] = useState<{
    alertId: string;
    lat?: number;
    lng?: number;
  } | null>(null);

  const handlePanicPress = () => {
    setPhase("confirming");
  };

  const handleConfirm = async () => {
    setPhase("submitting");

    // Try to get GPS
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 60000,
          }),
      );
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch {
      // GPS unavailable — continue without coords, backend handles it
    }

    try {
      const res = await apiFetch("/api/emergency/panic", {
        method: "POST",
        data: {
          booking_id: bookingId ?? null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
        },
      });

      if (res.success) {
        setAlertData({
          alertId: res.data.alert_id,
          lat: latitude,
          lng: longitude,
        });
        setPhase("confirmed");
        toast({
          title: "Emergency alert sent",
          description: "Admin and your emergency contact have been notified.",
        });
      } else {
        throw new Error(res.message || "Failed to send alert");
      }
    } catch (err: any) {
      toast({
        title: "Could not send alert",
        description: err.message || "Please call 10111 or 112 directly.",
        variant: "destructive",
      });
      setPhase("idle");
    }
  };

  const handleDismiss = () => {
    setPhase("idle");
    setAlertData(null);
  };

  // ── Confirmed state ────────────────────────────────────────────────────────
  if (phase === "confirmed") {
    return (
      <div
        className={cn(
          "rounded-2xl border-2 border-red-200 bg-red-50 p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center shrink-0 animate-pulse">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-red-700 text-sm">
                Alert sent — help is being notified
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                Stay on the line if possible
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="h-7 w-7 flex items-center justify-center rounded-xl bg-red-100 hover:bg-red-200 transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
        {alertData?.lat && alertData?.lng && (
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
            GPS shared: {alertData.lat.toFixed(5)}, {alertData.lng.toFixed(5)}
          </p>
        )}
        <div className="flex gap-2">
          <a
            href="tel:10111"
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors"
          >
            <Phone className="h-4 w-4" /> Call 10111
          </a>
          <a
            href="tel:112"
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors"
          >
            <Phone className="h-4 w-4" /> Call 112
          </a>
        </div>
      </div>
    );
  }

  // ── Confirming dialog ──────────────────────────────────────────────────────
  if (phase === "confirming" || phase === "submitting") {
    return (
      <div
        className={cn(
          "rounded-2xl border-2 border-red-300 bg-red-50 p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-red-700">Confirm emergency?</p>
            <p className="text-xs text-red-500 mt-0.5">
              This will alert admin and your emergency contact with your GPS
              location.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm"
            onClick={handleConfirm}
            disabled={phase === "submitting"}
          >
            {phase === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...
              </>
            ) : (
              "Yes, Send Alert"
            )}
          </Button>
          <Button
            variant="ghost"
            className="flex-1 h-10 rounded-xl bg-white border border-red-200 text-red-500 font-bold text-sm hover:bg-red-50"
            onClick={() => setPhase("idle")}
            disabled={phase === "submitting"}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Idle — trigger button ──────────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        className={cn(
          "h-11 px-5 rounded-2xl text-red-600 bg-red-50 hover:bg-red-100 font-bold border border-red-100",
          className,
        )}
        onClick={handlePanicPress}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Panic
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        "h-11 px-5 rounded-2xl text-red-600 bg-red-50 hover:bg-red-100 font-bold border border-red-100",
        className,
      )}
      onClick={handlePanicPress}
    >
      <AlertTriangle className="h-4 w-4 mr-2" />
      Emergency
    </Button>
  );
};

export default PanicButton;
