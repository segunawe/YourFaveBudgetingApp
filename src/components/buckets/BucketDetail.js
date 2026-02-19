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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
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

  // Fetch bucket details
  const fetchBucket = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bucket');
      }

      setBucket(data);
    } catch (err) {
      console.error('Error fetching bucket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBucket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle allocate funds
  const handleAllocate = async (e) => {
    e.preventDefault();

    const amount = parseFloat(allocateAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setAllocating(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to allocate funds');
      }

      // Refresh bucket data
      await fetchBucket();

      // Reset form
      setAllocateAmount('');
    } catch (err) {
      console.error('Error allocating funds:', err);
      setError(err.message);
    } finally {
      setAllocating(false);
    }
  };

  // Handle collect funds
  const handleCollect = async () => {
    try {
      setCollecting(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}/collect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to collect funds');
      }

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error collecting funds:', err);
      setError(err.message);
    } finally {
      setCollecting(false);
    }
  };

  // Handle delete bucket
  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete bucket');
      }

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting bucket:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'No target date';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate progress
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

  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 3 }}
        >
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
              <Typography variant="h4" gutterBottom>
                {bucket.name}
              </Typography>
              {bucket.description && (
                <Typography variant="body1" color="text.secondary">
                  {bucket.description}
                </Typography>
              )}
            </Box>
            {bucket.status === 'completed' && (
              <Chip
                icon={<CheckCircleIcon />}
                label="Goal Reached!"
                color="success"
                size="large"
              />
            )}
          </Box>

          {/* Progress */}
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="h6" color="primary">
                {formatCurrency(bucket.currentAmount)}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                of {formatCurrency(bucket.goalAmount)}
              </Typography>
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

          {/* Target Date */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" color="text.secondary">
              Target Date: {formatDate(bucket.targetDate)}
            </Typography>
            {bucket.status === 'completed' && (
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
            <Typography variant="h6" gutterBottom>
              Add Funds
            </Typography>
            <form onSubmit={handleAllocate}>
              <Box display="flex" gap={2}>
                <TextField
                  label="Amount"
                  type="number"
                  value={allocateAmount}
                  onChange={(e) => setAllocateAmount(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  placeholder="0.00"
                  disabled={allocating}
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={allocating || !allocateAmount}
                  startIcon={allocating ? <CircularProgress size={20} /> : <AddIcon />}
                  sx={{ minWidth: 150 }}
                >
                  {allocating ? 'Adding...' : 'Add Funds'}
                </Button>
              </Box>
            </form>
          </Paper>
        )}

        {/* Contribution History */}
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Contribution History
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {bucket.contributions && bucket.contributions.length > 0 ? (
            <List>
              {bucket.contributions.map((contribution, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={formatCurrency(contribution.amount)}
                    secondary={new Date(contribution.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No contributions yet
            </Typography>
          )}
        </Paper>

        {/* Delete Bucket */}
        <Box textAlign="center">
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleting}
          >
            Delete Bucket
          </Button>
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Bucket?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{bucket.name}"?
              {bucket.currentAmount > 0 && ` The ${formatCurrency(bucket.currentAmount)} allocated to this bucket will be freed up.`}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={deleting}
              startIcon={deleting && <CircularProgress size={20} />}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default BucketDetail;
