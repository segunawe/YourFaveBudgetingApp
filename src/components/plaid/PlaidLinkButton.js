import React, { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button, CircularProgress, Alert } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useAuth } from '../../contexts/AuthContext';

const PlaidLinkButton = ({ onSuccess }) => {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  // Fetch link token from backend
  const fetchLinkToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/plaid/create-link-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create link token');
      }

      setLinkToken(data.linkToken);
    } catch (err) {
      console.error('Error fetching link token:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle successful Plaid Link flow
  const onSuccessCallback = useCallback(async (publicToken, metadata) => {
    try {
      setLoading(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/plaid/exchange-public-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ publicToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect account');
      }

      // Notify parent component of success
      if (onSuccess) {
        onSuccess(data.accounts);
      }

      setLinkToken(null); // Reset for next connection
    } catch (err) {
      console.error('Error exchanging token:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, onSuccess]);

  // Initialize Plaid Link
  const config = {
    token: linkToken,
    onSuccess: onSuccessCallback,
    onExit: (err, metadata) => {
      if (err) {
        console.error('Plaid Link exit error:', err);
        setError('Failed to connect bank account');
      }
      setLinkToken(null);
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Handle button click
  const handleClick = () => {
    if (linkToken) {
      open();
    } else {
      fetchLinkToken();
    }
  };

  // Auto-open when link token is ready
  React.useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AccountBalanceIcon />}
        onClick={handleClick}
        disabled={loading}
        fullWidth
      >
        {loading ? 'Connecting...' : 'Connect Bank Account'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </>
  );
};

export default PlaidLinkButton;
