import React, { useState } from 'react';
import { Alert, Button, CircularProgress, Typography } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useAuth } from '../../contexts/AuthContext';
import stripePromise from '../../config/stripe';

const AchSetupBanner = ({ onSetupComplete }) => {
  const { currentUser } = useAuth();
  const apiUrl = process.env.REACT_APP_API_URL;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLinkBank = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await currentUser.getIdToken();
      const stripe = await stripePromise;

      // 1. Create SetupIntent on the server
      const siRes = await fetch(`${apiUrl}/stripe/create-setup-intent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const siData = await siRes.json();
      if (!siRes.ok) throw new Error(siData.error || 'Failed to start bank linking');

      // 2. Open Stripe Financial Connections sheet
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
      if (collected.status === 'canceled') return; // user closed the sheet

      // 3. Confirm the SetupIntent (shows Stripe's mandate acceptance dialog)
      const { setupIntent: confirmed, error: confirmError } = await stripe.confirmUsBankAccountSetup(
        siData.clientSecret
      );
      if (confirmError) throw new Error(confirmError.message);
      if (confirmed.status !== 'succeeded') {
        throw new Error(`Setup did not complete (status: ${confirmed.status})`);
      }

      // 4. Tell the server to save PM details to Firestore
      const finalizeRes = await fetch(`${apiUrl}/stripe/finalize-ach-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ setupIntentId: confirmed.id }),
      });
      const finalizeData = await finalizeRes.json();
      if (!finalizeRes.ok) throw new Error(finalizeData.error || 'Failed to save bank account');

      onSetupComplete({ last4: finalizeData.last4, bankName: finalizeData.bankName });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Alert
      severity="info"
      icon={<AccountBalanceIcon />}
      sx={{ mb: 2 }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={handleLinkBank}
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? 'Connecting…' : 'Link Bank Account'}
        </Button>
      }
    >
      <Typography variant="body2">
        <strong>Link your bank account</strong> to make ACH contributions to this group.
        {error && <span style={{ color: 'red', marginLeft: 8 }}>{error}</span>}
      </Typography>
    </Alert>
  );
};

export default AchSetupBanner;
