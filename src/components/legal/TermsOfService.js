import React from 'react';
import {
  Container,
  Box,
  Typography,
  Divider,
  Paper,
} from '@mui/material';
import Header from '../../Header';

const Section = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h6" gutterBottom fontWeight="bold">
      {title}
    </Typography>
    {children}
  </Box>
);

const TermsOfService = () => {
  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Paper elevation={2} sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Terms of Service
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Version 2.0 — effective March 2026
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="body1" sx={{ mb: 3 }}>
            Please read these Terms of Service ("Terms") carefully before using AJOIN
            ("the App", "we", "our", or "us"). By creating an account and using the App, you agree
            to be bound by these Terms. If you do not agree, do not use the App.
          </Typography>

          <Section title="1. Service Description">
            <Typography variant="body1" paragraph>
              AJOIN is a group savings goal coordination platform. The App allows users to set
              savings goals, track progress, coordinate group saving efforts with friends, and
              facilitate real ACH-based contributions via Stripe. The App is{' '}
              <strong>not a bank, credit union, or financial institution</strong>.
            </Typography>
            <Typography variant="body1">
              All payment processing, fund storage during transit, and payout disbursement is
              handled exclusively by Stripe, Inc. AJOIN does not hold, manage, or take custody
              of your money.
            </Typography>
          </Section>

          <Section title="2. Not FDIC Insured">
            <Typography variant="body1">
              The App is not a banking product and is <strong>not insured by the Federal Deposit
              Insurance Corporation (FDIC)</strong> or any other government agency. Funds are held
              by Stripe pending settlement. They are not FDIC-insured deposits. Your linked bank
              accounts and their balances are managed entirely by your financial institution.
            </Typography>
          </Section>

          <Section title="3. Fund Locking and Release Policy">
            <Typography variant="body1" paragraph>
              When you contribute to a bucket, a real ACH debit is initiated from your linked
              bank account via Stripe. <strong>Funds are locked until the savings goal is
              reached.</strong> You may not withdraw individual contributions once an ACH debit
              has been authorized and submitted.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>90-Day Inactivity Cancellation Window:</strong> If no contribution is made
              to a bucket for 90 consecutive days, the bucket owner may cancel the bucket and
              initiate refunds for all settled contributions. Refunds are processed by Stripe and
              typically take 5–10 business days to appear in the contributor's bank account.
            </Typography>
            <Typography variant="body1">
              AJOIN is not responsible for refund processing times, bank delays, or any losses
              arising from the refund process. Refund timelines are governed by Stripe's terms
              and applicable banking rules.
            </Typography>
          </Section>

          <Section title="4. ACH Authorization and NACHA Rules">
            <Typography variant="body1" paragraph>
              By authorizing a contribution, you authorize AJOIN (via Stripe) to electronically
              debit the specified amount from your linked bank account on the date of authorization.
              This debit is governed by the NACHA Rules (National Automated Clearing House
              Association) and processed via Stripe.
            </Typography>
            <Typography variant="body1" paragraph>
              You may revoke your ACH authorization at any time by removing your linked bank
              account from the App, provided that no ACH debit has already been submitted for
              processing. Once submitted, a debit cannot be revoked.
            </Typography>
            <Typography variant="body1">
              <strong>AJOIN is a technology platform and is not responsible for ACH processing
              delays, bank errors, or failed transfers.</strong> All payment processing is handled
              by Stripe. Failed transfers may result in your contribution not being credited to the
              bucket.
            </Typography>
          </Section>

          <Section title="5. Collective Approval Mechanism">
            <Typography variant="body1" paragraph>
              For shared savings buckets with more than one member, once the savings goal is
              reached, <strong>all members must vote to approve the designated collector before
              funds can be released.</strong> The required approval threshold (majority &gt;50%,
              two-thirds ≥67%, or unanimous 100%) is set by the bucket creator at the time of
              bucket creation.
            </Typography>
            <Typography variant="body1" paragraph>
              By casting an approval vote, you confirm your informed consent for the designated
              collector to receive the full balance of the bucket. You may change your vote at any
              time before the threshold is reached.
            </Typography>
            <Typography variant="body1">
              AJOIN is not responsible for disputes arising from the voting process, collector
              selection, or the distribution or use of collected funds after disbursement.
            </Typography>
          </Section>

          <Section title="6. Money Transmission Disclaimer">
            <Typography variant="body1">
              AJOIN is a technology platform and software service provider,{' '}
              <strong>not a money services business (MSB), bank, or financial institution.</strong>{' '}
              AJOIN does not hold, transmit, or take custody of user funds at any time. All
              payment processing, fund storage during transit, and payout disbursement is handled
              exclusively by Stripe, Inc. Use of AJOIN is subject to Stripe's Terms of Service
              and applicable financial regulations.
            </Typography>
          </Section>

          <Section title="7. No Guaranteed Returns">
            <Typography variant="body1">
              AJOIN does <strong>not offer interest, investment returns, dividends, or any
              financial yield</strong> on saved amounts. The App is strictly a savings goal
              coordination and contribution tool. Nothing in the App should be construed as
              financial advice or an investment solicitation.
            </Typography>
          </Section>

          <Section title="8. User Responsibilities">
            <Typography variant="body1" paragraph>
              You are solely responsible for:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                The accuracy of the bank account information you link to the App.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Maintaining the security of your account credentials and preventing unauthorized access.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Any decisions made based on balance information or contribution records displayed
                within the App.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Ensuring that group savings goals, collector designations, and approval thresholds
                are agreed upon by all participants before creation.
              </Typography>
              <Typography component="li" variant="body1">
                Maintaining sufficient funds in your linked bank account to cover authorized ACH debits.
              </Typography>
            </Box>
          </Section>

          <Section title="9. Third-Party Services">
            <Typography variant="body1">
              The App uses third-party services including Stripe (for payment processing and
              payouts), Plaid (for bank account connectivity), and Firebase (for authentication
              and data storage). Your use of these services through the App is also subject to
              their respective terms and privacy policies. We are not responsible for the
              availability, accuracy, or conduct of these third-party services.
            </Typography>
          </Section>

          <Section title="10. Limitation of Liability">
            <Typography variant="body1" paragraph>
              To the fullest extent permitted by law, AJOIN and its operators shall not be liable
              for any:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                ACH processing delays, bank errors, or failed or reversed transfers.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Refund processing times or delays in Stripe or bank refund settlement.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Chargeback outcomes, dispute resolutions, or amounts recovered or not recovered
                through dispute processes.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Financial losses arising from incorrect balance data provided by third-party services.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Losses resulting from outages or errors in Stripe, Plaid, Firebase, or other
                third-party systems.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Disputes between members of shared savings buckets, including disputes over
                collector designations or the use of collected funds.
              </Typography>
              <Typography component="li" variant="body1">
                Any indirect, incidental, special, or consequential damages arising from use of
                the App.
              </Typography>
            </Box>
          </Section>

          <Section title="11. Disputes and Chargebacks">
            <Typography variant="body1" paragraph>
              Payment disputes and chargebacks are handled by Stripe in accordance with Stripe's
              dispute resolution process and NACHA rules. AJOIN will cooperate with Stripe and
              relevant financial institutions in dispute investigations.
            </Typography>
            <Typography variant="body1">
              A successful chargeback may result in the reversal of a contribution and removal of
              the disputing user from the associated savings group. AJOIN reserves the right to
              suspend accounts with a history of chargebacks or disputed transactions.
            </Typography>
          </Section>

          <Section title="12. Account Termination">
            <Typography variant="body1">
              We reserve the right to suspend or terminate any account that we believe, in our sole
              discretion, is being used for fraudulent, abusive, or unlawful purposes. You may
              delete your account at any time from the Account Settings page. Account deletion does
              not automatically cancel pending ACH transactions.
            </Typography>
          </Section>

          <Section title="13. Data Privacy">
            <Typography variant="body1">
              We collect and store personal information including your email address, display name,
              and linked account metadata (account last four digits and bank name — full credentials
              are handled by Plaid or Stripe and never stored by AJOIN). We do not sell your data
              to third parties. All data is stored securely using Firebase infrastructure. By using
              the App you consent to this data handling as described in our Privacy Policy.
            </Typography>
          </Section>

          <Section title="14. Changes to These Terms">
            <Typography variant="body1">
              We may update these Terms from time to time. Material changes will require explicit
              re-acceptance within the App before continued use. Continued use of the App after
              acceptance constitutes agreement to the updated Terms.
            </Typography>
          </Section>

          <Section title="15. Contact">
            <Typography variant="body1">
              If you have questions about these Terms, need to report a stuck funds situation, or
              have concerns about a payment, please use the in-app Help &amp; Support page or the
              Request Funds Release feature available within any bucket.
            </Typography>
          </Section>

          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" color="text.secondary">
            By creating an account or continuing to use AJOIN, you acknowledge that you have read,
            understood, and agree to these Terms of Service.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Version 2.0 — effective March 2026
          </Typography>
        </Paper>
      </Container>
    </>
  );
};

export default TermsOfService;
