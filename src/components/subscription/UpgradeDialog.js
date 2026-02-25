import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAuth } from '../../contexts/AuthContext';

const BENEFITS = [
  'Unlimited savings groups',
  'Advanced member permissions',
  'Priority support',
  'Early access to new features',
];

const UpgradeDialog = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Upgrade to AJOIN Plus</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          You've reached the free plan limit of 1 group.
        </Typography>
        <List dense disablePadding sx={{ my: 1 }}>
          {BENEFITS.map(benefit => (
            <ListItem key={benefit} disableGutters>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircleOutlineIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={benefit} />
            </ListItem>
          ))}
        </List>
        <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>
          $3–5 / month
        </Typography>
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Maybe Later
        </Button>
        <Button
          variant="contained"
          onClick={handleUpgrade}
          disabled={loading}
          startIcon={loading && <CircularProgress size={18} />}
        >
          {loading ? 'Redirecting...' : 'Upgrade Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpgradeDialog;
