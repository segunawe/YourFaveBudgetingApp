import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, TextField, Button, Divider,
  Alert, CircularProgress, Switch, FormControlLabel, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip,
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
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import UpgradeDialog from '../subscription/UpgradeDialog';
import stripePromise from '../../config/stripe';

const Section = ({ title, children }) => (
  <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
    <Typography variant="h6" fontWeight="bold" gutterBottom>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);

const AccountSettings = () => {
  const { currentUser, deleteAccount } = useAuth();
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

  // ACH bank account
  const [achLinking, setAchLinking] = useState(false);
  const [achRemoving, setAchRemoving] = useState(false);
  const achPaymentMethodId = currentUser?.firestoreData?.stripeAchPaymentMethodId || null;
  const achLast4 = currentUser?.firestoreData?.stripeAchAccountLast4 || null;
  const achBankName = currentUser?.firestoreData?.stripeAchBankName || null;

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Plan / Subscription
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const tier = currentUser?.firestoreData?.tier || 'free';

  // Payout Account (Connect)
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [connectOnboarding, setConnectOnboarding] = useState(false);

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

  const fetchConnectStatus = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/stripe/connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setConnectStatus(data);
    } catch (err) {
      console.error('Failed to load Connect status:', err);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleConnectOnboard = async () => {
    try {
      setConnectOnboarding(true);
      const token = await getToken();
      const res = await fetch(`${apiUrl}/stripe/connect/onboard`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      showError(err.message);
      setConnectOnboarding(false);
    }
  };

  // Load user settings from Firestore data
  useEffect(() => {
    const data = currentUser?.firestoreData;
    if (data?.notificationPrefs) {
      setNotifEmail(data.notificationPrefs.email ?? true);
      setNotifInApp(data.notificationPrefs.inApp ?? true);
    }
    fetchConnectStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleLinkBank = async () => {
    try {
      setAchLinking(true);
      setError('');
      const token = await getToken();
      const stripe = await stripePromise;

      const siRes = await fetch(`${apiUrl}/stripe/create-setup-intent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const siData = await siRes.json();
      if (!siRes.ok) throw new Error(siData.error || 'Failed to start bank linking');

      const { setupIntent: collected, error: collectError } = await stripe.collectBankAccountForSetup({
        clientSecret: siData.clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              name: currentUser.displayName || currentUser.email,
              email: currentUser.email,
            },
          },
        },
      });
      if (collectError) throw new Error(collectError.message);
      if (collected.status === 'canceled') return;

      const { setupIntent: confirmed, error: confirmError } = await stripe.confirmUsBankAccountSetup(
        siData.clientSecret
      );
      if (confirmError) throw new Error(confirmError.message);
      if (confirmed.status !== 'succeeded') {
        throw new Error(`Setup did not complete (status: ${confirmed.status})`);
      }

      const finalizeRes = await fetch(`${apiUrl}/stripe/finalize-ach-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ setupIntentId: confirmed.id }),
      });
      const finalizeData = await finalizeRes.json();
      if (!finalizeRes.ok) throw new Error(finalizeData.error || 'Failed to save bank account');

      showSuccess(`Bank account linked — ${finalizeData.bankName} ****${finalizeData.last4}`);
      // Trigger Firestore data refresh so UI updates
      window.location.reload();
    } catch (err) {
      showError(err.message);
    } finally {
      setAchLinking(false);
    }
  };

  const handleRemoveBank = async () => {
    try {
      setAchRemoving(true);
      const token = await getToken();
      const res = await fetch(`${apiUrl}/stripe/payment-method`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess('Bank account removed');
      window.location.reload();
    } catch (err) {
      showError(err.message);
    } finally {
      setAchRemoving(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const token = await getToken();
      const res = await fetch(`${apiUrl}/stripe/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      showError(err.message);
      setPortalLoading(false);
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

        {/* Bank Account for Contributions */}
        <Section title="Bank Account for Contributions">
          {achPaymentMethodId ? (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <AccountBalanceIcon color="action" />
                <Box>
                  <Typography variant="body1">
                    {achBankName || 'Bank account'} ****{achLast4}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Used for ACH contributions</Typography>
                </Box>
              </Box>
              <Button
                size="small"
                color="error"
                startIcon={achRemoving ? <CircularProgress size={16} /> : <LinkOffIcon />}
                onClick={handleRemoveBank}
                disabled={achRemoving}
              >
                Remove
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No bank account linked. Link one to make contributions to savings groups.
              </Typography>
              <Button
                variant="outlined"
                startIcon={achLinking ? <CircularProgress size={18} /> : <AccountBalanceIcon />}
                onClick={handleLinkBank}
                disabled={achLinking}
              >
                {achLinking ? 'Connecting…' : 'Link Bank Account'}
              </Button>
            </Box>
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

        {/* Plan */}
        <Section title="Plan">
          <UpgradeDialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)} />
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            {tier === 'plus' ? (
              <>
                <Chip label="AJOIN Plus" color="primary" />
                <Button
                  variant="outlined"
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  startIcon={portalLoading && <CircularProgress size={18} />}
                >
                  {portalLoading ? 'Loading...' : 'Manage Subscription'}
                </Button>
              </>
            ) : (
              <>
                <Chip label="Free Plan" variant="outlined" />
                <Button variant="contained" onClick={() => setUpgradeDialogOpen(true)}>
                  Upgrade to AJOIN Plus
                </Button>
              </>
            )}
          </Box>
        </Section>

        {/* Payout Account */}
        <Section title="Payout Account">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set up a payout account to receive funds when your savings group goal is collected.
          </Typography>
          {connectLoading ? (
            <CircularProgress size={24} />
          ) : connectStatus?.chargesEnabled ? (
            <Chip label="Payout account active" color="success" />
          ) : (
            <Button
              variant="outlined"
              onClick={handleConnectOnboard}
              disabled={connectOnboarding}
              startIcon={connectOnboarding && <CircularProgress size={18} />}
            >
              {connectOnboarding ? 'Redirecting...' : 'Set Up Payout Account'}
            </Button>
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
