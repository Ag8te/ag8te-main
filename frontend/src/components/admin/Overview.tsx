import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  Avatar,
  Paper,
  Skeleton,
  alpha,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Divider
} from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  PeopleAltOutlined as UsersIcon,
  AssignmentOutlined as RequestIcon,
  NewReleasesOutlined as ReportIcon,
  ForumOutlined as ChatIcon,
  TrendingUp as TrendUpIcon,
  Sync as RefreshIcon,
  LocalMallOutlined as OrderIcon,
  ArrowForward as ArrowForwardIcon,
  LayersOutlined as PortfolioIcon,
  AccountBalanceWalletOutlined as RevenueIcon,
  CheckCircleOutlined as SuccessIcon,
  ShowChart as ChartIcon,
  LocalTaxiOutlined as RideIcon
} from '@mui/icons-material';

interface OverviewProps {
  stats: any;
  recentOrders: any[];
  recentRequests: any[];
  loading: boolean;
  onRefresh: () => void;
}

const Overview: React.FC<OverviewProps> = ({
  stats,
  recentOrders,
  recentRequests,
  loading,
  onRefresh
}) => {
  const theme = useTheme();

  // Metric Card - Premium Modern Style
  const MetricCard: React.FC<{
    label: string;
    value: React.ReactNode;
    caption: string;
    icon: React.ElementType;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' | string;
    trend?: string;
  }> = ({ label, value, caption, icon: Icon, color, trend }) => {
    const isMuiColor = ['primary', 'secondary', 'success', 'warning', 'info', 'error'].includes(color);
    const mainColor = isMuiColor ? (theme.palette as any)[color].main : color;

    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          height: '100%',
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          background: `linear-gradient(135deg, ${alpha(mainColor, 0.04)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 24px ${alpha(mainColor, 0.12)}`,
            borderColor: alpha(mainColor, 0.2)
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: `radial-gradient(circle at top right, ${alpha(mainColor, 0.08)}, transparent 70%)`,
            pointerEvents: 'none'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
            {label}
          </Typography>
          <Avatar variant="rounded" sx={{ bgcolor: alpha(mainColor, 0.1), color: mainColor, width: 44, height: 44 }}>
            <Icon />
          </Avatar>
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
            {loading ? <Skeleton width={80} /> : value}
          </Typography>
          {trend && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: 'success.main',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                <TrendUpIcon sx={{ fontSize: 14, mr: 0.5 }} />
                {trend}
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>vs last week</Typography>
            </Stack>
          )}
        </Box>

        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500, display: 'block', mt: 'auto' }}>
          {caption}
        </Typography>
      </Paper>
    );
  };

  return (
    <Box sx={{ width: '100%', animation: 'fadeIn 0.4s ease-out' }}>
      {/* Top Navigation / Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
            Operational Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Real-time platform metrics and system-wide activity monitoring.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          onClick={onRefresh}
          startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
          sx={{
            fontWeight: 800,
            borderRadius: 2.5,
            px: 3,
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
            '&:hover': { boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.3)}` }
          }}
        >
          Refresh Account Management
        </Button>
      </Stack>

      {/* Main Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Total Platform Revenue"
            value={`R${(stats?.revenue?.total || 0).toLocaleString()}`}
            caption="Shop, rides, services, and registration fees"
            icon={RevenueIcon}
            color="primary"
            trend="+12.4%"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Total User Base"
            value={stats?.users?.total?.toLocaleString() || 0}
            caption="Active registered users"
            icon={UsersIcon}
            color="info"
            trend="+5.2%"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Service Pipeline"
            value={stats?.requests?.total?.toLocaleString() || 0}
            caption="Ongoing service requests"
            icon={RequestIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Active Chats"
            value={stats?.activity?.total_chats?.toLocaleString() || 0}
            caption="Global platform interactions"
            icon={ChatIcon}
            color="secondary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Shop Revenue"
            value={`R${(stats?.revenue?.shop || 0).toLocaleString()}`}
            caption="Paid, shipped, and delivered shop orders"
            icon={OrderIcon}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Ride Revenue"
            value={`R${(stats?.revenue?.ride || 0).toLocaleString()}`}
            caption="Paid cab ride transactions"
            icon={RideIcon}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Service Revenue"
            value={`R${(stats?.revenue?.service || 0).toLocaleString()}`}
            caption="Paid professional and provider requests"
            icon={SuccessIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Registration Fees"
            value={`R${(stats?.revenue?.registration || 0).toLocaleString()}`}
            caption="Completed role registration payments"
            icon={RevenueIcon}
            color="secondary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Ride Matching"
            value={(stats?.requests?.rides?.matching ?? stats?.requests?.rides?.searching ?? 0).toLocaleString()}
            caption="Cab rides currently searching for a driver"
            icon={RideIcon}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Drivers En Route"
            value={(stats?.requests?.rides?.en_route ?? stats?.requests?.rides?.assigned ?? 0).toLocaleString()}
            caption="Accepted rides awaiting pickup"
            icon={RideIcon}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Rides On Trip"
            value={stats?.requests?.rides?.on_trip?.toLocaleString() || 0}
            caption="Active trips currently in progress"
            icon={RideIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Cancelled Rides"
            value={(stats?.requests?.rides?.cancelled ?? stats?.requests?.rides?.cancelled_today ?? 0).toLocaleString()}
            caption="Cab rides cancelled across the platform"
            icon={ReportIcon}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, height: '100%', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight={800}>User Acquisition</Typography>
                <Typography variant="caption" color="text.secondary">Daily new registrations over the last 7 days</Typography>
              </Box>
              <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                <ChartIcon />
              </Avatar>
            </Box>
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.users?.growth || []}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, height: '100%', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>User Composition</Typography>
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Clients', count: stats?.users?.clients || 0, color: theme.palette.primary.main },
                  { name: 'Pros', count: stats?.users?.professionals || 0, color: theme.palette.info.main },
                  { name: 'Providers', count: stats?.users?.providers || 0, color: theme.palette.success.main },
                  { name: 'Drivers', count: stats?.users?.drivers || 0, color: theme.palette.secondary.main },
                ]} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600 }}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: alpha(theme.palette.action.hover, 0.04) }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {
                      [
                        theme.palette.primary.main,
                        theme.palette.info.main,
                        theme.palette.success.main,
                        theme.palette.secondary.main
                      ].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">System Status</Typography>
                <Chip label="Optimal" size="small" color="success" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Moderation Queue</Typography>
                <Typography variant="body2" fontWeight={800}>{stats?.feedback?.pending_reports || 0}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Detail Section */}
      <Grid container spacing={3}>
        {/* Orders Table */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper variant="outlined" sx={{ borderColor: alpha(theme.palette.divider, 0.08), borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Commercial Activity</Typography>
              <Button size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />} sx={{ fontWeight: 700 }}>Full Registry</Button>
            </Box>
            <Divider sx={{ opacity: 0.5 }} />
            <TableContainer>
              <Table size="medium">
                <TableHead sx={{ bgcolor: alpha(theme.palette.background.default, 0.8) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', py: 2 }}>REFERENCE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', py: 2 }}>DATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', py: 2 }}>VALUE</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', py: 2 }}>EXECUTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell sx={{ fontWeight: 700, py: 2.5 }}>
                          #{order.id.toString().slice(-8).toUpperCase()}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', py: 2.5, fontWeight: 500 }}>
                          {new Date(order.placed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: 'primary.main', py: 2.5 }}>
                          R {Number(order.total).toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2.5 }}>
                          <Chip
                            label={order.status}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 22,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              borderRadius: 1,
                              borderColor: order.status === 'completed' ? 'success.light' : 'warning.light',
                              color: order.status === 'completed' ? 'success.main' : 'warning.main',
                              bgcolor: order.status === 'completed' ? alpha(theme.palette.success.main, 0.04) : alpha(theme.palette.warning.main, 0.04),
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                        {loading ? <Skeleton variant="rectangular" height={160} width="100%" sx={{ borderRadius: 2 }} /> : <Typography variant="body2" color="text.disabled">No commercial data recorded</Typography>}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Request Feed */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper variant="outlined" sx={{ borderColor: alpha(theme.palette.divider, 0.08), borderRadius: 3, height: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Inbound Feed</Typography>
              <Chip label="Live" size="small" sx={{ fontWeight: 800, height: 20, bgcolor: 'error.main', color: 'white', px: 0.5 }} />
            </Box>
            <Divider sx={{ opacity: 0.5 }} />
            <Box sx={{ p: 1.5 }}>
              {!loading && recentRequests.length > 0 ? (
                recentRequests.map((req, idx) => (
                  <Stack
                    key={idx}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      mb: 0.5,
                      '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.04) }
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        color: 'primary.main',
                        width: 40,
                        height: 40,
                        borderRadius: 2
                      }}
                    >
                      <PortfolioIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'capitalize', lineHeight: 1.2 }}>
                        {req.request_type}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {new Date(req.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={req.status || 'new'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        borderRadius: 0.5,
                        bgcolor: alpha(theme.palette.divider, 0.1),
                        color: 'text.secondary'
                      }}
                    />
                  </Stack>
                ))
              ) : (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Monitoring service queue...</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Overview;
