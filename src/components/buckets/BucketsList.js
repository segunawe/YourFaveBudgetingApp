import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BucketsList = ({ refreshTrigger }) => {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch buckets from backend
  const fetchBuckets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch buckets');
      }

      setBuckets(data.buckets || []);
    } catch (err) {
      console.error('Error fetching buckets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load buckets on mount and when refreshTrigger changes
  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets, refreshTrigger]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate progress percentage
  const getProgressPercentage = (current, goal) => {
    return Math.min((current / goal) * 100, 100);
  };

  // Calculate days remaining
  const getDaysRemaining = (targetDate) => {
    if (!targetDate) return null;

    const target = targetDate.toDate ? targetDate.toDate() : new Date(targetDate);
    const now = new Date();
    const diff = target - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days;
  };

  // Get status indicator
  const getStatusChip = (bucket) => {
    const moneyProgress = getProgressPercentage(bucket.currentAmount, bucket.goalAmount);

    // Completed
    if (bucket.status === 'completed') {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Goal Reached!"
          color="success"
          size="small"
        />
      );
    }

    // No target date
    if (!bucket.targetDate) {
      return (
        <Chip
          label={`${moneyProgress.toFixed(0)}% Complete`}
          color="primary"
          size="small"
        />
      );
    }

    const daysRemaining = getDaysRemaining(bucket.targetDate);

    // Overdue
    if (daysRemaining < 0) {
      return (
        <Chip
          icon={<TrendingDownIcon />}
          label={`${Math.abs(daysRemaining)} days overdue`}
          color="error"
          size="small"
        />
      );
    }

    // Calculate time progress
    const target = bucket.targetDate.toDate ? bucket.targetDate.toDate() : new Date(bucket.targetDate);
    const created = bucket.createdAt.toDate ? bucket.createdAt.toDate() : new Date(bucket.createdAt);
    const totalTime = target - created;
    const elapsedTime = new Date() - created;
    const timeProgress = (elapsedTime / totalTime) * 100;

    // On track or ahead
    if (moneyProgress >= timeProgress) {
      return (
        <Chip
          icon={<TrendingUpIcon />}
          label={`On Track - ${daysRemaining} days left`}
          color="success"
          size="small"
        />
      );
    }

    // Behind schedule
    return (
      <Chip
        icon={<TrendingDownIcon />}
        label={`Behind - ${daysRemaining} days left`}
        color="warning"
        size="small"
      />
    );
  };

  // Calculate suggested contribution
  const getSuggestedContribution = (bucket) => {
    if (!bucket.targetDate || bucket.status === 'completed') return null;

    const daysRemaining = getDaysRemaining(bucket.targetDate);
    if (daysRemaining <= 0) return null;

    const remainingAmount = bucket.goalAmount - bucket.currentAmount;
    const weeksRemaining = daysRemaining / 7;

    if (weeksRemaining < 1) {
      return `Save ${formatCurrency(remainingAmount)} in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
    }

    const perWeek = remainingAmount / weeksRemaining;
    return `Save ${formatCurrency(perWeek)}/week`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  if (buckets.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <SavingsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Buckets Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first savings bucket to get started!
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Filter active vs completed
  const activeBuckets = buckets.filter(b => b.status === 'active' || b.status === 'completed');

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        My Buckets ({activeBuckets.length})
      </Typography>

      <Grid container spacing={3}>
        {activeBuckets.map((bucket) => (
          <Grid item xs={12} md={6} key={bucket.id}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate(`/buckets/${bucket.id}`)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {bucket.name}
                    </Typography>
                    {bucket.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {bucket.description}
                      </Typography>
                    )}
                  </Box>
                  {getStatusChip(bucket)}
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(bucket.currentAmount)} / {formatCurrency(bucket.goalAmount)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressPercentage(bucket.currentAmount, bucket.goalAmount)}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={bucket.status === 'completed' ? 'success' : 'primary'}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {getProgressPercentage(bucket.currentAmount, bucket.goalAmount).toFixed(1)}% complete
                  </Typography>
                </Box>

                {/* Suggested Contribution */}
                {getSuggestedContribution(bucket) && (
                  <Box
                    sx={{
                      bgcolor: 'primary.lighter',
                      p: 1,
                      borderRadius: 1,
                      mt: 2,
                    }}
                  >
                    <Typography variant="body2" color="primary.main">
                      💡 {getSuggestedContribution(bucket)}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default BucketsList;
