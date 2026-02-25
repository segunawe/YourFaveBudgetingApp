import React, { useEffect } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const UpgradeSuccess = () => {
  const { refreshUserData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="80vh"
      gap={2}
      px={3}
      textAlign="center"
    >
      <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main' }} />
      <Typography variant="h4" fontWeight="bold">
        You're now on AJOIN Plus!
      </Typography>
      <Typography variant="body1" color="text.secondary">
        You can now create unlimited savings groups.
      </Typography>
      <Button variant="contained" size="large" onClick={() => navigate('/dashboard')}>
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default UpgradeSuccess;
