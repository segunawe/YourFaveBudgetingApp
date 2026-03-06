import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, IconButton, Box, Typography, Drawer,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Avatar, Badge, Popover, Button, CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { db } from './config/firebase';
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, updateDoc, writeBatch,
} from 'firebase/firestore';
const DRAWER_WIDTH = 260;

function timeAgo(date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function useNotifications(uid) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'notifications', uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [uid]);

  return { notifications, loading };
}

function Header() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bellAnchor, setBellAnchor] = useState(null);
  const bellRef = useRef(null);

  const uid = currentUser?.uid;
  const { notifications, loading } = useNotifications(uid);
  const unreadCount = notifications.filter(n => !n.read).length;

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

  const handleBellClick = (e) => {
    setBellAnchor(e.currentTarget);
  };

  const handleCloseBell = () => {
    setBellAnchor(null);
  };

  const markRead = async (notif) => {
    if (!notif.read) {
      await updateDoc(doc(db, 'notifications', uid, 'items', notif.id), { read: true });
    }
    if (notif.link) {
      setBellAnchor(null);
      navigate(notif.link);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', uid, 'items', n.id), { read: true }));
    await batch.commit();
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
          <IconButton color="inherit" ref={bellRef} onClick={handleBellClick} aria-label="notifications">
            <Badge badgeContent={unreadCount} color="error" max={9}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Notifications Popover */}
      <Popover
        open={Boolean(bellAnchor)}
        anchorEl={bellAnchor}
        onClose={handleCloseBell}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllRead} sx={{ textTransform: 'none', fontSize: 12 }}>
              Mark all read
            </Button>
          )}
        </Box>

        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              No notifications yet.
            </Typography>
          ) : (
            <List disablePadding>
              {notifications.map((notif, idx) => (
                <React.Fragment key={notif.id}>
                  {idx > 0 && <Divider />}
                  <ListItemButton
                    onClick={() => markRead(notif)}
                    sx={{ px: 2, py: 1.5, alignItems: 'flex-start', bgcolor: notif.read ? 'transparent' : 'action.hover' }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!notif.read && (
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                        )}
                        <Typography variant="body2" fontWeight={notif.read ? 'normal' : 'bold'} noWrap>
                          {notif.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, whiteSpace: 'normal', lineHeight: 1.4 }}>
                        {notif.body}
                      </Typography>
                      {notif.createdAt && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                          {timeAgo(notif.createdAt.toDate())}
                        </Typography>
                      )}
                    </Box>
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>

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
