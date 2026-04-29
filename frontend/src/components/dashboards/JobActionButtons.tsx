import { useState } from "react";
import {
    Box,
    Typography,
    Button,
    alpha,
    useTheme,
    Stack,
    CircularProgress,
    Chip
} from "@mui/material";
import {
    NearMe as NavigationIcon,
    CheckCircle as CheckCircleIcon,
    InfoOutlined as InfoIcon,
    Schedule as ClockIcon
} from "@mui/icons-material";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface JobActionButtonsProps {
    job: any;
    role: 'driver' | 'professional' | 'service-provider';
    onStatusUpdate: () => void;
}

export const JobActionButtons = ({ job, role, onStatusUpdate }: JobActionButtonsProps) => {
    const { toast } = useToast();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);

    const handleAction = async (endpoint: string, method: string = 'PATCH') => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/requests/${job.id}/${endpoint}`, {
                method
            });
            if (res.success) {
                toast({ title: "Success", description: res.message || "Status updated." });
                onStatusUpdate();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to update status", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const isCab = job.request_type === 'cab';
    const isProfessional = job.request_type === 'professional';
    const isProvider = job.request_type === 'provider';

    const details = job.details || {};

    // Actions for Driver (Cab)
    if (role === 'driver' && isCab) {
        if (!details.cab_driver_arrived) {
            return (
                <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleAction('cab-driver-arrived')}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <NavigationIcon />}
                    sx={{ fontWeight: 800, borderRadius: 2, bgcolor: '#3B82F6', '&:hover': { bgcolor: '#2563EB' } }}
                >
                    I have Arrived
                </Button>
            );
        }
        if (!details.cab_trip_started) {
            return (
                <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleAction('cab-start-trip')}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <NavigationIcon />}
                    sx={{ fontWeight: 800, borderRadius: 2, bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
                >
                    Start Trip
                </Button>
            );
        }
        if (!details.cab_arrived_at_location) {
            return (
                <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleAction('cab-arrived-at-location')}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                    sx={{ fontWeight: 800, borderRadius: 2, bgcolor: theme.palette.success.main, '&:hover': { bgcolor: theme.palette.success.dark } }}
                >
                    Complete Trip
                </Button>
            );
        }
    }

    // Actions for Professional
    if (role === 'professional' && isProfessional) {
        if (!details.professional_has_arrived && job.status === 'accepted') {
            return (
                <Stack spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <InfoIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                        <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 700, fontStyle: 'italic' }}>
                            Marking this will finalize the service.
                        </Typography>
                    </Stack>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => handleAction('professional-has-arrived')}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                        sx={{ fontWeight: 800, borderRadius: 2, bgcolor: theme.palette.success.main, '&:hover': { bgcolor: theme.palette.success.dark } }}
                    >
                        Complete Job
                    </Button>
                </Stack>
            );
        }
    }

    // Actions for Service Provider
    if (role === 'service-provider' && isProvider) {
        if (!details.provider_has_arrived && job.status === 'accepted') {
            return (
                <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleAction('provider-has-arrived')}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                    sx={{ fontWeight: 800, borderRadius: 2, bgcolor: theme.palette.success.main, '&:hover': { bgcolor: theme.palette.success.dark } }}
                >
                    Complete Job
                </Button>
            );
        }
    }

    if (job.status === 'completed') {
        return (
            <Chip 
                icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                label="Ready for Review" 
                sx={{ 
                    width: '100%', 
                    fontWeight: 800, 
                    borderRadius: 2, 
                    height: 40,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: 'success.dark',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.success.main, 0.2)
                }} 
            />
        );
    }

    return (
        <Box sx={{ 
            width: '100%', 
            p: 1.5, 
            textAlign: 'center', 
            bgcolor: alpha(theme.palette.action.hover, 0.04), 
            borderRadius: 2,
            border: '1px dotted',
            borderColor: 'divider'
        }}>
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ color: 'text.disabled' }}>
                <ClockIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                    Waiting for activity...
                </Typography>
            </Stack>
        </Box>
    );
};

export default JobActionButtons;
