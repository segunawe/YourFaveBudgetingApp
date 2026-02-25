import React, { useState, useEffect } from 'react';
import { Alert, Button, CircularProgress, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useAuth } from '../../contexts/AuthContext';

const ConnectOnboardingBanner = ({ onReady }) => {
  const { currentUser } = useAuth();
  const apiUrl = process.env.REACT_APP_API_URL;

  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${apiUrl}/stripe/connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(data);
      if (data.chargesEnabled) onReady();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Re-check if returning from Stripe Connect
    const params = new URLSearchParams(window.location.search);
    if (params.get('connect') === 'return') {
      fetchStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnboard = async () => {
    try {
      setOnboarding(true);
      setError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${apiUrl}/stripe/connect/onboard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setOnboarding(false);
    }
  };

  if (loading) {
    return (
      <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mb: 2 }}>
        Checking payout account…
      </Alert>
    );
  }

  if (status?.chargesEnabled) return null;

  return (
    <Alert
      severity="warning"
      icon={<PaymentsIcon />}
      sx={{ mb: 2 }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={handleOnboard}
          disabled={onboarding}
          startIcon={onboarding && <CircularProgress size={16} />}
        >
          {onboarding ? 'Redirecting…' : 'Set Up Payouts'}
        </Button>
      }
    >
      <Typography variant="body2">
        <strong>Set up your payout account</strong> to receive collected funds.
        {error && <span style={{ color: 'red' }}> {error}</span>}
      </Typography>
    </Alert>
  );
};

export default ConnectOnboardingBanner;
