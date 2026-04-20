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
    CircularProgress,
    Stack,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import {
    TrendingUp as TrendingUpIcon,
    AccountBalanceWallet as WalletIcon,
    Group as GroupIcon,
    EmojiEvents as AwardIcon,
    ContentCopy as CopyIcon,
    Share as ShareIcon,
    AttachMoney as MoneyIcon,
    Dashboard as LayoutTemplate,
    People as Users
} from "@mui/icons-material";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { WalletManagement } from "@/components/dashboards/WalletManagement";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AgentDashboard = () => {
    const { toast } = useToast();
    const theme = useTheme();
    const { user: authUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const navItems = [
        { id: "overview", label: "Agent Overview", icon: LayoutTemplate },
        { id: "recruits", label: "My Recruits", icon: Users },
        { id: "wallet", label: "Earnings & Wallet", icon: WalletIcon },
    ];

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/dashboard');
            if (res.success) {
                setData(res.data);
            }
        } catch (err: unknown) {
            toast({ title: "Error", description: "Failed to load agent data.", variant: "destructive" });
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

    const copyAgentCode = () => {
        const code = data?.current_user?.tracking_number;
        if (code) {
            navigator.clipboard.writeText(code);
            toast({ title: "Copied!", description: "Agent code copied to clipboard." });
        }
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
        if (loading && !data) return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );

        switch (activeTab) {
            case "overview":
                return (
                    <Box sx={{ animation: 'fadeIn 0.5s' }}>
                        {/* Referral Card */}
                        <Paper
                            sx={{
                                mb: 4,
                                p: 4,
                                borderRadius: 6,
                                border: '1px solid',
                                borderColor: alpha(theme.palette.primary.main, 0.1),
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, #ffffff 100%)`,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <Box sx={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: '50%', filter: 'blur(40px)' }} />

                            <Grid container spacing={4} alignItems="center">
                                <Grid item xs={12} md={8}>
                                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Your Referral Code</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Share this code with new users to earn rewards instantly.</Typography>

                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                px: 4,
                                                py: 1.5,
                                                bgcolor: 'background.default',
                                                borderRadius: 3,
                                                fontFamily: 'monospace',
                                                fontSize: '1.5rem',
                                                fontWeight: 800,
                                                letterSpacing: 4,
                                                color: 'primary.main'
                                            }}
                                        >
                                            {data?.current_user?.tracking_number || "---"}
                                        </Paper>
                                        <IconButton onClick={copyAgentCode} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, width: 56, height: 56, borderRadius: 3 }}>
                                            <CopyIcon />
                                        </IconButton>
                                        <IconButton sx={{ border: '1px solid', borderColor: 'divider', width: 56, height: 56, borderRadius: 3 }}>
                                            <ShareIcon />
                                        </IconButton>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#121926', color: 'white', position: 'relative', overflow: 'hidden' }}>
                                        <AwardIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Commission Rates</Typography>
                                        <Typography variant="body2" sx={{ color: alpha('#fff', 0.7) }}>
                                            You get up to <Box component="span" sx={{ color: 'white', fontWeight: 800 }}>R30.00</Box> for every professional you recruit.
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Paper>

                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            <Grid item xs={12} md={4}>
                                <StatCard
                                    title="Total Earned"
                                    value={`R${(data?.agent_stats?.total_earned || 0).toFixed(2)}`}
                                    icon={TrendingUpIcon}
                                    color="primary"
                                    loading={loading}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <StatCard
                                    title="Total Recruits"
                                    value={data?.agent_stats?.total_recruits || 0}
                                    icon={GroupIcon}
                                    color="info"
                                    loading={loading}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <StatCard
                                    title="Available Balance"
                                    value={`R${(data?.wallet?.balance || 0).toFixed(2)}`}
                                    icon={WalletIcon}
                                    color="success"
                                    loading={loading}
                                />
                            </Grid>
                        </Grid>

                        <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" fontWeight={800}>Recent Rewards</Typography>
                                <Button size="small" onClick={() => setActiveTab('recruits')}>View All</Button>
                            </Box>
                            <Box sx={{ p: 0 }}>
                                {data?.agent_stats?.recent_commissions?.length > 0 ? (
                                    data.agent_stats.recent_commissions.map((comm: any) => (
                                        <Box key={comm.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                                                    <MoneyIcon fontSize="small" />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700}>{comm.recruited_user_email}</Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                                        {comm.recruited_user_role} • {new Date(comm.created_at).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="subtitle2" fontWeight={700} color="success.main">+ R{comm.amount.toFixed(2)}</Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>Processed</Typography>
                                            </Box>
                                        </Box>
                                    ))
                                ) : (
                                    <Box sx={{ p: 6, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary" fontStyle="italic">No recent commissions found.</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                );
            case "recruits":
                return (
                    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={800}>Full Recruitment History</Typography>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: 'background.default' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Recruited User</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Commission</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data?.agent_stats?.recent_commissions?.map((comm: any) => (
                                        <TableRow key={comm.id} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{comm.recruited_user_email}</TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>{comm.recruited_user_role}</TableCell>
                                            <TableCell>{new Date(comm.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>R {comm.amount.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                );
            case "wallet":
                return <WalletManagement balance={data?.wallet?.balance || 0} transactions={data?.wallet?.transactions || []} role="agent" onWithdrawalRequested={fetchData} />;
            default:
                return null;
        }
    };

    return (
        <DashboardLayout
            title={activeTab === 'overview' ? 'Affiliate HUB' : navItems.find(item => item.id === activeTab)?.label || 'Account Management'}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
            displayName={authUser?.name || "Agent"}
            role="Agent"
            navStructure={navItems.map(item => ({ ...item, type: 'item' }))}
            actions={
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" size="small" onClick={() => setActiveTab("wallet")}>Withdraw</Button>
                    <Button variant="contained" size="small" onClick={() => setActiveTab("recruits")}>View Recruits</Button>
                </Stack>
            }
        >
            {renderContent()}
        </DashboardLayout>
    );
};

export default AgentDashboard;
