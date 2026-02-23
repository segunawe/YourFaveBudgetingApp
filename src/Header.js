import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Box, Typography, Drawer,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Avatar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

const DRAWER_WIDTH = 260;

function Header() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNavigate = (path) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Help', icon: <HelpOutlineIcon />, path: '/help' },
    { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const displayName = currentUser?.displayName || currentUser?.email || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 1 }}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            AJOIN
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: DRAWER_WIDTH } }}
      >
        {/* User header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2,
            py: 2.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Avatar sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText' }}>
            {initials}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {currentUser?.displayName || 'User'}
            </Typography>
            <Typography variant="caption" noWrap sx={{ opacity: 0.85 }}>
              {currentUser?.email}
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Navigation items */}
        <List sx={{ pt: 1 }}>
          {navItems.map(({ label, icon, path }) => (
            <ListItem key={label} disablePadding>
              <ListItemButton onClick={() => handleNavigate(path)}>
                <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider />

        {/* Log out */}
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LogoutIcon color="error" />
              </ListItemIcon>
              <ListItemText primary="Log Out" primaryTypographyProps={{ color: 'error' }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}

export default Header;
