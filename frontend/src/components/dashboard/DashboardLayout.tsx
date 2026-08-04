import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  Box,
  Container,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Button,
  ThemeProvider,
  CssBaseline,
  alpha,
  Badge,
  useMediaQuery,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { getDashboardTheme } from '@/lib/dashboard-theme';
import Sidebar from './Sidebar';
import { apiFetch } from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout: () => void;
  displayName: string;
  role: string;
  navStructure: any[];
  actions?: React.ReactNode;
}

interface AppNotification {
    id: string;
    type: string;
    title: string;
    body: string;
    status: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  activeTab,
  onTabChange,
  onLogout,
  displayName,
  role,
  navStructure,
  actions
}) => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const theme = getDashboardTheme('light'); 
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const openProfileMenu = (e: React.MouseEvent<HTMLElement>) => setProfileAnchor(e.currentTarget);
  const closeProfileMenu = () => setProfileAnchor(null);

  const drawerWidth = 280;

  const fetchNotifications = async () => {
      try {
          const res = await apiFetch('/api/notifications');
          if (res.success) {
              const payload = res.message || res.data;
              setNotifications(payload.notifications || []);
              setUnreadCount(payload.unread_count || 0);
          }
      } catch (_err) {
          // fail silently — bell just won't update
      }
  };

  useEffect(() => {
      fetchNotifications();
      pollRef.current = setInterval(fetchNotifications, 30000);
      return () => {
          if (pollRef.current) clearInterval(pollRef.current);
      };
  }, []);

  const handleMarkRead = async (notifId: string) => {
      try {
          await apiFetch(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
          fetchNotifications();
      } catch (_err) { /* fail silently */ }
  };

  const handleMarkAllRead = async () => {
      try {
          await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
          fetchNotifications();
      } catch (_err) { /* fail silently */ }
  };

  const timeAgo = (dateStr: string) => {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Sidebar */}
        <Box
          component="nav"
          sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant={isMobile ? "temporary" : "permanent"}
            open={isMobile ? sidebarVisible : true}
            onClose={() => setSidebarVisible(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth, 
                borderRight: 'none', 
                bgcolor: 'background.default',
                boxShadow: isMobile ? 'none' : 'inset -1px 0 0 0 rgba(0,0,0,0.06)'
              },
            }}
          >
            <Sidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                onTabChange(tab);
                if (isMobile) setSidebarVisible(false);
              }}
              onLogout={onLogout}
              displayName={displayName}
              role={role}
              navStructure={navStructure}
            />
          </Drawer>
        </Box>

        {/* Main Content */}
        <Box component="main" sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          overflowX: 'hidden'
        }}>
          <AppBar position="sticky">
            <Toolbar sx={{ minHeight: 70, px: { xs: 2, md: 4 } }}>
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setSidebarVisible(true)}
                sx={{ mr: 2, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" color="text.primary" sx={{ fontWeight: 800 }}>
                  {title}
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {actions}
                
                <IconButton
                    size="small"
                    sx={{ color: 'text.secondary' }}
                    onClick={(e) => setNotifAnchor(e.currentTarget)}
                >
                    <Badge badgeContent={unreadCount > 0 ? unreadCount : 0} color="error">
                        <NotificationsIcon />
                    </Badge>
                </IconButton>

                <Menu
                    anchorEl={notifAnchor}
                    open={Boolean(notifAnchor)}
                    onClose={() => setNotifAnchor(null)}
                    PaperProps={{
                        elevation: 0,
                        sx: {
                            mt: 1.5,
                            width: 360,
                            maxHeight: 480,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                        }
                    }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notifications</Typography>
                        {unreadCount > 0 && (
                            <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: '0.7rem' }}>
                                Mark all read
                            </Button>
                        )}
                    </Box>
                    <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
                        {notifications.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
                            </Box>
                        ) : (
                            notifications.map((n) => (
                                <MenuItem
                                    key={n.id}
                                    onClick={() => { handleMarkRead(n.id); setNotifAnchor(null); }}
                                    sx={{
                                        alignItems: 'flex-start',
                                        gap: 1.5,
                                        py: 1.5,
                                        px: 2,
                                        bgcolor: n.status === 'unread' ? 'action.hover' : 'transparent',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        whiteSpace: 'normal'
                                    }}
                                >
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: n.status === 'unread' ? 'primary.main' : 'transparent', mt: 0.8, flexShrink: 0 }} />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: n.status === 'unread' ? 700 : 400 }}>
                                            {n.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                            {n.body}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                                            {timeAgo(n.created_at)}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))
                        )}
                    </Box>
                </Menu>
                 
                <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', mx: 1 }} />

                <Button
                  onClick={openProfileMenu}
                  startIcon={<Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>{displayName.charAt(0).toUpperCase()}</Avatar>}
                  endIcon={<AccountCircleIcon sx={{ color: 'text.disabled' }} />}
                  sx={{
                    color: 'text.primary',
                    px: 1,
                    '&:hover': { bgcolor: 'transparent' }
                  }}
                >
                  <Box sx={{ textAlign: 'left', display: { xs: 'none', md: 'block' }, mr: 1 }}>
                    <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>{displayName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>{role}</Typography>
                  </Box>
                </Button>
              </Box>

              <Menu
                anchorEl={profileAnchor}
                open={Boolean(profileAnchor)}
                onClose={closeProfileMenu}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    mt: 1.5,
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={() => { onTabChange('settings'); closeProfileMenu(); }}>
                  <SettingsIcon fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} /> Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { onLogout(); closeProfileMenu(); }} sx={{ color: 'error.main' }}>
                  <LogoutIcon fontSize="small" sx={{ mr: 2 }} /> Sign Out
                </MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>

          <Container 
            maxWidth={false} 
            sx={{ 
              py: 4, 
              px: { xs: 2, md: 4 }, 
              flexGrow: 1,
              bgcolor: 'background.default',
              '& .bg-white': { bgcolor: 'background.paper' },
              '& .text-slate-900': { color: 'text.primary' },
              '& .text-slate-500': { color: 'text.secondary' },
              '& .border-gray-100': { borderColor: 'divider' },
              '& .bg-sa-purple': { bgcolor: 'primary.main' },
              '& .text-sa-purple': { color: 'primary.main' },
              // Standardizing common Tailwind dashboard colors to match MUI theme
              '& .bg-\\[#5e35b1\\]': { bgcolor: 'primary.main' },
              '& .hover\\:bg-\\[#4527a0\\]:hover': { bgcolor: 'primary.dark' },
              '& .text-\\[#5e35b1\\]': { color: 'primary.main' },
              '& .bg-sa-blue': { bgcolor: 'secondary.main' },
            }}
          >
            {children}
          </Container>

          <Box component="footer" sx={{ py: 3, px: 4, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">© {new Date().getFullYear()} AG8TE Admin</Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>Privacy</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>Terms</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default DashboardLayout;
