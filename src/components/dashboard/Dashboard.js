import React, { useState } from 'react';
import { Container, Box, Typography, Paper, Button, Tooltip } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../Header';
import CreateBucket from '../buckets/CreateBucket';
import BucketsList from '../buckets/BucketsList';
import FriendsManager from '../friends/FriendsManager';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [bucketsRefreshTrigger, setBucketsRefreshTrigger] = useState(0);
  const [createBucketOpen, setCreateBucketOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const handleBucketCreated = () => {
    setBucketsRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Welcome, {currentUser?.displayName || 'User'}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {currentUser?.email}
          </Typography>
        </Paper>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">My Buckets</Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Manage friends and bucket invitations">
                <Button variant="outlined" size="small" onClick={() => setFriendsOpen(true)}>
                  Friends
                </Button>
              </Tooltip>
              <Tooltip title="Create a new savings goal bucket">
                <Button variant="contained" size="small" onClick={() => setCreateBucketOpen(true)}>
                  + New Bucket
                </Button>
              </Tooltip>
            </Box>
          </Box>
          <BucketsList refreshTrigger={bucketsRefreshTrigger} />
        </Paper>

        <CreateBucket
          open={createBucketOpen}
          onClose={() => setCreateBucketOpen(false)}
          onSuccess={handleBucketCreated}
        />

        <FriendsManager
          open={friendsOpen}
          onClose={() => setFriendsOpen(false)}
        />
      </Container>
    </>
  );
};

export default Dashboard;
