/**
 * PanicAlertsPanel — Admin component
 * File: frontend/src/components/admin/PanicAlertsPanel.tsx
 *
 * Add to admin dashboard under a "Safety Alerts" tab.
 * Uses MUI to match the existing admin UI pattern.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  alpha,
  useTheme,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PanicAlert {
  id: string;
  user: { name: string; email: string; phone: string; role: string } | null;
  booking_id: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "active" | "resolved";
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  admin_email_sent: boolean;
  next_of_kin_email_sent: boolean;
  armed_response_ref: string | null;
  armed_response_status: string | null;
  created_at: string;
}

export const PanicAlertsPanel = () => {
  const theme = useTheme();
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "resolved"
  >("all");

  // Resolve dialog
  const [resolving, setResolving] = useState<PanicAlert | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
        const res = await apiFetch(`/api/emergency/panic/admin${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` }
        });
        if (res.success) {
          const payload = res.message || res.data;
          setAlerts(payload.alerts || []);
          setTotal(payload.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch panic alerts", err);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    fetchAlerts();
    // Auto-refresh every 30s so admin sees new alerts without manual refresh
    const id = window.setInterval(() => fetchAlerts(false), 30000);
    return () => window.clearInterval(id);
  }, [fetchAlerts]);

  const handleResolve = async () => {
    if (!resolving) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(
        `/api/emergency/panic/${resolving.id}/resolve`, {
          method: "PATCH",
          data: { notes: notes.trim() || null },
          headers: { Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` }
        
      });
      if (res.success) {
        toast({
          title: "Alert resolved",
          description: `Alert #${resolving.id.slice(-8)} marked as resolved.`,
        });
        setResolving(null);
        setNotes("");
        fetchAlerts(false);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to resolve alert",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
    <Box>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Safety Alerts
            {activeCount > 0 && (
              <Chip
                label={`${activeCount} active`}
                color="error"
                size="small"
                sx={{
                  ml: 1.5,
                  fontWeight: 800,
                  animation: "pulse 2s infinite",
                }}
              />
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {total} total panic alerts — auto-refreshes every 30s
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {(["all", "active", "resolved"] as const).map((s) => (
            <Chip
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              onClick={() => setStatusFilter(s)}
              color={
                s === "active"
                  ? "error"
                  : s === "resolved"
                    ? "success"
                    : "default"
              }
              variant={statusFilter === s ? "filled" : "outlined"}
              sx={{ fontWeight: 700, cursor: "pointer" }}
            />
          ))}
          <Tooltip title="Refresh">
            <IconButton onClick={() => fetchAlerts()} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : alerts.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 8, textAlign: "center", borderRadius: 4 }}
        >
          <CheckCircleIcon
            sx={{ fontSize: 48, color: "success.light", mb: 2 }}
          />
          <Typography variant="h6" fontWeight={800}>
            No alerts found
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {statusFilter === "active"
              ? "No active panic alerts — all clear."
              : "No alerts match the current filter."}
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 4 }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{ bgcolor: alpha(theme.palette.background.default, 0.8) }}
              >
                <TableCell
                  sx={{
                    fontWeight: 800,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  User
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Time (SAST)
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Location
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Notifications
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow
                  key={alert.id}
                  sx={{
                    bgcolor:
                      alert.status === "active"
                        ? alpha(theme.palette.error.main, 0.03)
                        : "transparent",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                    },
                  }}
                >
                  <TableCell>
                    <Chip
                      label={alert.status}
                      color={alert.status === "active" ? "error" : "success"}
                      size="small"
                      icon={
                        alert.status === "active" ? (
                          <WarningIcon />
                        ) : (
                          <CheckCircleIcon />
                        )
                      }
                      sx={{ fontWeight: 800 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={800}>
                      {alert.user?.name || "Unknown"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.user?.email}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {alert.user?.phone || "No phone"} ·{" "}
                      {(alert.user?.role || "").replace("-", " ")}
                    </Typography>
                    {alert.booking_id && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.disabled"
                      >
                        Booking: …{alert.booking_id.slice(-8)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {formatDate(alert.created_at)}
                    </Typography>
                    {alert.resolved_at && (
                      <Typography variant="caption" color="success.main">
                        Resolved: {formatDate(alert.resolved_at)}
                        {alert.resolved_by ? ` by ${alert.resolved_by}` : ""}
                      </Typography>
                    )}
                    {alert.resolution_notes && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        "{alert.resolution_notes}"
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {alert.latitude && alert.longitude ? (
                      <Tooltip title="Open in Google Maps">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<LocationIcon />}
                          endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                          href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                          target="_blank"
                          rel="noopener"
                          sx={{
                            fontWeight: 700,
                            borderRadius: 2,
                            fontSize: "0.7rem",
                          }}
                        >
                          View Map
                        </Button>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        No GPS
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Chip
                        label={`Admin ${alert.admin_email_sent ? "✓" : "✗"}`}
                        size="small"
                        color={alert.admin_email_sent ? "success" : "warning"}
                        variant="outlined"
                        sx={{
                          fontSize: "0.65rem",
                          height: 20,
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        label={`NOK ${alert.next_of_kin_email_sent ? "✓" : "–"}`}
                        size="small"
                        color={
                          alert.next_of_kin_email_sent ? "success" : "default"
                        }
                        variant="outlined"
                        sx={{
                          fontSize: "0.65rem",
                          height: 20,
                          fontWeight: 700,
                        }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {alert.status === "active" ? (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => {
                          setResolving(alert);
                          setNotes("");
                        }}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Resolve
                      </Button>
                    ) : (
                      <Typography
                        variant="caption"
                        color="success.main"
                        fontWeight={700}
                      >
                        Resolved
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Resolve Dialog */}
      <Dialog
        open={!!resolving}
        onClose={() => !submitting && setResolving(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Resolve Alert</DialogTitle>
        <DialogContent>
          {resolving && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Resolving alert for{" "}
                <strong>{resolving.user?.name || "Unknown user"}</strong>{" "}
                triggered at {formatDate(resolving.created_at)}.
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Resolution notes (optional)"
                placeholder="e.g. Spoke with user, false alarm confirmed."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setResolving(null)}
            disabled={submitting}
            variant="outlined"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={submitting}
            variant="contained"
            color="success"
            sx={{ fontWeight: 800, borderRadius: 2 }}
            startIcon={
              submitting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CheckCircleIcon />
              )
            }
          >
            {submitting ? "Resolving..." : "Mark as Resolved"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PanicAlertsPanel;
