import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import SavingsIcon from '@mui/icons-material/Savings';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BucketRing = ({ bucket, onClick }) => {
  const progress = Math.min((bucket.currentAmount / bucket.goalAmount) * 100, 100);

  const ringColor =
    bucket.status === 'completed' ? '#4caf50' :
    bucket.status === 'collected' ? '#9e9e9e' :
    '#1976d2';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        p: 1.5,
        borderRadius: 3,
        minWidth: 130,
        transition: 'background 0.15s',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* Ring with percentage */}
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
        {/* Background track */}
        <CircularProgress
          variant="determinate"
          value={100}
          size={110}
          thickness={4}
          sx={{ color: 'grey.200', position: 'absolute', top: 0, left: 0 }}
        />
        {/* Progress arc */}
        <CircularProgress
          variant="determinate"
          value={progress}
          size={110}
          thickness={4}
          sx={{ color: ringColor }}
        />
        {/* Center content */}
        <Box
          sx={{
            top: 0, left: 0, bottom: 0, right: 0,
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1 }}>
            {Math.round(progress)}%
          </Typography>
          {bucket.isShared && (
            <GroupIcon sx={{ fontSize: 14, color: 'text.secondary', mt: 0.3 }} />
          )}
        </Box>
      </Box>

      {/* Bucket name */}
      <Typography
        variant="body2"
        fontWeight="medium"
        textAlign="center"
        sx={{
          maxWidth: 110,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {bucket.name}
      </Typography>

      {/* Status chip */}
      {bucket.status === 'completed' && (
        <Chip label="Goal Reached!" color="success" size="small" sx={{ mt: 0.5 }} />
      )}
    </Box>
  );
};

const BucketsList = ({ refreshTrigger }) => {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const fetchBuckets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets`, {
        headers: { Authorization: `Bearer ${token}` },
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

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets, refreshTrigger]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={3}>
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

  const activeBuckets = buckets.filter(b => b.status !== 'collected');

  if (activeBuckets.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        py={4}
        sx={{ color: 'text.secondary' }}
      >
        <SavingsIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
        <Typography variant="body2">No buckets yet — create one to get started!</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        overflowX: 'auto',
        pb: 1,
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'grey.300' },
      }}
    >
      {activeBuckets.map(bucket => (
        <BucketRing
          key={bucket.id}
          bucket={bucket}
          onClick={() => navigate(`/buckets/${bucket.id}`)}
        />
      ))}
    </Box>
  );
};

export default BucketsList;
