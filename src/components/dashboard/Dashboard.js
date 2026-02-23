import React, { useState } from 'react';
import { Container, Box, Typography, Paper, Button, Grid, Tooltip } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../../Header';
import PlaidLinkButton from '../plaid/PlaidLinkButton';
import AccountsList from '../plaid/AccountsList';
import CreateBucket from '../buckets/CreateBucket';
import BucketsList from '../buckets/BucketsList';
import FriendsManager from '../friends/FriendsManager';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [bucketsRefreshTrigger, setBucketsRefreshTrigger] = useState(0);
  const [createBucketOpen, setCreateBucketOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handlePlaidSuccess = (accounts) => {
    console.log('Successfully connected accounts:', accounts);
    // Trigger refresh of AccountsList
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBucketCreated = (bucket) => {
    console.log('Successfully created bucket:', bucket);
    // Trigger refresh of BucketsList
    setBucketsRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box>
          <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              Welcome, {currentUser?.displayName || 'User'}!
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Email: {currentUser?.email}
            </Typography>
            <Button variant="contained" color="primary" onClick={handleLogout} sx={{ mt: 2 }}>
              Log Out
            </Button>
          </Paper>

          {/* Buckets Section — top of dashboard */}
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">My Buckets</Typography>
              <Tooltip title="Create a new savings goal bucket">
                <Button variant="outlined" size="small" onClick={() => setCreateBucketOpen(true)}>
                  + New Bucket
                </Button>
              </Tooltip>
            </Box>
            <BucketsList refreshTrigger={bucketsRefreshTrigger} />
          </Paper>

          <Grid container spacing={3}>
            {/* Left Column - Actions */}
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <PlaidLinkButton onSuccess={handlePlaidSuccess} />
                  <Tooltip title="Manage friends, send invites, and accept bucket invitations">
                    <Button
                      variant="outlined"
                      onClick={() => setFriendsOpen(true)}
                    >
                      Friends
                    </Button>
                  </Tooltip>
                </Box>
              </Paper>
            </Grid>

            {/* Right Column - Accounts */}
            <Grid item xs={12} md={8}>
              <AccountsList refreshTrigger={refreshTrigger} />
            </Grid>
          </Grid>
        </Box>

        {/* Create Bucket Dialog */}
        <CreateBucket
          open={createBucketOpen}
          onClose={() => setCreateBucketOpen(false)}
          onSuccess={handleBucketCreated}
        />

        {/* Friends Manager Dialog */}
        <FriendsManager
          open={friendsOpen}
          onClose={() => setFriendsOpen(false)}
        />
      </Container>
    </>
  );
};

export default Dashboard;
