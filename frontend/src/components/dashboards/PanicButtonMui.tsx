/**
 * PanicButtonMui — MUI variant for driver/professional/service-provider dashboards
 * File: frontend/src/components/dashboards/PanicButtonMui.tsx
 *
 * Used in:
 *   - ActiveJobs.tsx  (driver, professional, service-provider dashboards)
 *
 * Uses MUI components to match the existing ActiveJobs.tsx aesthetic.
 */

import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  alpha,
  useTheme,
  Stack,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Phone as PhoneIcon,
  Shield as ShieldIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PanicButtonMuiProps {
  bookingId?: string;
}

const ACTIVE_STAGES = ["driver_assigned", "driver_arrived", "on_trip"];

/** Returns true when the panic button should be visible for this job */
export function shouldShowPanicMui(job: any): boolean {
  if (!job) return false;
  if (job.request_type === "cab") {
    return ACTIVE_STAGES.includes(job.ride_stage ?? job.details?.ride_stage);
  }
  // For professional/service-provider jobs: show when actively in progress
  return job.status === "accepted";
}

export const PanicButtonMui = ({ bookingId }: PanicButtonMuiProps) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [phase, setPhase] = useState<
    "idle" | "confirming" | "submitting" | "confirmed"
  >("idle");
  const [alertData, setAlertData] = useState<{
    lat?: number;
    lng?: number;
  } | null>(null);

  const handleConfirm = async () => {
    setPhase("submitting");

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
      // Continue without GPS
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
        setAlertData({ lat: latitude, lng: longitude });
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

  // ── Confirmed ──────────────────────────────────────────────────────────────
  if (phase === "confirmed") {
    return (
      <Box
        sx={{
          mt: 2,
          p: 2.5,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.error.main, 0.06),
          border: "2px solid",
          borderColor: alpha(theme.palette.error.main, 0.25),
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={2}
          mb={1.5}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: "error.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse 1.5s infinite",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.6 },
                },
              }}
            >
              <ShieldIcon sx={{ color: "white", fontSize: 18 }} />
            </Box>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, color: "error.dark" }}
              >
                Alert sent — help is being notified
              </Typography>
              <Typography variant="caption" sx={{ color: "error.main" }}>
                Stay on the line if possible
              </Typography>
            </Box>
          </Stack>
          <Box
            component="button"
            onClick={() => {
              setPhase("idle");
              setAlertData(null);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              border: "none",
              cursor: "pointer",
              "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.2) },
            }}
          >
            <CloseIcon sx={{ fontSize: 16, color: "error.main" }} />
          </Box>
        </Stack>

        {alertData?.lat && alertData?.lng && (
          <Typography
            variant="caption"
            sx={{
              color: "error.light",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "block",
              mb: 1.5,
            }}
          >
            GPS shared: {alertData.lat.toFixed(5)}, {alertData.lng.toFixed(5)}
          </Typography>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            component="a"
            href="tel:10111"
            variant="contained"
            color="error"
            size="small"
            startIcon={<PhoneIcon />}
            sx={{ flex: 1, fontWeight: 800, borderRadius: 2 }}
          >
            Call 10111
          </Button>
          <Button
            component="a"
            href="tel:112"
            variant="contained"
            color="error"
            size="small"
            startIcon={<PhoneIcon />}
            sx={{ flex: 1, fontWeight: 800, borderRadius: 2 }}
          >
            Call 112
          </Button>
        </Stack>
      </Box>
    );
  }

  // ── Confirming ─────────────────────────────────────────────────────────────
  if (phase === "confirming" || phase === "submitting") {
    return (
      <Box
        sx={{
          mt: 2,
          p: 2.5,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.error.main, 0.06),
          border: "2px solid",
          borderColor: alpha(theme.palette.error.main, 0.3),
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "error.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <WarningIcon sx={{ color: "white", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, color: "error.dark" }}
            >
              Confirm emergency?
            </Typography>
            <Typography variant="caption" sx={{ color: "error.main" }}>
              Admin and your emergency contact will be alerted with your GPS.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={handleConfirm}
            disabled={phase === "submitting"}
            sx={{ flex: 1, fontWeight: 800, borderRadius: 2 }}
            startIcon={
              phase === "submitting" ? (
                <CircularProgress size={14} color="inherit" />
              ) : undefined
            }
          >
            {phase === "submitting" ? "Sending..." : "Yes, Send Alert"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => setPhase("idle")}
            disabled={phase === "submitting"}
            sx={{ flex: 1, fontWeight: 800, borderRadius: 2 }}
          >
            Cancel
          </Button>
        </Stack>
      </Box>
    );
  }

  // ── Idle ───────────────────────────────────────────────────────────────────
  return (
    <Button
      variant="outlined"
      color="error"
      size="small"
      startIcon={<WarningIcon />}
      onClick={() => setPhase("confirming")}
      sx={{
        fontWeight: 800,
        borderRadius: 2,
        mt: 1,
        borderColor: alpha(theme.palette.error.main, 0.3),
        color: "error.main",
        bgcolor: alpha(theme.palette.error.main, 0.04),
        "&:hover": {
          bgcolor: alpha(theme.palette.error.main, 0.1),
          borderColor: "error.main",
        },
      }}
    >
      Emergency Panic
    </Button>
  );
};

export default PanicButtonMui;
