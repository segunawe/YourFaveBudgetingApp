import React from 'react';
import { Container, Box, Typography, Paper, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../../Header';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
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

          <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="outlined">Connect Bank Account</Button>
              <Button variant="outlined">Create Bucket</Button>
              <Button variant="outlined">Create Group</Button>
            </Box>
          </Paper>

          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom>
              Getting Started
            </Typography>
            <Typography variant="body1" paragraph>
              1. Connect your bank account using Plaid
            </Typography>
            <Typography variant="body1" paragraph>
              2. Create savings buckets for your personal goals
            </Typography>
            <Typography variant="body1" paragraph>
              3. Invite friends to create group savings goals
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default Dashboard;
