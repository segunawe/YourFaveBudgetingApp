import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';

const FriendsManager = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);

  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [searchEmail, setSearchEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const [actionError, setActionError] = useState(null);

  const fetchFriends = useCallback(async () => {
    try {
      setFriendsLoading(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setFriendsLoading(false);
    }
  }, [currentUser]);

  const fetchRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (open) {
      fetchFriends();
      fetchRequests();
    }
  }, [open, fetchFriends, fetchRequests]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    try {
      setSending(true);
      setSendError(null);
      setSendSuccess(false);

      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: searchEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSendSuccess(true);
      setSearchEmail('');
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      setActionError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/friends/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await Promise.all([fetchRequests(), fetchFriends()]);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDecline = async (requestId) => {
    try {
      setActionError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/friends/requests/${requestId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchRequests();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const pendingCount = requests.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Friends</DialogTitle>
      <DialogContent sx={{ px: 0, pb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, mb: 2 }}>
          <Tab label="My Friends" />
          <Tab label={pendingCount > 0 ? `Pending (${pendingCount})` : 'Pending'} />
          <Tab label="Add Friend" />
        </Tabs>

        <Box sx={{ px: 3 }}>
          {/* My Friends */}
          {tab === 0 && (
            <>
              {friendsLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : friends.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No friends yet. Add someone to get started!
                </Typography>
              ) : (
                <List disablePadding>
                  {friends.map((friend, i) => (
                    <React.Fragment key={friend.uid}>
                      {i > 0 && <Divider />}
                      <ListItem disableGutters>
                        <ListItemText
                          primary={friend.displayName}
                          secondary={friend.email}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </>
          )}

          {/* Pending Requests */}
          {tab === 1 && (
            <>
              {actionError && (
                <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
                  {actionError}
                </Alert>
              )}
              {requestsLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : requests.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No pending requests.
                </Typography>
              ) : (
                <List disablePadding>
                  {requests.map((req, i) => (
                    <React.Fragment key={req.id}>
                      {i > 0 && <Divider />}
                      <ListItem disableGutters>
                        <ListItemText
                          primary={req.fromDisplayName}
                          secondary={req.fromEmail}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            color="success"
                            onClick={() => handleAccept(req.id)}
                            size="small"
                            title="Accept"
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDecline(req.id)}
                            size="small"
                            title="Decline"
                          >
                            <CloseIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </>
          )}

          {/* Add Friend */}
          {tab === 2 && (
            <Box component="form" onSubmit={handleSendRequest}>
              {sendError && (
                <Alert severity="error" onClose={() => setSendError(null)} sx={{ mb: 2 }}>
                  {sendError}
                </Alert>
              )}
              {sendSuccess && (
                <Alert severity="success" onClose={() => setSendSuccess(false)} sx={{ mb: 2 }}>
                  Friend request sent!
                </Alert>
              )}
              <TextField
                label="Email address"
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                fullWidth
                placeholder="friend@example.com"
                disabled={sending}
                autoFocus
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={sending || !searchEmail.trim()}
                startIcon={sending ? <CircularProgress size={20} /> : <PersonAddIcon />}
                sx={{ mt: 2 }}
              >
                {sending ? 'Sending...' : 'Send Request'}
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsManager;
