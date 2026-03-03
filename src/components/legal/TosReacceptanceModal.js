import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { TOS_VERSION } from '../../constants/tos';

const TosReacceptanceModal = ({ open }) => {
  const { currentUser, logout, refreshUserData } = useAuth();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const contentRef = useRef(null);

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    if (atBottom) setScrolledToBottom(true);
  };

  const handleAccept = async () => {
    try {
      setAccepting(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${process.env.REACT_APP_API_URL}/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tosVersion: TOS_VERSION, termsAcceptedAt: true }),
      });
      if (!res.ok) throw new Error('Failed to record acceptance');
      await refreshUserData();
    } catch (err) {
      console.error('Error accepting ToS:', err);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setDeclining(true);
      await logout();
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setDeclining(false);
    }
  };

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={() => {}}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Updated Terms of Service</DialogTitle>
      <DialogContent
        ref={contentRef}
        onScroll={handleScroll}
        sx={{ maxHeight: 400, overflowY: 'auto' }}
      >
        <Typography variant="body2" color="text.secondary" gutterBottom>
          We've updated our Terms of Service (Version {TOS_VERSION}, effective March 2026).
          Please read and accept the updated terms to continue using AJOIN.
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>1. Service Description</Typography>
        <Typography variant="body2" paragraph>
          AJOIN is a group savings goal coordination platform. The App is not a bank, credit union,
          or financial institution. All payment processing is handled exclusively by Stripe, Inc.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>2. Not FDIC Insured</Typography>
        <Typography variant="body2" paragraph>
          The App is not a banking product and is not insured by the FDIC or any other government
          agency. Funds are held by Stripe pending settlement. They are not FDIC-insured deposits.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>3. Fund Locking and Release Policy</Typography>
        <Typography variant="body2" paragraph>
          When you contribute to a bucket, real ACH debits are initiated via Stripe. Funds are locked
          until the savings goal is reached. If no contribution is made for 90 consecutive days, the
          bucket owner may cancel the bucket and request refunds for all settled contributions.
          Refunds are processed by Stripe and typically take 5–10 business days.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>4. ACH Authorization and NACHA Rules</Typography>
        <Typography variant="body2" paragraph>
          By authorizing a contribution, you authorize AJOIN (via Stripe) to electronically debit
          the specified amount from your linked bank account. This debit is governed by the NACHA
          Rules. You may revoke authorization by removing your linked bank account. AJOIN is a
          technology platform and is not responsible for ACH processing delays, bank errors, or
          failed transfers. All payment processing is handled by Stripe.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>5. Collective Approval Mechanism</Typography>
        <Typography variant="body2" paragraph>
          For shared buckets, once the savings goal is reached, all members must vote to approve
          the designated collector before funds can be released. By approving, you confirm your
          consent for the designated collector to receive the full balance. The required approval
          threshold (majority, two-thirds, or unanimous) is set at bucket creation.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>6. Money Transmission Disclaimer</Typography>
        <Typography variant="body2" paragraph>
          AJOIN is a technology platform and software service provider, not a money services
          business (MSB), bank, or financial institution. AJOIN does not hold, transmit, or take
          custody of user funds. All payment processing, fund storage during transit, and payout
          disbursement is handled exclusively by Stripe, Inc.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>7. No Guaranteed Returns</Typography>
        <Typography variant="body2" paragraph>
          AJOIN does not offer interest, investment returns, dividends, or any financial yield on
          saved amounts. Nothing in the App constitutes financial advice or an investment solicitation.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>8. User Responsibilities</Typography>
        <Typography variant="body2" paragraph>
          You are solely responsible for the accuracy of linked bank account information, the
          security of your credentials, any decisions made based on balance information displayed,
          and ensuring group savings goals and collector designations are agreed upon by all participants.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>9. Third-Party Services</Typography>
        <Typography variant="body2" paragraph>
          The App uses Stripe (payment processing), Plaid (bank connectivity), and Firebase
          (authentication and data storage). We are not responsible for the availability, accuracy,
          or conduct of these third-party services.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>10. Limitation of Liability</Typography>
        <Typography variant="body2" paragraph>
          To the fullest extent permitted by law, AJOIN shall not be liable for: ACH processing
          delays or bank errors; failed or reversed transfers; refund processing times; chargeback
          outcomes; financial losses from third-party service errors; or disputes between group
          members. All payment processing risk is borne by the user.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>11. Disputes and Chargebacks</Typography>
        <Typography variant="body2" paragraph>
          Payment disputes and chargebacks are handled by Stripe. AJOIN will cooperate with Stripe
          in dispute resolution. Chargebacks may result in contribution reversal and removal from
          a savings group.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>12. Account Termination</Typography>
        <Typography variant="body2" paragraph>
          We reserve the right to suspend or terminate accounts used for fraudulent, abusive, or
          unlawful purposes. You may delete your account at any time from Account Settings.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>13. Data Privacy</Typography>
        <Typography variant="body2" paragraph>
          We collect your email, display name, and linked account metadata. We do not sell your
          data to third parties. All data is stored securely using Firebase infrastructure.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>14. Changes to These Terms</Typography>
        <Typography variant="body2" paragraph>
          We may update these Terms from time to time. Material changes require re-acceptance within
          the App. Continued use after acceptance constitutes agreement to the updated Terms.
        </Typography>

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Version {TOS_VERSION} — effective March 2026
        </Typography>
      </DialogContent>

      <Box sx={{ px: 2, pb: 1 }}>
        {!scrolledToBottom && (
          <Typography variant="caption" color="text.secondary">
            Scroll to the bottom to enable the Accept button.
          </Typography>
        )}
      </Box>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleDecline} color="inherit" disabled={declining || accepting}>
          {declining ? <CircularProgress size={20} /> : 'Decline & Log Out'}
        </Button>
        <Button
          variant="contained"
          onClick={handleAccept}
          disabled={!scrolledToBottom || accepting || declining}
          startIcon={accepting && <CircularProgress size={20} />}
        >
          {accepting ? 'Saving...' : 'Accept'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TosReacceptanceModal;
