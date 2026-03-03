import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import TosReacceptanceModal from '../legal/TosReacceptanceModal';
import { TOS_VERSION } from '../../constants/tos';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const firestoreData = currentUser.firestoreData;
  const needsTosUpdate = firestoreData && firestoreData.tosVersion !== TOS_VERSION;

  return (
    <>
      <TosReacceptanceModal open={!!needsTosUpdate} />
      {!needsTosUpdate && children}
    </>
  );
};

export default ProtectedRoute;
