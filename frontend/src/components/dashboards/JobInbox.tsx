import { useEffect, useState } from "react";
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
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from "@mui/material";
import {
    AssignmentOutlined as ClipboardIcon,
    LocationOnOutlined as MapPinIcon,
    AccessTime as ClockIcon,
    CalendarMonthOutlined as CalendarIcon,
    ChevronRight as ChevronRightIcon,
    Person as UserIcon,
    Close as CloseIcon
} from "@mui/icons-material";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface Job {
    id: string;
    request_type: string;
    scheduled_date: string;
    scheduled_time: string;
    location_data: any;
    payment_amount: number;
    status: string;
    client_name?: string;
    client_profile_image_url?: string;
    details?: any;
}

interface JobInboxProps {
    jobs: Job[];
    role: 'driver' | 'professional' | 'service-provider';
    onJobAccepted: () => void;
}

export const JobInbox = ({ jobs, role, onJobAccepted }: JobInboxProps) => {
    const { toast } = useToast();
    const theme = useTheme();
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [quotingJob, setQuotingJob] = useState<Job | null>(null);
    const [quoteAmount, setQuoteAmount] = useState<string>("");
    const [isQuoting, setIsQuoting] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const hasCabOffers = role === 'driver' && jobs.some((job) => job.request_type === 'cab');
        if (!hasCabOffers) return;

        const timerId = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timerId);
    }, [jobs, role]);

    const handleAccept = async (jobId: string) => {
        setAcceptingId(jobId);
        try {
            const res = await apiFetch(`/api/requests/${jobId}/accept`, {
                method: 'POST'
            });

            if (res.success) {
                toast({ title: "Job Accepted", description: "The job has been assigned to you." });
                onJobAccepted();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to accept job", variant: "destructive" });
        } finally {
            setAcceptingId(null);
        }
    };

    const handleReject = async (jobId: string) => {
        setRejectingId(jobId);
        try {
            const res = await apiFetch(`/api/requests/${jobId}/reject`, {
                method: 'POST'
            });

            if (res.success) {
                if (role === 'driver') {
                    toast({ title: "Ride Declined", description: "The next nearby driver will be notified." });
                    onJobAccepted();
                } else {
                    toast({ title: "Job Rejected", description: "The booking request was rejected successfully." });
                }
                onJobAccepted();
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to reject job", variant: "destructive" });
        } finally {
            setRejectingId(null);
        }
    };
    
    const handleSubmitQuote = async () => {
        if (!quotingJob || !quoteAmount) return;
        setIsQuoting(true);
        try {
            const res = await apiFetch(`/api/requests/${quotingJob.id}/quote`, {
                method: 'POST',
                body: JSON.stringify({ quote_amount: parseFloat(quoteAmount) })
            });
            
            if (res.success) {
                // After quoting, we also "Accept" it to move it to active jobs
                await handleAccept(quotingJob.id);
                setQuotingJob(null);
                setQuoteAmount("");
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to submit quote", variant: "destructive" });
        } finally {
            setIsQuoting(false);
        }
    };
    
    const getJobTitle = (job: Job) => {
        if (job.request_type === 'cab') return "Transport Request";
        if (job.request_type === 'professional') return job.details?.service_name || "Professional Service";
        return job.details?.service_name || "General Service";
    };
    
    const renderLocation = (locationData: any) => {
        if (!locationData) return "Address not specified";
        const loc = locationData.location || locationData.pickup || locationData;
        if (typeof loc === 'string') return loc;
        if (typeof loc === 'object' && loc.address) return loc.address;
        return "Address details available";
    };

    const getOfferSecondsRemaining = (job: Job) => {
        const expiresAtValue = job.details?.dispatch_expires_at;
        if (!expiresAtValue) return null;

        const expiresAt = new Date(expiresAtValue).getTime();
        const secondsRemaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
        return Number.isFinite(secondsRemaining) ? secondsRemaining : null;
    };

    return (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(theme.palette.divider, 0.08) }}>
            <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.5), borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.08), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 40, height: 40, borderRadius: 2 }}>
                        <ClipboardIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Available Jobs</Typography>
                </Stack>
                <Chip
                    label={`${jobs.length} New`}
                    size="small"
                    sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'white' }}
                />
            </Box>

            <Box>
                {jobs.length > 0 ? (
                    jobs.map((job, index) => (
                        <Box
                            key={job.id}
                            sx={{
                                p: 3,
                                borderBottom: index === jobs.length - 1 ? 'none' : '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                transition: 'background 0.2s',
                                '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.02) }
                            }}
                        >
                            <Grid container spacing={3} alignItems="center">
                                <Grid size={{ xs: 12, md: 7 }}>
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main', fontWeight: 800, borderRadius: 2 }}>
                                            {job.client_name?.charAt(0) || <UserIcon />}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>{getJobTitle(job)}</Typography>
                                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
                                                    <CalendarIcon sx={{ fontSize: 14 }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{new Date(job.scheduled_date).toLocaleDateString()}</Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
                                                    <ClockIcon sx={{ fontSize: 14 }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{job.scheduled_time}</Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
                                                    <MapPinIcon sx={{ fontSize: 14 }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                        {renderLocation(job.location_data)}
                                                    </Typography>
                                                </Stack>
                                                {job.request_type === 'cab' && role === 'driver' && getOfferSecondsRemaining(job) !== null && (
                                                    <Chip
                                                        size="small"
                                                        color={getOfferSecondsRemaining(job)! <= 10 ? "warning" : "info"}
                                                        label={`Offer expires in ${getOfferSecondsRemaining(job)}s`}
                                                        sx={{ fontWeight: 800 }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, md: 5 }}>
                                    <Stack direction={{ xs: 'row', md: 'row' }} spacing={3} justifyContent={{ xs: 'space-between', md: 'flex-end' }} alignItems="center">
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main', lineHeight: 1 }}>
                                                {job.details?.is_rfq ? "TBD" : `R ${Number(job.payment_amount).toFixed(2)}`}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {job.details?.is_rfq ? "Request for Quote" : "Potential"}
                                            </Typography>
                                        </Box>
                                        {job.details?.is_rfq ? (
                                            <Button
                                                variant="outlined"
                                                onClick={() => setQuotingJob(job)}
                                                sx={{ fontWeight: 800, borderRadius: 2, px: 3 }}
                                            >
                                                Submit Quote
                                            </Button>
                                        ) : (
                                            <Stack direction="row" spacing={1.5}>
                                                <Button
                                                    variant="outlined"
                                                    disabled={rejectingId === job.id || acceptingId === job.id}
                                                    onClick={() => handleReject(job.id)}
                                                    sx={{ fontWeight: 800, borderRadius: 2, px: 2.5 }}
                                                >
                                                    {rejectingId === job.id ? <CircularProgress size={18} color="inherit" /> : <CloseIcon sx={{ fontSize: 18, mr: 0.5 }} />}
                                                    Reject
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    disabled={acceptingId === job.id || rejectingId === job.id}
                                                    onClick={() => handleAccept(job.id)}
                                                    sx={{
                                                        fontWeight: 800,
                                                        borderRadius: 2,
                                                        px: 3,
                                                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
                                                    }}
                                                >
                                                    {acceptingId === job.id ? <CircularProgress size={20} color="inherit" /> : "Accept Job"}
                                                </Button>
                                            </Stack>
                                        )}
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>
                    ))
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <ClipboardIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.2, mb: 2 }} />
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>Service queue is currently empty.</Typography>
                        <Typography variant="caption" color="text.disabled">New requests will appear here in real-time.</Typography>
                    </Box>
                )}
            </Box>

            <Dialog
                open={!!quotingJob}
                onClose={() => setQuotingJob(null)}
                PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 400, width: '100%' } }}
            >
                <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Submit Your Quote</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
                        Provide your estimated price for this custom service request:
                        <Typography component="span" variant="body2" sx={{ fontWeight: 800, color: 'text.primary', ml: 0.5 }}>
                            {quotingJob ? getJobTitle(quotingJob) : ""}
                        </Typography>
                    </Typography>

                    <TextField
                        fullWidth
                        label="Quote Amount"
                        type="number"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                        slotProps={{
                            input: {
                                startAdornment: <Typography sx={{ mr: 1, fontWeight: 800 }}>R</Typography>,
                                sx: { fontWeight: 900, fontSize: '1.25rem', borderRadius: 3 }
                            }
                        } as any}
                    />

                    <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block', fontWeight: 600 }}>
                        * This price will be sent to the client for approval.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    <Button onClick={() => setQuotingJob(null)} sx={{ fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitQuote}
                        disabled={!quoteAmount || isQuoting}
                        sx={{ fontWeight: 800, borderRadius: 2, px: 4 }}
                    >
                        {isQuoting ? <CircularProgress size={20} color="inherit" /> : "Send Quote"}
                    </Button>
                </DialogActions>
            </Dialog>

            {jobs.length > 0 && (
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.default, 0.3), textAlign: 'center', borderTop: '1px solid', borderColor: alpha(theme.palette.divider, 0.05) }}>
                    <Button
                        size="small"
                        endIcon={<ChevronRightIcon />}
                        sx={{ fontWeight: 700, color: 'text.secondary' }}
                    >
                        Explore All Available
                    </Button>
                </Box>
            )}
        </Paper>
    );
};

export default JobInbox;
