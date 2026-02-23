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
            Last updated: February 2026
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="body1" sx={{ mb: 3 }}>
            Please read these Terms of Service ("Terms") carefully before using AJOIN
            ("the App", "we", "our", or "us"). By creating an account and using the App, you agree
            to be bound by these Terms.
          </Typography>

          <Section title="1. Service Description">
            <Typography variant="body1" paragraph>
              AJOIN is a personal and group savings goal tracking platform. The App
              allows users to set savings goals, track progress, and coordinate group saving efforts
              with friends. The App is <strong>not a bank, credit union, or financial institution</strong>.
            </Typography>
            <Typography variant="body1">
              We do not hold, manage, or have custody of your money. All fund allocations within
              the App are virtual tracking records that represent your stated intent to save. No
              actual funds are transferred through the App at this time.
            </Typography>
          </Section>

          <Section title="2. Not FDIC Insured">
            <Typography variant="body1">
              The App is not a banking product and is <strong>not insured by the Federal Deposit
              Insurance Corporation (FDIC)</strong> or any other government agency. Your linked bank
              accounts and their balances are managed entirely by your financial institution. We do
              not guarantee the safety, availability, or accuracy of any balance information
              retrieved through third-party services.
            </Typography>
          </Section>

          <Section title="3. Virtual Fund Allocation">
            <Typography variant="body1" paragraph>
              When you "allocate" funds to a bucket within the App, this is a <strong>virtual
              tracking action only</strong>. No money is moved, withheld, or transferred from your
              bank account. The allocation is a record of your savings intention.
            </Typography>
            <Typography variant="body1">
              Real fund movement and automated transfers are features planned for future service
              tiers and are not currently available. You remain in full control of your actual
              bank funds at all times.
            </Typography>
          </Section>

          <Section title="4. Goal-Based Fund Release">
            <Typography variant="body1">
              For shared savings buckets, funds will <strong>not be marked as dispersed unless the
              full savings goal is reached</strong>. If a group goal is not achieved by the target
              date, any allocated amounts remain as virtual records only, with no automatic action
              taken. Users may request a review of stuck funds through our support process.
            </Typography>
          </Section>

          <Section title="5. No Guaranteed Returns">
            <Typography variant="body1">
              AJOIN does <strong>not offer interest, investment returns, dividends,
              or any financial yield</strong> on saved amounts. The App is strictly a savings goal
              tracker and coordination tool. Nothing in the App should be construed as financial
              advice or an investment solicitation.
            </Typography>
          </Section>

          <Section title="6. User Responsibilities">
            <Typography variant="body1" paragraph>
              You are solely responsible for:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                The accuracy of the bank account information you link to the App via Plaid.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Maintaining the security of your account credentials.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Any decisions made based on balance information displayed within the App.
              </Typography>
              <Typography component="li" variant="body1">
                Ensuring that group savings goals and collector designations are agreed upon by
                all participants before creation.
              </Typography>
            </Box>
          </Section>

          <Section title="7. Third-Party Services">
            <Typography variant="body1">
              The App uses third-party services including Plaid (for bank account connectivity) and
              Firebase (for authentication and data storage). Your use of these services through
              the App is also subject to their respective terms and privacy policies. We are not
              responsible for the availability, accuracy, or conduct of these third-party services.
            </Typography>
          </Section>

          <Section title="8. Limitation of Liability">
            <Typography variant="body1" paragraph>
              To the fullest extent permitted by law, AJOIN and its operators shall
              not be liable for any:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                Financial losses arising from incorrect balance data provided by third-party services.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Losses resulting from outages or errors in Plaid, Firebase, or other third-party systems.
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Disputes between users of shared savings buckets.
              </Typography>
              <Typography component="li" variant="body1">
                Any indirect, incidental, special, or consequential damages arising from use of the App.
              </Typography>
            </Box>
          </Section>

          <Section title="9. Account Termination">
            <Typography variant="body1">
              We reserve the right to suspend or terminate any account that we believe, in our sole
              discretion, is being used for fraudulent, abusive, or unlawful purposes. You may
              delete your account at any time from the Account Settings page.
            </Typography>
          </Section>

          <Section title="10. Data Privacy">
            <Typography variant="body1">
              We collect and store personal information including your email address, display name,
              and linked account metadata (but not your full bank credentials — these are handled
              by Plaid). We do not sell your data to third parties. All data is stored securely
              using Firebase infrastructure. By using the App you consent to this data handling.
            </Typography>
          </Section>

          <Section title="11. Changes to These Terms">
            <Typography variant="body1">
              We may update these Terms from time to time. We will notify users of significant
              changes through the App. Continued use of the App after changes are posted constitutes
              acceptance of the updated Terms.
            </Typography>
          </Section>

          <Section title="12. Contact">
            <Typography variant="body1">
              If you have questions about these Terms or need to dispute a stuck funds situation,
              please use the in-app Help &amp; Support page or the Request Funds Release feature
              available within any bucket.
            </Typography>
          </Section>

          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" color="text.secondary">
            By creating an account, you acknowledge that you have read, understood, and agree to
            these Terms of Service.
          </Typography>
        </Paper>
      </Container>
    </>
  );
};

export default TermsOfService;
