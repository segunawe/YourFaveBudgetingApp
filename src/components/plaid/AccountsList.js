import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useAuth } from '../../contexts/AuthContext';

const AccountsList = ({ refreshTrigger }) => {
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  // Fetch accounts from backend
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/plaid/accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch accounts');
      }

      setAccounts(data.accounts || []);
      setTotalBalance(data.totalBalance || 0);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Sync accounts (refresh balances)
  const syncAccounts = async () => {
    try {
      setSyncing(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/plaid/sync-accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync accounts');
      }

      setAccounts(data.accounts || []);
      setTotalBalance(data.totalBalance || 0);
    } catch (err) {
      console.error('Error syncing accounts:', err);
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Load accounts on mount and when refreshTrigger changes
  useEffect(() => {
    fetchAccounts();
  }, [refreshTrigger, fetchAccounts]);

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Format account type
  const formatAccountType = (type, subtype) => {
    if (subtype) {
      return `${type} - ${subtype}`.toUpperCase();
    }
    return type.toUpperCase();
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

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <AccountBalanceWalletIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Connected Accounts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect your bank account to get started
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Total Balance Card */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ color: 'white', opacity: 0.9 }}>
            Total Balance
          </Typography>
          <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
            {formatCurrency(totalBalance)}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={syncAccounts}
            disabled={syncing}
            sx={{
              mt: 2,
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            {syncing ? 'Syncing...' : 'Sync Balances'}
          </Button>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <Typography variant="h6" gutterBottom>
        Connected Accounts ({accounts.length})
      </Typography>

      <Grid container spacing={2}>
        {accounts.map((account) => (
          <Grid item xs={12} md={6} key={account.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {account.name}
                    </Typography>
                    <Chip
                      label={formatAccountType(account.type, account.subtype)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  {account.mask && (
                    <Typography variant="body2" color="text.secondary">
                      ****{account.mask}
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Current Balance
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(account.balance.current, account.balance.currency)}
                    </Typography>
                  </Box>

                  {account.balance.available !== null && account.balance.available !== undefined && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Available Balance
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(account.balance.available, account.balance.currency)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AccountsList;
