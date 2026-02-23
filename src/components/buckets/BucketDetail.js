import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import StarIcon from '@mui/icons-material/Star';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../Header';

const BucketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [bucket, setBucket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Allocation confirmation
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(null);

  // Stuck funds support
  const [stuckDialogOpen, setStuckDialogOpen] = useState(false);
  const [stuckMessage, setStuckMessage] = useState('');
  const [submittingStuck, setSubmittingStuck] = useState(false);
  const [stuckRequests, setStuckRequests] = useState([]);

  // Invite friend state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriendUid, setSelectedFriendUid] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Change collector state
  const [collectorDialogOpen, setCollectorDialogOpen] = useState(false);
  const [newCollectorUid, setNewCollectorUid] = useState('');
  const [changingCollector, setChangingCollector] = useState(false);

  const fetchBucket = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch bucket');
      setBucket(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStuckRequests = async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStuckRequests((data.requests || []).filter(r => r.bucketId === id));
      }
    } catch (err) {
      console.error('Error fetching support requests:', err);
    }
  };

  useEffect(() => {
    fetchBucket();
    fetchStuckRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchFriends = async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setFriends(data.friends || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const handleOpenInvite = () => {
    fetchFriends();
    setInviteDialogOpen(true);
    setInviteSuccess(false);
    setSelectedFriendUid('');
  };

  const handleInvite = async () => {
    if (!selectedFriendUid) return;
    try {
      setInviting(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendUid: selectedFriendUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteSuccess(true);
      setSelectedFriendUid('');
    } catch (err) {
      setError(err.message);
      setInviteDialogOpen(false);
    } finally {
      setInviting(false);
    }
  };

  const handleChangeCollector = async () => {
    if (!newCollectorUid) return;
    try {
      setChangingCollector(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/collector`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ collectorUid: newCollectorUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCollectorDialogOpen(false);
      setNewCollectorUid('');
      await fetchBucket();
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingCollector(false);
    }
  };

  // Step 1: validate and show confirmation dialog
  const handleAllocate = (e) => {
    e.preventDefault();
    const amount = parseFloat(allocateAmount);
    if (!amount || amount <= 0) { setError('Please enter a valid amount'); return; }
    setPendingAmount(amount);
    setConfirmDialogOpen(true);
  };

  // Step 2: confirmed — call API
  const handleConfirmAllocate = async () => {
    try {
      setConfirmDialogOpen(false);
      setAllocating(true);
      setError(null);
      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: pendingAmount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to allocate funds');
      await fetchBucket();
      setAllocateAmount('');
      setPendingAmount(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setAllocating(false);
    }
  };

  const handleSubmitStuckRequest = async () => {
    if (!stuckMessage.trim()) return;
    try {
      setSubmittingStuck(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/stuck-funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bucketId: id, message: stuckMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStuckDialogOpen(false);
      setStuckMessage('');
      fetchStuckRequests();
    } catch (err) {
      setError(err.message);
      setStuckDialogOpen(false);
    } finally {
      setSubmittingStuck(false);
    }
  };

  const handleCollect = async () => {
    try {
      setCollecting(true);
      setError(null);
      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/collect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to collect funds');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setCollecting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete bucket');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (date) => {
    if (!date) return 'No target date';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getProgressPercentage = () => {
    if (!bucket) return 0;
    return Math.min((bucket.currentAmount / bucket.goalAmount) * 100, 100);
  };

  if (loading) {
    return (
      <>
        <Header />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  if (error && !bucket) {
    return (
      <>
        <Header />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
            Back to Dashboard
          </Button>
        </Container>
      </>
    );
  }

  const isOwner = bucket.userId === currentUser.uid;
  const collectorUid = bucket.collectorUid || bucket.userId;
  const isCollector = collectorUid === currentUser.uid;

  // Friends not already in the bucket (for invite dialog)
  const invitableFriends = friends.filter(
    f => !(bucket.memberUids || []).includes(f.uid)
  );

  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 3 }}>
          Back to Dashboard
        </Button>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Bucket Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Typography variant="h4" gutterBottom>{bucket.name}</Typography>
              {bucket.description && (
                <Typography variant="body1" color="text.secondary">{bucket.description}</Typography>
              )}
            </Box>
            {bucket.status === 'completed' && (
              <Chip icon={<CheckCircleIcon />} label="Goal Reached!" color="success" size="large" />
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="h6" color="primary">{formatCurrency(bucket.currentAmount)}</Typography>
              <Typography variant="h6" color="text.secondary">of {formatCurrency(bucket.goalAmount)}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={getProgressPercentage()}
              sx={{ height: 12, borderRadius: 6 }}
              color={bucket.status === 'completed' ? 'success' : 'primary'}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {getProgressPercentage().toFixed(1)}% complete
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" color="text.secondary">
              Target Date: {formatDate(bucket.targetDate)}
            </Typography>
            {bucket.status === 'completed' && isCollector && (
              <Button
                variant="contained"
                color="success"
                size="large"
                onClick={handleCollect}
                disabled={collecting}
                startIcon={collecting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {collecting ? 'Collecting...' : 'Collect Funds'}
              </Button>
            )}
          </Box>
        </Paper>

        {/* Allocate Funds */}
        {bucket.status !== 'completed' && (
          <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Add Funds</Typography>
            <form onSubmit={handleAllocate}>
              <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                <Tooltip title="Amount to allocate from your available bank balance toward this goal" placement="top">
                  <TextField
                    label="Amount"
                    type="number"
                    value={allocateAmount}
                    onChange={(e) => setAllocateAmount(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    placeholder="0.00"
                    disabled={allocating}
                    fullWidth
                  />
                </Tooltip>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={allocating || !allocateAmount}
                  startIcon={allocating ? <CircularProgress size={20} /> : <AddIcon />}
                  sx={{
                    minWidth: { xs: 'unset', sm: 150 },
                    width: { xs: '100%', sm: 'auto' },
                    height: 56,
                  }}
                >
                  {allocating ? 'Adding...' : 'Add Funds'}
                </Button>
              </Box>
            </form>

            {/* Stuck funds */}
            {(() => {
              const userContributed = (bucket.contributions || [])
                .filter(c => c.uid === currentUser.uid)
                .reduce((sum, c) => sum + (c.amount || 0), 0);
              const hasOpenRequest = stuckRequests.some(r => r.status === 'open');
              if (userContributed <= 0) return null;
              return (
                <Box sx={{ mt: 2 }}>
                  {hasOpenRequest ? (
                    <Alert severity="info" icon={<SupportAgentIcon />}>
                      Your funds release request is open. Our support team will be in touch.
                    </Alert>
                  ) : (
                    <Tooltip title="If this goal is not progressing and you need your funds back, you can request a review">
                      <Button
                        size="small"
                        color="warning"
                        startIcon={<SupportAgentIcon />}
                        onClick={() => setStuckDialogOpen(true)}
                        sx={{ mt: 1 }}
                      >
                        Request Funds Release
                      </Button>
                    </Tooltip>
                  )}
                </Box>
              );
            })()}
          </Paper>
        )}

        {/* Members Section */}
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <GroupIcon color="action" />
              <Typography variant="h6">Members</Typography>
            </Box>
            <Box display="flex" gap={1}>
              {isOwner && bucket.members && bucket.members.length > 1 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => { setNewCollectorUid(collectorUid); setCollectorDialogOpen(true); }}
                >
                  Change Collector
                </Button>
              )}
              {isOwner && (
                <Button size="small" variant="outlined" startIcon={<PersonAddIcon />} onClick={handleOpenInvite}>
                  Invite Friend
                </Button>
              )}
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List disablePadding>
            {(bucket.members || [{ uid: bucket.userId, displayName: 'You', email: currentUser.email, role: 'owner' }]).map((member) => {
              const memberTotal = (bucket.contributions || [])
                .filter(c => c.uid === member.uid)
                .reduce((sum, c) => sum + (c.amount || 0), 0);
              const isDesignatedCollector = member.uid === collectorUid;
              return (
                <ListItem key={member.uid} disableGutters divider>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {member.displayName}
                        {member.role === 'owner' && (
                          <Chip label="owner" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                        )}
                        {isDesignatedCollector && (
                          <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} titleAccess="Designated collector" />
                        )}
                      </Box>
                    }
                    secondary={member.email}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(memberTotal)} contributed
                  </Typography>
                </ListItem>
              );
            })}
          </List>
        </Paper>

        {/* Contribution History */}
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Contribution History</Typography>
          <Divider sx={{ mb: 2 }} />
          {bucket.contributions && bucket.contributions.length > 0 ? (
            <List>
              {bucket.contributions.map((contribution, index) => {
                const contributor = bucket.members?.find(m => m.uid === contribution.uid);
                const dateVal = contribution.date?.toDate
                  ? contribution.date.toDate()
                  : new Date(contribution.date);
                return (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={formatCurrency(contribution.amount)}
                      secondary={
                        <>
                          {contributor && <span style={{ marginRight: 8 }}>{contributor.displayName} &middot;</span>}
                          {dateVal.toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">No contributions yet</Typography>
          )}
        </Paper>

        {/* Delete Bucket */}
        {isOwner && (
          <Box textAlign="center">
            <Button startIcon={<DeleteIcon />} color="error" onClick={() => setDeleteDialogOpen(true)} disabled={deleting}>
              Delete Bucket
            </Button>
          </Box>
        )}

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Bucket?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{bucket.name}"?
              {bucket.currentAmount > 0 && ` The ${formatCurrency(bucket.currentAmount)} allocated will be freed up.`}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}
              startIcon={deleting && <CircularProgress size={20} />}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Invite Friend Dialog */}
        <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Invite a Friend</DialogTitle>
          <DialogContent>
            {inviteSuccess ? (
              <Alert severity="success">Invite sent!</Alert>
            ) : invitableFriends.length === 0 ? (
              <Typography color="text.secondary">
                All your friends are already members, or you have no friends added yet.
              </Typography>
            ) : (
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Select friend</InputLabel>
                <Select
                  value={selectedFriendUid}
                  label="Select friend"
                  onChange={(e) => setSelectedFriendUid(e.target.value)}
                >
                  {invitableFriends.map(f => (
                    <MenuItem key={f.uid} value={f.uid}>{f.displayName} ({f.email})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteDialogOpen(false)}>
              {inviteSuccess ? 'Close' : 'Cancel'}
            </Button>
            {!inviteSuccess && invitableFriends.length > 0 && (
              <Button
                variant="contained"
                onClick={handleInvite}
                disabled={inviting || !selectedFriendUid}
                startIcon={inviting && <CircularProgress size={20} />}
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Change Collector Dialog */}
        <Dialog open={collectorDialogOpen} onClose={() => setCollectorDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Change Collector</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The collector is the only person who can withdraw the funds when the goal is reached.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Select collector</InputLabel>
              <Select
                value={newCollectorUid}
                label="Select collector"
                onChange={(e) => setNewCollectorUid(e.target.value)}
              >
                {(bucket.members || []).map(m => (
                  <MenuItem key={m.uid} value={m.uid}>
                    {m.displayName} {m.uid === collectorUid ? '(current)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCollectorDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleChangeCollector}
              disabled={changingCollector || !newCollectorUid || newCollectorUid === collectorUid}
              startIcon={changingCollector && <CircularProgress size={20} />}
            >
              {changingCollector ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Allocate Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirm Allocation</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 1 }}>
              Allocate <strong>{formatCurrency(pendingAmount || 0)}</strong> toward{' '}
              <strong>{bucket.name}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Note: fund allocation is a virtual tracking action. No money is moved from your bank
              account at this time.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirmAllocate}>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Stuck Funds Dialog */}
        <Dialog open={stuckDialogOpen} onClose={() => setStuckDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Request Funds Release</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              If this savings goal is not progressing and you need your contributed funds reviewed,
              describe your situation below. Our support team will follow up with you.
            </Typography>
            <TextField
              label="Describe your situation"
              multiline
              rows={4}
              value={stuckMessage}
              onChange={(e) => setStuckMessage(e.target.value)}
              fullWidth
              disabled={submittingStuck}
              placeholder="e.g. The group is inactive and I would like my $200 contribution reviewed..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setStuckDialogOpen(false); setStuckMessage(''); }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleSubmitStuckRequest}
              disabled={submittingStuck || !stuckMessage.trim()}
              startIcon={submittingStuck && <CircularProgress size={20} />}
            >
              {submittingStuck ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default BucketDetail;
