import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    Avatar,
    Stack,
    Divider,
    IconButton,
    Chip,
    alpha,
    useTheme,
    Grid,
    Skeleton
} from "@mui/material";
import {
    Person as UserIcon,
    LocationOnOutlined as MapPinIcon,
    AccessTime as ClockIcon,
    ChatBubbleOutline as MessageIcon,
    PhoneOutlined as PhoneIcon,
    Star as StarIcon,
    MoreVert as MoreIcon
} from "@mui/icons-material";
import { JobActionButtons } from "./JobActionButtons";
import { apiFetch } from "@/lib/api";
import { ChatOverlay } from "../ChatOverlay";
import { TripLiveMap } from "@/components/trips/TripLiveMap";

interface ActiveJobsProps {
    jobs: any[];
    role: 'driver' | 'professional' | 'service-provider';
    onStatusUpdate: () => void;
}

export const ActiveJobs = ({ jobs, role, onStatusUpdate }: ActiveJobsProps) => {
    const theme = useTheme();
    const [clientInfos, setClientInfos] = useState<Record<string, any>>({});
    const [chatJob, setChatJob] = useState<{ id: string, name: string } | null>(null);

    const renderLocation = (locationData: any) => {
        if (!locationData) return "Address not specified";
        const loc = locationData.location || locationData.pickup || locationData;
        if (typeof loc === 'string') return loc;
        if (typeof loc === 'object' && loc.address) return loc.address;
        return "Address details available";
    };

    useEffect(() => {
        const fetchInfos = async () => {
            const newInfos = { ...clientInfos };
            for (const job of jobs) {
                if (!newInfos[job.id]) {
                    try {
                        const res = await apiFetch(`/api/requests/${job.id}/client-info`);
                        if (res.success) {
                            newInfos[job.id] = res.data.client;
                        }
                    } catch (err) {
                        console.error("Failed to fetch client info", err);
                    }
                }
            }
            setClientInfos(newInfos);
        };

        if (jobs.length > 0) {
            fetchInfos();
        }
    }, [jobs]);

    if (jobs.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 8, textAlign: 'center', borderRadius: 3, borderColor: alpha(theme.palette.divider, 0.08) }}>
                <ClockIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.2, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>No Active Jobs</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 300, mx: 'auto' }}>
                    Accept a request from your inbox to begin your next service.
                </Typography>
            </Paper>
        );
    }

    return (
        <Stack spacing={3}>
            {jobs.map((job) => {
                const client = clientInfos[job.id];
                const location = renderLocation(job.location_data);
                const showLiveTripMap =
                    role === 'driver' &&
                    job.request_type === 'cab' &&
                    job.details?.cab_trip_started &&
                    !job.details?.cab_arrived_at_location;

                return (
                    <Paper
                        key={job.id}
                        variant="outlined"
                        sx={{
                            borderRadius: 3,
                            overflow: 'hidden',
                            borderColor: alpha(theme.palette.divider, 0.08),
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.2) }
                        }}
                    >                        <Box sx={{ p: 3 }}>
                            {/* Client Header */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar
                                        src={client?.profile_image_url}
                                        sx={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: 'primary.main'
                                        }}
                                    >
                                        <UserIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                            {client?.name || <Skeleton width={120} />}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <StarIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                {client?.average_rating?.toFixed(1) || "New"}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">• {client?.reviews_count || 0} reviews</Typography>
                                        </Stack>
                                    </Box>
                                </Stack>
                                <Stack direction="row" spacing={1}>
                                    <IconButton
                                        onClick={() => setChatJob({ id: job.id, name: client?.name || "Client" })}
                                        sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}
                                    >
                                        <MessageIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton sx={{ bgcolor: alpha(theme.palette.action.hover, 0.04) }}>
                                        <PhoneIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Stack>

                            <Divider sx={{ mb: 3, opacity: 0.5 }} />

                            {/* Job Info Grid */}
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid size={{ xs: 12, md: 7 }}>
                                    <Stack spacing={2}>
                                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                            <MapPinIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.3 }} />
                                            <Box>
                                                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.disabled', letterSpacing: '0.05em' }}>Location</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{location}</Typography>
                                            </Box>
                                        </Stack>
                                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                            <ClockIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.3 }} />
                                            <Box>
                                                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.disabled', letterSpacing: '0.05em' }}>Scheduled Time</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{job.scheduled_time || 'Immediate'}</Typography>
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, md: 5 }} sx={{ textAlign: { md: 'right' } }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.disabled', letterSpacing: '0.05em' }}>Est. Payout</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                                        R {Number(job.payment_amount).toFixed(2)}
                                    </Typography>
                                </Grid>
                            </Grid>

                            {/* Actions Wrapper */}
                            <Box sx={{
                                p: 2,
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05)
                            }}>
                                <JobActionButtons
                                    job={job}
                                    role={role}
                                    onStatusUpdate={onStatusUpdate}
                                />
                            </Box>

                            {showLiveTripMap ? (
                                <TripLiveMap
                                    className="mt-6"
                                    currentLocation={job.driver_current_location}
                                    destination={job.location_data?.dropoff}
                                    currentLabel="Your live location"
                                    destinationLabel="Passenger destination"
                                />
                            ) : null}
                        </Box>
                    </Paper>
                );
            })}

            {chatJob && (
                <ChatOverlay
                    requestId={chatJob.id}
                    recipientName={chatJob.name}
                    isOpen={!!chatJob}
                    onClose={() => setChatJob(null)}
                />
            )}
        </Stack>
    );
};

export default ActiveJobs;
