import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Grid,
    Typography,
    Paper,
    Avatar,
    Button,
    alpha,
    useTheme,
    Chip,
    CircularProgress,
    Stack
} from "@mui/material"; import {
    TrendingUp as TrendingUpIcon,
    AccountBalanceWallet as WalletIcon,
    CheckCircle as CheckCircleIcon,
    DirectionsCar as CarIcon,
    Star as StarIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Dashboard as LayoutTemplate,
    AccessTime as Clock,
    Assignment as ClipboardList,
    ForumOutlined as ChatIcon,
    Settings as SettingsIcon
} from "@mui/icons-material";
import { MessagesInbox } from "@/components/dashboards/MessagesInbox";
import { ProfileSettings } from "@/components/dashboards/ProfileSettings";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ActiveJobs } from "@/components/dashboards/ActiveJobs";
import { RatingModal } from "@/components/dashboards/RatingModal";
import { JobInbox } from "@/components/dashboards/JobInbox";
import { WalletManagement } from "@/components/dashboards/WalletManagement";
import { VehicleManagement } from "@/components/dashboards/VehicleManagement";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const DriverDashboard = () => {
    const { toast } = useToast();
    const theme = useTheme();
    const { user: authUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedJobForRating, setSelectedJobForRating] = useState<{ id: string, client_name?: string } | null>(null);

    const navItems = [
        { id: "overview", label: "Overview", icon: LayoutTemplate },
        { id: "active", label: "Active Rides", icon: Clock },
        { id: "rides", label: "Available Rides", icon: ClipboardList },
        { id: "messages", label: "Messages", icon: ChatIcon },
        { id: "reviews", label: "Reviews & Feedback", icon: StarIcon },
        { id: "vehicles", label: "My Vehicles", icon: CarIcon },
        { id: "wallet", label: "Wallet & Earnings", icon: WalletIcon },
        { id: "profile", label: "My Profile", icon: SettingsIcon },
    ];

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/dashboard');
            if (res.success) {
                setData(res.data);
            }
        } catch (err: unknown) {
            toast({ title: "Error", description: "Failed to load dashboard data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleLogout = () => {
        logout();
        toast({ title: "Logged Out", description: "You have securely logged out." });
    };

    const StatCard = ({ title, value, icon: Icon, color, loading }: any) => (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                height: '100%',
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.04)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
                transition: 'all 0.3s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${alpha(theme.palette[color].main, 0.15)}`
                }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: `${color}.main`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</Typography>
                <Avatar variant="rounded" sx={{ bgcolor: alpha(theme.palette[color].main, 0.1), color: `${color}.main`, width: 44, height: 44 }}><Icon /></Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
                {loading ? <CircularProgress size={24} /> : value}
            </Typography>
        </Paper>
    );

    const renderContent = () => {
        const user = data?.current_user;
        const onboardingBanner = user && (!user.is_approved || !user.is_paid) ? (
            <Paper
                sx={{
                    mb: 4,
                    p: 3,
                    borderRadius: 4,
                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.warning.main, 0.2)
                }}
            >
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <WarningIcon sx={{ color: 'warning.main' }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.dark', mb: 1 }}>Your account is pending approval</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Complete these steps to start accepting rides:</Typography>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {user.is_paid ? <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> : <InfoIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                                <Typography variant="caption" sx={{ color: user.is_paid ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                                    {user.is_paid ? "Registration payment received" : "Complete your Yoco registration payment"}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {user.id_verification_status === 'verified' ? <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} /> : <InfoIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                                <Typography variant="caption" sx={{ color: user.id_verification_status === 'verified' ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                                    {user.id_verification_status === 'verified' ? "Documents verified" : "Upload your driver's license and vehicle registration"}
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                </Box>
            </Paper>
        ) : null;

        if (loading && !data) return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );

        switch (activeTab) {
            case "overview":
                return (
                    <Box sx={{ animation: 'fadeIn 0.5s' }}>
                        {onboardingBanner}
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    title="Ride Earnings"
                                    value={`R${(data?.driver_earnings || 0).toFixed(2)}`}
                                    icon={TrendingUpIcon}
                                    color="primary"
                                    loading={loading}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    title="Wallet Balance"
                                    value={`R${(data?.wallet?.balance || 0).toFixed(2)}`}
                                    icon={WalletIcon}
                                    color="info"
                                    loading={loading}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    title="Completed Rides"
                                    value={data?.recent_rides?.length || 0}
                                    icon={CheckCircleIcon}
                                    color="success"
                                    loading={loading}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <StatCard
                                    title="Available Rides"
                                    value={data?.available_cab_requests?.length || 0}
                                    icon={CarIcon}
                                    color="secondary"
                                    loading={loading}
                                />
                            </Grid>
                        </Grid>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, lg: 7 }}>
                                <Stack spacing={3}>
                                    {(data?.active_rides?.length > 0) && (
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Ongoing Ride</Typography>
                                            <ActiveJobs
                                                jobs={data.active_rides}
                                                role="driver"
                                                onStatusUpdate={fetchData}
                                            />
                                        </Box>
                                    )}
                                    <Box>
                                        <JobInbox
                                            jobs={data?.available_cab_requests || []}
                                            role="driver"
                                            onJobAccepted={fetchData}
                                        />
                                    </Box>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, lg: 5 }}>
                                <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                                    <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="h6" fontWeight={800}>Recent Activity</Typography>
                                        <Button size="small" onClick={() => setActiveTab('wallet')}>View All</Button>
                                    </Box>
                                    <Box sx={{ p: 0 }}>
                                        {data?.recent_rides?.length > 0 ? (
                                            data.recent_rides.map((ride: any) => (
                                                <Box key={ride.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                                                            <StarIcon fontSize="small" />
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle2" fontWeight={700}>{ride.pickup_address?.split(',')[0] || 'Ride'}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{new Date(ride.created_at).toLocaleDateString()}</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography variant="subtitle2" fontWeight={700} color="primary.main">R{ride.payment_amount?.toFixed(2)}</Typography>
                                                        <Chip label="Completed" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                                                    </Box>
                                                </Box>
                                            ))
                                        ) : (
                                            <Box sx={{ p: 6, textAlign: 'center' }}>
                                                <Typography variant="body2" color="text.secondary" fontStyle="italic">No recent activity found.</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                );
            case "active":
                return <ActiveJobs jobs={data?.active_rides || []} role="driver" onStatusUpdate={fetchData} />;
            case "rides":
                return <JobInbox jobs={data?.available_cab_requests || []} role="driver" onJobAccepted={fetchData} />;
            case "reviews":
                return (
                    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={800}>Reviews & Feedback</Typography>
                        </Box>
                        <Box sx={{ p: 0 }}>
                            {data?.recent_rides?.filter((r: any) => r.has_driver_rating).length > 0 ? (
                                data.recent_rides.filter((r: any) => r.has_driver_rating).map((ride: any) => (
                                    <Box key={ride.id} sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Stack direction="row" spacing={0.5}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <StarIcon key={star} sx={{ fontSize: 16, color: star <= (ride.details?.driver_rating || 0) ? 'warning.main' : 'divider' }} />
                                                ))}
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary">{new Date(ride.created_at).toLocaleDateString()}</Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1 }}>
                                            "{ride.details?.driver_review || "No comments provided."}"
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>
                                            Trip: {ride.pickup_address?.split(',')[0]} → {ride.dropoff_address?.split(',')[0]}
                                        </Typography>
                                    </Box>
                                ))
                            ) : (
                                <Box sx={{ p: 6, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary" fontStyle="italic">No reviews yet.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                );
            case "vehicles":
                return <VehicleManagement initialVehicles={data?.driver_services || []} />;
            case "messages":
                return (
                    <Box sx={{ animation: 'fadeIn 0.5s' }}>
                        <MessagesInbox />
                    </Box>
                );
            case "profile":
                return (
                    <Box sx={{ animation: 'fadeIn 0.5s', textAlign: 'center', py: 10 }}>
                        <Typography variant="h5" fontWeight={700} mb={2}>Profile Management</Typography>
                        <Typography variant="body1" color="text.secondary" mb={4}>Manage your personal information, documents, and availability in the unified profile center.</Typography>
                        <Button variant="contained" size="large" onClick={() => window.location.href = '/profile'}>
                            Go to Profile Page
                        </Button>
                    </Box>
                );
            case "wallet":
                return <WalletManagement balance={data?.wallet?.balance || 0} transactions={data?.wallet?.transactions || []} role="driver" onWithdrawalRequested={fetchData} />;
            default:
                return null;
        }
    };

    return (
        <DashboardLayout
            title={activeTab === 'overview' ? 'Driver Console' : navItems.find(item => item.id === activeTab)?.label || 'Account Management'}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
            displayName={authUser?.name || "Driver"}
            role="Driver"
            navStructure={navItems.map(item => ({ ...item, type: 'item' }))}
            actions={
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" size="small" onClick={() => setActiveTab("wallet")}>Withdraw</Button>
                    <Button variant="contained" size="small" onClick={() => setActiveTab("rides")}>Find Rides</Button>
                </Stack>
            }
        >
            {renderContent()}

            <RatingModal
                isOpen={!!selectedJobForRating}
                onClose={() => setSelectedJobForRating(null)}
                jobId={selectedJobForRating?.id}
                clientName={selectedJobForRating?.client_name || "Client"}
                onSuccess={fetchData}
            />
        </DashboardLayout>
    );
};

export default DriverDashboard;
