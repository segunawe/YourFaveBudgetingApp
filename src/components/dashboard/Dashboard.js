import React, { useState } from 'react';
import { Container, Box, Typography, Paper, Button, Grid } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../../Header';
import PlaidLinkButton from '../plaid/PlaidLinkButton';
import AccountsList from '../plaid/AccountsList';
import CreateBucket from '../buckets/CreateBucket';
import BucketsList from '../buckets/BucketsList';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [bucketsRefreshTrigger, setBucketsRefreshTrigger] = useState(0);
  const [createBucketOpen, setCreateBucketOpen] = useState(false);

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

          <Grid container spacing={3}>
            {/* Left Column - Actions */}
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <PlaidLinkButton onSuccess={handlePlaidSuccess} />
                  <Button
                    variant="outlined"
                    onClick={() => setCreateBucketOpen(true)}
                  >
                    Create Bucket
                  </Button>
                  <Button variant="outlined" disabled>
                    Create Group
                  </Button>
                </Box>
              </Paper>

              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Getting Started
                </Typography>
                <Typography variant="body2" paragraph>
                  1. Connect your bank account using Plaid
                </Typography>
                <Typography variant="body2" paragraph>
                  2. Create savings buckets for your personal goals
                </Typography>
                <Typography variant="body2" paragraph>
                  3. Invite friends to create group savings goals
                </Typography>
              </Paper>
            </Grid>

            {/* Right Column - Accounts */}
            <Grid item xs={12} md={8}>
              <AccountsList refreshTrigger={refreshTrigger} />
            </Grid>
          </Grid>

          {/* Buckets Section */}
          <Box sx={{ mt: 4 }}>
            <BucketsList refreshTrigger={bucketsRefreshTrigger} />
          </Box>
        </Box>

        {/* Create Bucket Dialog */}
        <CreateBucket
          open={createBucketOpen}
          onClose={() => setCreateBucketOpen(false)}
          onSuccess={handleBucketCreated}
        />
      </Container>
    </>
  );
};

export default Dashboard;
