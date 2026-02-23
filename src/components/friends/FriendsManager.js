import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import SavingsIcon from '@mui/icons-material/Savings';
import { useAuth } from '../../contexts/AuthContext';

const FriendsManager = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);

  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [friendRequests, setFriendRequests] = useState([]);
  const [bucketInvites, setBucketInvites] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [searchEmail, setSearchEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const [actionError, setActionError] = useState(null);

  // Bucket invite warning dialog
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [pendingAcceptInviteId, setPendingAcceptInviteId] = useState(null);
  const [accepting, setAccepting] = useState(false);

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

  const fetchPending = useCallback(async () => {
    try {
      setPendingLoading(true);
      const token = await currentUser.getIdToken();

      const [friendRes, bucketRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/friends/requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.REACT_APP_API_URL}/bucket-invites`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [friendData, bucketData] = await Promise.all([friendRes.json(), bucketRes.json()]);

      if (friendRes.ok) setFriendRequests(friendData.requests || []);
      if (bucketRes.ok) setBucketInvites(bucketData.invites || []);
    } catch (err) {
      console.error('Error fetching pending items:', err);
    } finally {
      setPendingLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (open) {
      fetchFriends();
      fetchPending();
    }
  }, [open, fetchFriends, fetchPending]);

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  const handleAcceptFriend = async (requestId) => {
    try {
      setActionError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/friends/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await Promise.all([fetchPending(), fetchFriends()]);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeclineFriend = async (requestId) => {
    try {
      setActionError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/friends/requests/${requestId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchPending();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // Step 1: user clicks Accept on a bucket invite → show warning
  const handleAcceptBucketInviteClick = (inviteId) => {
    setPendingAcceptInviteId(inviteId);
    setWarningDialogOpen(true);
  };

  // Step 2: user confirms warning → actually accept
  const handleConfirmAcceptBucketInvite = async () => {
    if (!pendingAcceptInviteId) return;
    try {
      setAccepting(true);
      setActionError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bucket-invites/${pendingAcceptInviteId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWarningDialogOpen(false);
      setPendingAcceptInviteId(null);
      fetchPending();
    } catch (err) {
      setActionError(err.message);
      setWarningDialogOpen(false);
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineBucketInvite = async (inviteId) => {
    try {
      setActionError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bucket-invites/${inviteId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchPending();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const totalPending = friendRequests.length + bucketInvites.length;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Friends</DialogTitle>
        <DialogContent sx={{ px: 0, pb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, mb: 2 }}>
            <Tab label="My Friends" />
            <Tab label={totalPending > 0 ? `Pending (${totalPending})` : 'Pending'} />
            <Tab label="Add Friend" />
          </Tabs>

          <Box sx={{ px: 3 }}>
            {/* My Friends */}
            {tab === 0 && (
              <>
                {friendsLoading ? (
                  <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
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
                          <ListItemText primary={friend.displayName} secondary={friend.email} />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </>
            )}

            {/* Pending */}
            {tab === 1 && (
              <>
                {actionError && (
                  <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
                    {actionError}
                  </Alert>
                )}
                {pendingLoading ? (
                  <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                ) : totalPending === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    No pending requests or invites.
                  </Typography>
                ) : (
                  <>
                    {/* Friend requests */}
                    {friendRequests.length > 0 && (
                      <>
                        <Typography variant="overline" color="text.secondary">Friend Requests</Typography>
                        <List disablePadding sx={{ mb: 2 }}>
                          {friendRequests.map((req, i) => (
                            <React.Fragment key={req.id}>
                              {i > 0 && <Divider />}
                              <ListItem disableGutters>
                                <ListItemText primary={req.fromDisplayName} secondary={req.fromEmail} />
                                <ListItemSecondaryAction>
                                  <IconButton color="success" onClick={() => handleAcceptFriend(req.id)} size="small" title="Accept">
                                    <CheckIcon />
                                  </IconButton>
                                  <IconButton color="error" onClick={() => handleDeclineFriend(req.id)} size="small" title="Decline">
                                    <CloseIcon />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                            </React.Fragment>
                          ))}
                        </List>
                      </>
                    )}

                    {/* Bucket invites */}
                    {bucketInvites.length > 0 && (
                      <>
                        <Typography variant="overline" color="text.secondary">Bucket Invites</Typography>
                        <List disablePadding>
                          {bucketInvites.map((invite, i) => (
                            <React.Fragment key={invite.id}>
                              {i > 0 && <Divider />}
                              <ListItem disableGutters>
                                <SavingsIcon sx={{ mr: 1.5, color: 'primary.main', fontSize: 20 }} />
                                <ListItemText
                                  primary={invite.bucketName}
                                  secondary={`Invited by ${invite.fromDisplayName}`}
                                />
                                <ListItemSecondaryAction>
                                  <IconButton color="success" onClick={() => handleAcceptBucketInviteClick(invite.id)} size="small" title="Accept">
                                    <CheckIcon />
                                  </IconButton>
                                  <IconButton color="error" onClick={() => handleDeclineBucketInvite(invite.id)} size="small" title="Decline">
                                    <CloseIcon />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                            </React.Fragment>
                          ))}
                        </List>
                      </>
                    )}
                  </>
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

      {/* Bucket invite warning dialog */}
      <Dialog open={warningDialogOpen} onClose={() => setWarningDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Before You Join</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Funds will <strong>not</strong> be dispersed unless the savings goal is fully reached.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            By accepting, you agree to contribute toward a shared goal. Your allocated funds remain locked until the goal is met.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmAcceptBucketInvite}
            disabled={accepting}
            startIcon={accepting && <CircularProgress size={20} />}
          >
            {accepting ? 'Joining...' : 'I Understand, Join'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FriendsManager;
