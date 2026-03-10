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
  FormControlLabel,
  InputLabel,
  Switch,
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
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import CancelIcon from '@mui/icons-material/Cancel';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../Header';
import AchSetupBanner from './AchSetupBanner';
import ConnectOnboardingBanner from './ConnectOnboardingBanner';

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

  // ACH / Connect state
  const [achReady, setAchReady] = useState(false);
  const [achInfo, setAchInfo] = useState({ last4: null, bankName: null });
  const [collectReady, setCollectReady] = useState(false);

  // Voting state
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);

  // Cancel state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Collect confirmation
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);

  // Flexible contributions toggle
  const [flexToggling, setFlexToggling] = useState(false);

  // Recurring contributions
  const [recurringSchedule, setRecurringSchedule] = useState(null);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState('weekly');
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [confirmCancelRecurring, setConfirmCancelRecurring] = useState(false);

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

  const fetchAchStatus = async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/stripe/ach-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.hasAchMethod) {
        setAchReady(true);
        setAchInfo({ last4: data.last4, bankName: data.bankName });
      }
    } catch (err) {
      console.error('Error fetching ACH status:', err);
    }
  };

  const fetchRecurringSchedule = async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/recurring`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRecurringSchedule((data.schedules || []).find(s => s.bucketId === id) || null);
      }
    } catch (err) {
      console.error('Error fetching recurring schedule:', err);
    }
  };

  useEffect(() => {
    fetchBucket();
    fetchStuckRequests();
    fetchAchStatus();
    fetchRecurringSchedule();
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
      setCollectDialogOpen(false);
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

  const handleVote = async (approved) => {
    try {
      setVoting(true);
      setVoteError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approved }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cast vote');
      await fetchBucket();
    } catch (err) {
      setVoteError(err.message);
    } finally {
      setVoting(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCancelling(true);
      setCancelError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'LOCK_PERIOD_NOT_ELAPSED') {
          setCancelError(`Funds are locked for ${data.daysRemaining} more day(s).`);
          setCancelDialogOpen(false);
          return;
        }
        throw new Error(data.error || 'Failed to cancel bucket');
      }
      setCancelDialogOpen(false);
      navigate('/dashboard');
    } catch (err) {
      setCancelError(err.message);
      setCancelDialogOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  const getDaysSinceLastContrib = () => {
    if (!bucket?.lastContributionAt) return null;
    const ts = bucket.lastContributionAt;
    const ms = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
    return Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
  };

  const getVoteStatus = () => {
    const votes = bucket?.collectionVotes || {};
    const entries = Object.entries(votes);
    const myVote = votes[currentUser.uid] ?? null;
    const approvedCount = entries.filter(([, v]) => v.approved).length;
    const totalVoted = entries.length;
    return { approvedCount, totalVoted, myVote };
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

  const handleFlexibleToggle = async (value) => {
    try {
      setFlexToggling(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/flexible-contributions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ flexibleContributions: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update setting');
      setBucket(prev => ({ ...prev, flexibleContributions: value }));
    } catch (err) {
      setError(err.message);
    } finally {
      setFlexToggling(false);
    }
  };

  const handleSetupRecurring = async () => {
    try {
      setSavingRecurring(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bucketId: id, amount: parseFloat(recurringAmount), frequency: recurringFrequency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set up recurring contribution');
      setRecurringSchedule(data);
      setRecurringDialogOpen(false);
      setRecurringAmount('');
    } catch (err) {
      setError(err.message);
      setRecurringDialogOpen(false);
    } finally {
      setSavingRecurring(false);
    }
  };

  const handleToggleRecurring = async () => {
    if (!recurringSchedule) return;
    try {
      setSavingRecurring(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/recurring/${recurringSchedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !recurringSchedule.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update recurring schedule');
      setRecurringSchedule(prev => ({ ...prev, active: !prev.active }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRecurring(false);
    }
  };

  const handleCancelRecurring = async () => {
    if (!recurringSchedule) return;
    try {
      setSavingRecurring(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/recurring/${recurringSchedule.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel recurring schedule');
      }
      setRecurringSchedule(null);
      setConfirmCancelRecurring(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRecurring(false);
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
  const memberCount = (bucket.memberUids || []).length;
  const daysSinceLastContrib = getDaysSinceLastContrib();
  const { approvedCount, totalVoted, myVote } = getVoteStatus();
  const hasPendingContribs = (bucket.contributions || []).some(
    c => c.stripePaymentIntentId && c.paymentStatus === 'pending'
  );
  const showVoteBanner = bucket.status === 'completed' && bucket.isShared && memberCount > 1 && !bucket.collectionVoteApproved;
  const show75DayWarning = isOwner && ['active', 'completed'].includes(bucket.status) && daysSinceLastContrib !== null && daysSinceLastContrib >= 75;
  const show90DayWarning = show75DayWarning && daysSinceLastContrib >= 90;

  // Equal-share computation for shared buckets without flexible contributions
  const isPlus = currentUser.firestoreData?.tier === 'plus';
  const showShareEnforcement = bucket.isShared && !bucket.flexibleContributions;
  const equalShare = showShareEnforcement
    ? Math.ceil((bucket.goalAmount / memberCount) * 100) / 100
    : null;
  const myCommitted = showShareEnforcement
    ? (bucket.contributions || [])
        .filter(c => c.uid === currentUser.uid &&
          c.paymentStatus !== 'failed' &&
          c.paymentStatus !== 'reversed' &&
          c.paymentStatus !== 'refunded')
        .reduce((sum, c) => sum + (c.amount || 0), 0)
    : 0;
  const myRemaining = showShareEnforcement ? Math.max(0, equalShare - myCommitted) : null;
  const shareMet = showShareEnforcement && myRemaining === 0;

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

        {cancelError && (
          <Alert severity="error" onClose={() => setCancelError(null)} sx={{ mb: 3 }}>
            {cancelError}
          </Alert>
        )}

        {voteError && (
          <Alert severity="error" onClose={() => setVoteError(null)} sx={{ mb: 3 }}>
            {voteError}
          </Alert>
        )}

        {/* Vote Banner */}
        {showVoteBanner && (
          <Alert
            severity="warning"
            icon={<GroupIcon />}
            sx={{ mb: 3 }}
          >
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Member approval required before funds can be collected
            </Typography>
            <Typography variant="body2">
              {approvedCount} of {memberCount} members approved &middot; {totalVoted} have voted
            </Typography>
            {myVote === null ? (
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<ThumbUpIcon />}
                  onClick={() => handleVote(true)}
                  disabled={voting}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<ThumbDownIcon />}
                  onClick={() => handleVote(false)}
                  disabled={voting}
                >
                  Decline
                </Button>
              </Box>
            ) : (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Your vote: <strong>{myVote.approved ? 'Approved' : 'Declined'}</strong>
                </Typography>
                <Button size="small" variant="text" onClick={() => handleVote(!myVote.approved)} disabled={voting}>
                  Change Vote
                </Button>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              By approving, you confirm your consent for the designated collector to receive the full balance.
            </Typography>
          </Alert>
        )}

        {/* 90-Day Inactivity Banner */}
        {show75DayWarning && (
          <Alert
            severity={show90DayWarning ? 'error' : 'warning'}
            icon={<CancelIcon />}
            sx={{ mb: 3 }}
            action={
              show90DayWarning && (
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  disabled={hasPendingContribs || cancelling}
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel & Refund
                </Button>
              )
            }
          >
            {show90DayWarning ? (
              <>
                <Typography variant="body2" fontWeight="bold">
                  90-day inactivity window reached
                </Typography>
                <Typography variant="body2">
                  No contributions in {daysSinceLastContrib} days. You may cancel this bucket and
                  refund all settled contributors.
                  {hasPendingContribs && ' (Unavailable while contributions are pending)'}
                </Typography>
              </>
            ) : (
              <Typography variant="body2">
                No contributions in {daysSinceLastContrib} days. You will be able to cancel and
                refund in {90 - daysSinceLastContrib} day(s).
              </Typography>
            )}
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

          {bucket.status === 'completed' && bucket.isShared && memberCount > 1 && !bucket.collectionVoteApproved && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Funds are pending member approval before collection.
            </Alert>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" color="text.secondary">
              Target Date: {formatDate(bucket.targetDate)}
            </Typography>
            {bucket.status === 'completed' && isCollector && (
              <>
                {!collectReady && (
                  <ConnectOnboardingBanner onReady={() => setCollectReady(true)} />
                )}
                <Tooltip
                  title={
                    !bucket.collectionVoteApproved && bucket.isShared && memberCount > 1
                      ? `Waiting for member approval: ${approvedCount} of ${memberCount} approved`
                      : (bucket.pendingAmount || 0) > 0
                        ? `Waiting for ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(bucket.pendingAmount || 0)} in pending contributions`
                        : ''
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      onClick={() => setCollectDialogOpen(true)}
                      disabled={
                        collecting ||
                        !collectReady ||
                        (bucket.pendingAmount || 0) > 0 ||
                        (bucket.isShared && memberCount > 1 && !bucket.collectionVoteApproved)
                      }
                      startIcon={collecting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                    >
                      {collecting ? 'Collecting...' : 'Collect Funds'}
                    </Button>
                  </span>
                </Tooltip>
              </>
            )}
          </Box>
        </Paper>

        {/* Allocate Funds */}
        {bucket.status !== 'completed' && (
          <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Add Funds</Typography>

            {!achReady && (
              <AchSetupBanner
                onSetupComplete={({ last4, bankName }) => {
                  setAchReady(true);
                  setAchInfo({ last4, bankName });
                }}
              />
            )}

            {achReady && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Contributing via <strong>{achInfo.bankName}</strong> ****{achInfo.last4}
              </Typography>
            )}

            {shareMet ? (
              <Chip
                icon={<CheckCircleIcon />}
                label={`You've contributed your full share (${formatCurrency(equalShare)})`}
                color="success"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            ) : (
              <form onSubmit={handleAllocate}>
                <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Tooltip title="Amount to debit via ACH from your linked bank account" placement="top">
                    <TextField
                      label="Amount"
                      type="number"
                      value={allocateAmount}
                      onChange={(e) => setAllocateAmount(e.target.value)}
                      inputProps={{ min: 0, step: 0.01, ...(showShareEnforcement ? { max: myRemaining } : {}) }}
                      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                      placeholder="0.00"
                      disabled={allocating || !achReady}
                      fullWidth
                      helperText={showShareEnforcement
                        ? `Your share: ${formatCurrency(equalShare)} | Contributed: ${formatCurrency(myCommitted)} | Remaining: ${formatCurrency(myRemaining)}`
                        : undefined}
                    />
                  </Tooltip>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={allocating || !allocateAmount || !achReady}
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
            )}

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

            {/* Recurring Contributions */}
            {achReady && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Recurring Contributions</Typography>
                {recurringSchedule ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Auto-contributing <strong>{formatCurrency(recurringSchedule.amount)}</strong>{' '}
                      {recurringSchedule.frequency === 'biweekly' ? 'every 2 weeks' : recurringSchedule.frequency}
                      {recurringSchedule.nextRunAt && (
                        <> &middot; Next: {new Date(recurringSchedule.nextRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                      )}
                      {!recurringSchedule.active && <> &middot; <span style={{ color: '#ed6c02' }}>Paused</span></>}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleToggleRecurring}
                        disabled={savingRecurring}
                      >
                        {recurringSchedule.active ? 'Pause' : 'Resume'}
                      </Button>
                      {confirmCancelRecurring ? (
                        <>
                          <Typography variant="body2" color="error">Cancel recurring?</Typography>
                          <Button size="small" color="error" variant="contained" onClick={handleCancelRecurring} disabled={savingRecurring}>
                            Yes, cancel
                          </Button>
                          <Button size="small" onClick={() => setConfirmCancelRecurring(false)}>No</Button>
                        </>
                      ) : (
                        <Button size="small" color="error" variant="text" onClick={() => setConfirmCancelRecurring(true)}>
                          Cancel recurring
                        </Button>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutorenewIcon />}
                    onClick={() => setRecurringDialogOpen(true)}
                  >
                    Set up recurring contribution
                  </Button>
                )}
              </>
            )}
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

        {/* Flexible Contributions Toggle — Plus owner only */}
        {isOwner && isPlus && bucket.isShared && (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!bucket.flexibleContributions}
                  onChange={(e) => handleFlexibleToggle(e.target.checked)}
                  disabled={flexToggling}
                />
              }
              label="Allow flexible contribution amounts"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              {bucket.flexibleContributions
                ? 'Members can contribute any amount. Equal-share enforcement is disabled.'
                : `Each member's equal share is ${formatCurrency(equalShare || Math.ceil((bucket.goalAmount / memberCount) * 100) / 100)}. Enable to remove this limit.`}
            </Typography>
          </Paper>
        )}

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

                let statusChip = null;
                if (!contribution.stripePaymentIntentId) {
                  statusChip = <Chip label="Virtual" size="small" sx={{ ml: 1 }} />;
                } else if (contribution.paymentStatus === 'pending') {
                  statusChip = <Chip label="Pending" size="small" color="warning" sx={{ ml: 1 }} />;
                } else if (contribution.paymentStatus === 'failed') {
                  statusChip = <Chip label="Payment Failed" size="small" color="error" sx={{ ml: 1 }} />;
                } else if (contribution.paymentStatus === 'reversed') {
                  statusChip = <Chip label="Reversed" size="small" color="error" sx={{ ml: 1 }} />;
                } else if (contribution.paymentStatus === 'refunded') {
                  statusChip = <Chip label="Refunded" size="small" color="default" sx={{ ml: 1 }} />;
                }

                return (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          {formatCurrency(contribution.amount)}
                          {statusChip}
                        </Box>
                      }
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
          <DialogTitle>Authorize ACH Debit</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Contribute <strong>{formatCurrency(pendingAmount || 0)}</strong> toward{' '}
              <strong>{bucket.name}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              By clicking <strong>Authorize</strong>, you authorize AJOIN to electronically debit{' '}
              <strong>{formatCurrency(pendingAmount || 0)}</strong> from your{' '}
              {achInfo.bankName ? <strong>{achInfo.bankName}</strong> : 'bank'} account ending in{' '}
              <strong>{achInfo.last4 || '****'}</strong> on today's date. This debit is governed by
              the NACHA Rules and processed via Stripe.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Funds typically settle within 1–4 business days and will show as Pending until then.
              This authorization will remain in effect until you remove your linked bank account or
              cancel the contribution.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AJOIN is a technology platform and is not responsible for ACH processing delays,
              bank errors, or failed transfers. All payment processing is handled by Stripe.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirmAllocate}>
              Authorize
            </Button>
          </DialogActions>
        </Dialog>

        {/* Collect Confirmation Dialog */}
        <Dialog open={collectDialogOpen} onClose={() => setCollectDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirm Fund Collection</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Collect <strong>{formatCurrency(bucket.currentAmount)}</strong> from{' '}
              <strong>{bucket.name}</strong> to your connected payout account?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Collector: {(bucket.members || []).find(m => m.uid === collectorUid)?.displayName || 'You'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              By collecting, you confirm that all members have approved this transfer. AJOIN is a
              technology platform and is not responsible for Stripe transfer delays or errors.
              Payouts are governed by Stripe's terms and typically arrive within 2–7 business days.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCollectDialogOpen(false)} disabled={collecting}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleCollect}
              disabled={collecting}
              startIcon={collecting && <CircularProgress size={20} />}
            >
              {collecting ? 'Collecting...' : 'Confirm & Collect'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Bucket Dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Cancel & Refund Bucket?</DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              This action is irreversible. The bucket will be permanently cancelled.
            </Alert>
            <Typography variant="body2" sx={{ mb: 1 }}>
              All settled contributions will be refunded to their original payment methods.
              Refunds are processed by Stripe and typically take 5–10 business days to appear.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AJOIN is a technology platform and is not responsible for Stripe refund processing
              times or bank processing delays.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>Keep Bucket</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCancel}
              disabled={cancelling}
              startIcon={cancelling ? <CircularProgress size={20} /> : <CancelIcon />}
            >
              {cancelling ? 'Cancelling...' : 'Cancel & Refund'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Recurring Setup Dialog */}
        <Dialog open={recurringDialogOpen} onClose={() => { setRecurringDialogOpen(false); setRecurringAmount(''); }} maxWidth="xs" fullWidth>
          <DialogTitle>Set Up Recurring Contribution</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Amount per occurrence"
                type="number"
                value={recurringAmount}
                onChange={(e) => setRecurringAmount(e.target.value)}
                inputProps={{ min: 0.01, step: 0.01, ...(showShareEnforcement && myRemaining !== null ? { max: myRemaining } : {}) }}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
                helperText={showShareEnforcement && myRemaining !== null ? `Max per occurrence: ${formatCurrency(myRemaining)}` : undefined}
              />
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={recurringFrequency}
                  label="Frequency"
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="biweekly">Every 2 Weeks</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
              <Alert severity="info">
                <Typography variant="caption" component="div">
                  By clicking <strong>Authorize Recurring Debits</strong>, you authorize AJOIN to
                  electronically debit the above amount from your{' '}
                  {achInfo.bankName ? <strong>{achInfo.bankName}</strong> : 'bank'} account ending
                  in <strong>{achInfo.last4 || '****'}</strong> on a recurring{' '}
                  {recurringFrequency === 'biweekly' ? 'biweekly' : recurringFrequency} basis until
                  you cancel. This standing authorization is governed by the NACHA Rules and
                  processed via Stripe. You may cancel at any time from this page.
                </Typography>
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setRecurringDialogOpen(false); setRecurringAmount(''); }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSetupRecurring}
              disabled={savingRecurring || !recurringAmount || parseFloat(recurringAmount) <= 0}
              startIcon={savingRecurring ? <CircularProgress size={20} /> : <AutorenewIcon />}
            >
              {savingRecurring ? 'Setting up...' : 'Authorize Recurring Debits'}
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
