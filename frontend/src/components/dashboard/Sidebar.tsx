import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Avatar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  alpha,
  useTheme,
  Chip,
  Collapse
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Logout,
  Shield
} from '@mui/icons-material';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: { id: string; label: string; icon: React.ElementType }[];
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout: () => void;
  displayName: string;
  role: string;
  navStructure: any[];
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  displayName,
  role,
  navStructure
}) => {
  const theme = useTheme();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initialGroups: Record<string, boolean> = {};
    navStructure.forEach((item) => {
      if (item.type === 'group' && item.children?.some((child: any) => activeTab === child.id)) {
        initialGroups[item.label] = true;
      }
    });
    return initialGroups;
  });

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      navStructure.forEach((item) => {
        if (item.type === 'group' && item.children?.some((child: any) => activeTab === child.id) && !(item.label in next)) {
          next[item.label] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [activeTab, navStructure]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Branding Header */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          variant="rounded"
          sx={{
            bgcolor: 'primary.main',
            width: 40,
            height: 40,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`
          }}
        >
          <Shield />
        </Avatar>
        <Box>
          <motion.div
            animate={{
              opacity: [0.7, 1, 0.7],
              scale: [0.98, 1, 0.98]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>MzansiServe</Typography>
          </motion.div>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
            {role.toUpperCase()} CONSOLE
          </Typography>
        </Box>
      </Box>

      {/* User Card */}
      <Box sx={{ px: 3, mb: 2 }}>
        <Box sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}>
          <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 36, height: 36, fontWeight: 700, fontSize: '0.9rem' }}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{displayName}</Typography>
            <Chip
              label={role}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ 
                height: 20, 
                fontSize: '0.65rem', 
                borderRadius: 1, 
                fontWeight: 700, 
                border: 'none', 
                bgcolor: alpha(theme.palette.primary.main, 0.1) 
              }}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        <List sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
          {navStructure.map((item, index) => {
            if (item.type === 'group') {
              const isOpen = !!openGroups[item.label];
              const hasActiveChild = item.children.some((child: any) => activeTab === child.id);
              
              return (
                <React.Fragment key={index}>
                  <ListItemButton
                    onClick={() => toggleGroup(item.label)}
                    sx={{
                      borderRadius: 2.5,
                      mb: 0.5,
                      color: hasActiveChild ? 'primary.main' : 'text.secondary',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.action.hover, 0.04),
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: hasActiveChild ? 'primary.main' : 'text.disabled', minWidth: 40 }}>
                      <item.icon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label} 
                      primaryTypographyProps={{ fontWeight: hasActiveChild ? 700 : 500, fontSize: '0.9rem' }} 
                    />
                    {isOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 2 }}>
                      {item.children.map((child: any) => {
                        const active = activeTab === child.id;
                        return (
                          <ListItemButton
                            key={child.id}
                            onClick={() => onTabChange(child.id)}
                            selected={active}
                            sx={{
                              borderRadius: 2.5,
                              mb: 0.5,
                              color: active ? 'primary.main' : 'text.secondary',
                              bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                              '&:hover': {
                                bgcolor: active ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.action.hover, 0.04),
                              },
                              '&.Mui-selected': {
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                              }
                            }}
                          >
                            <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.disabled', minWidth: 40 }}>
                              <child.icon sx={{ fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={child.label} 
                              primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '0.85rem' }} 
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                </React.Fragment>
              );
            }

            const active = activeTab === item.id;
            return (
              <ListItemButton
                key={item.id}
                onClick={() => onTabChange(item.id)}
                selected={active}
                sx={{
                  borderRadius: 2.5,
                  mb: 0.5,
                  color: active ? 'primary.main' : 'text.secondary',
                  bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                  '&:hover': {
                    bgcolor: active ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.action.hover, 0.04),
                  },
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.disabled', minWidth: 40 }}>
                  <item.icon />
                </ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '0.9rem' }} 
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          onClick={onLogout}
          startIcon={<Logout />}
          sx={{
            borderRadius: 3,
            py: 1,
            border: '1px solid',
            borderColor: alpha(theme.palette.error.main, 0.2),
            color: 'error.main',
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.04),
              borderColor: 'error.main'
            }
          }}
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  );
};

export default Sidebar;
