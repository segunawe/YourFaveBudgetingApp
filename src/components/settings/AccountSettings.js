import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, TextField, Button, Divider,
  Alert, CircularProgress, Switch, FormControlLabel, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  updatePassword, reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../../Header';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkOffIcon from '@mui/icons-material/LinkOff';

const Section = ({ title, children }) => (
  <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
    <Typography variant="h6" fontWeight="bold" gutterBottom>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);

const AccountSettings = () => {
  const { currentUser, updateUserProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [savingName, setSavingName] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Linked accounts
  const [plaidItems, setPlaidItems] = useState([]);
  const [disconnecting, setDisconnecting] = useState(null);

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL;

  const getToken = () => currentUser.getIdToken();

  const showSuccess = (msg) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 4000);
  };

  const showError = (msg) => {
    setError(msg);
    setSuccess('');
  };

  // Load user settings from Firestore data
  useEffect(() => {
    const data = currentUser?.firestoreData;
    if (data) {
      if (data.notificationPrefs) {
        setNotifEmail(data.notificationPrefs.email ?? true);
        setNotifInApp(data.notificationPrefs.inApp ?? true);
      }
      if (data.plaidItems) {
        const items = Object.entries(data.plaidItems).map(([itemId, item]) => ({
          itemId,
          accounts: item.accounts || [],
          connectedAt: item.connectedAt,
        }));
        setPlaidItems(items);
      }
    }
  }, [currentUser]);

  const handleSaveName = async () => {
    if (!displayName.trim()) return showError('Display name cannot be empty');
    try {
      setSavingName(true);
      const token = await getToken();
      const res = await fetch(`${apiUrl}/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess('Display name updated');
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return showError('Fill in all password fields');
    if (newPassword !== confirmNewPassword) return showError('New passwords do not match');
    if (newPassword.length < 6) return showError('Password must be at least 6 characters');
    try {
      setSavingSecurity(true);
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showSuccess('Password updated');
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleSaveNotifs = async () => {
    try {
      setSavingNotifs(true);
      const token = await getToken();
      const res = await fetch(`${apiUrl}/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationPrefs: { email: notifEmail, inApp: notifInApp } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess('Notification preferences saved');
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleDisconnect = async (itemId) => {
    try {
      setDisconnecting(itemId);
      const token = await getToken();
      const res = await fetch(`${apiUrl}/plaid/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlaidItems(prev => prev.filter(i => i.itemId !== itemId));
      showSuccess('Account disconnected');
    } catch (err) {
      showError(err.message);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return showError('Enter your password to confirm');
    try {
      setDeleting(true);
      const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteAccount();
      navigate('/login');
    } catch (err) {
      showError(err.message);
      setDeleting(false);
    }
  };

  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Account Settings</Typography>

        {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Profile */}
        <Section title="Profile">
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              disabled={savingName}
            />
            <Button
              variant="contained"
              onClick={handleSaveName}
              disabled={savingName || displayName === currentUser?.displayName}
              sx={{ minWidth: 100, height: 56 }}
            >
              {savingName ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Email: {currentUser?.email}
          </Typography>
        </Section>

        {/* Security */}
        <Section title="Security">
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Change Password</Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              disabled={savingSecurity}
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              disabled={savingSecurity}
              helperText="At least 6 characters"
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              fullWidth
              disabled={savingSecurity}
            />
            <Button
              variant="outlined"
              onClick={handleChangePassword}
              disabled={savingSecurity || !newPassword || !currentPassword}
            >
              {savingSecurity ? <CircularProgress size={20} /> : 'Update Password'}
            </Button>
          </Box>
        </Section>

        {/* Notifications */}
        <Section title="Notification Preferences">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Notification delivery will be available in a future update.
          </Typography>
          <Box display="flex" flexDirection="column" gap={1} mb={2}>
            <FormControlLabel
              control={<Switch checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} />}
              label="Email notifications"
            />
            <FormControlLabel
              control={<Switch checked={notifInApp} onChange={(e) => setNotifInApp(e.target.checked)} />}
              label="In-app notifications"
            />
          </Box>
          <Button variant="outlined" onClick={handleSaveNotifs} disabled={savingNotifs}>
            {savingNotifs ? <CircularProgress size={20} /> : 'Save Preferences'}
          </Button>
        </Section>

        {/* Linked Accounts */}
        <Section title="Linked Bank Accounts">
          {plaidItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No linked accounts.</Typography>
          ) : (
            plaidItems.map(item => (
              <Box key={item.itemId} sx={{ mb: 2 }}>
                {item.accounts.map(account => (
                  <Box
                    key={account.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    <Box>
                      <Typography variant="body1">{account.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ****{account.mask} &middot; {account.subtype}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      startIcon={disconnecting === item.itemId ? <CircularProgress size={16} /> : <LinkOffIcon />}
                      onClick={() => handleDisconnect(item.itemId)}
                      disabled={disconnecting === item.itemId}
                    >
                      Disconnect
                    </Button>
                  </Box>
                ))}
              </Box>
            ))
          )}
        </Section>

        {/* Legal */}
        <Section title="Legal">
          <Typography variant="body2">
            Review our{' '}
            <Link to="/terms" style={{ textDecoration: 'none' }}>
              Terms of Service
            </Link>
            {' '}at any time.
          </Typography>
          {currentUser?.firestoreData?.termsAcceptedAt && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You agreed to the Terms of Service on{' '}
              {new Date(
                currentUser.firestoreData.termsAcceptedAt?.toDate?.() ||
                currentUser.firestoreData.termsAcceptedAt
              ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          )}
        </Section>

        {/* Danger Zone */}
        <Section title="Danger Zone">
          <Alert severity="warning" sx={{ mb: 2 }}>
            Deleting your account is permanent. All your buckets and data will be removed.
          </Alert>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
          </Button>
        </Section>

        {/* Delete Account Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete Account?</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              This will permanently delete your account, all buckets you own, and all your data.
              This cannot be undone.
            </Typography>
            <TextField
              label="Enter your password to confirm"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              fullWidth
              disabled={deleting}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setDeleteDialogOpen(false); setDeletePassword(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="error"
              variant="contained"
              disabled={deleting || !deletePassword}
              startIcon={deleting && <CircularProgress size={20} />}
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default AccountSettings;
