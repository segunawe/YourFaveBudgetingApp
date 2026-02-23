import React, { useState } from 'react';
import {
  Container, Box, Typography, Paper, Accordion, AccordionSummary,
  AccordionDetails, Divider, Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SavingsIcon from '@mui/icons-material/Savings';
import GroupIcon from '@mui/icons-material/Group';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import StarIcon from '@mui/icons-material/Star';
import Header from '../../Header';
import { Link } from 'react-router-dom';

const faqs = [
  {
    question: 'What is a Bucket?',
    answer: 'A Bucket is a savings goal. You give it a name, a target amount, and an optional deadline. You then allocate funds toward it from your linked bank balance. The bucket tracks your progress until the goal is reached.',
  },
  {
    question: 'Does allocating funds actually move my money?',
    answer: 'Not yet. In the current version, fund allocation is a virtual tracking action. It records your intention to save a certain amount, but no money is moved from your bank account. Real fund transfers are coming in a future version.',
  },
  {
    question: 'What is a shared bucket?',
    answer: 'A shared bucket is a savings goal that multiple people contribute to together. The owner creates the bucket and invites friends. Each member can allocate funds from their own bank balance toward the shared goal.',
  },
  {
    question: 'Who is the Collector?',
    answer: 'The Collector is the person designated to "collect" (finalize) the funds once the goal is reached. By default this is the bucket owner, but the owner can change it to any member. Only the collector can trigger the collection.',
  },
  {
    question: 'What happens if the goal is not reached by the target date?',
    answer: 'If the savings goal is not fully reached by the target date, funds are not dispersed. You can submit a "Request Funds Release" from the bucket detail page to contact support and have your allocated amount reviewed.',
  },
  {
    question: 'What is the transaction limit?',
    answer: 'A transaction limit is a safety cap you can set on how much you can allocate in a single action. For example, setting a $500 limit means no single allocation can exceed $500. You can set or remove this limit in Account Settings.',
  },
  {
    question: 'How do I add friends?',
    answer: 'Click the "Friends" button on the dashboard. Go to the "Add Friend" tab and enter your friend\'s email address. They\'ll receive a friend request and can accept or decline from their Friends panel.',
  },
  {
    question: 'How do I invite a friend to an existing bucket?',
    answer: 'Open the bucket detail page and click "Invite Friend" in the Members section. You can invite any friend who is not already a member. They\'ll receive a bucket invite and must accept before they appear as a member.',
  },
  {
    question: 'How do I disconnect a bank account?',
    answer: 'Go to Account Settings → Linked Bank Accounts and click "Disconnect" next to the account you want to remove.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use Firebase for secure authentication and data storage, and Plaid for bank connectivity. We never store your full bank credentials. See our Terms of Service for full details.',
  },
  {
    question: 'How do I delete my account?',
    answer: 'Go to Account Settings → Danger Zone → Delete Account. You\'ll be asked to confirm with your password. This action is permanent and removes all your data.',
  },
];

const FeatureCard = ({ icon, title, description }) => (
  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
    <Box sx={{ color: 'primary.main', mt: 0.3 }}>{icon}</Box>
    <Box>
      <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
    </Box>
  </Box>
);

const HelpPage = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Help & Support</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Everything you need to know about using YourFaveBudgetingApp.
        </Typography>

        {/* Feature Guide */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>How the App Works</Typography>
          <Divider sx={{ mb: 3 }} />
          <FeatureCard
            icon={<AccountBalanceIcon />}
            title="Connect Your Bank"
            description="Link your bank account via Plaid to see your balance. This lets the app track how much you have available to allocate toward your goals."
          />
          <FeatureCard
            icon={<SavingsIcon />}
            title="Create Savings Buckets"
            description="Set a name, goal amount, and optional target date. Allocate funds from your bank balance toward the goal and watch your progress ring fill up."
          />
          <FeatureCard
            icon={<GroupIcon />}
            title="Save with Friends"
            description="Invite friends to a shared bucket. Each member contributes from their own balance. Everyone can see progress, but only the designated Collector can finalize the funds."
          />
          <FeatureCard
            icon={<StarIcon />}
            title="Collector & Goal Release"
            description="The Collector is the person who collects the funds when the goal is reached. The bucket owner can assign any member as the Collector. Funds are only released when the full goal amount is met."
          />
        </Paper>

        {/* FAQ */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Frequently Asked Questions</Typography>
          <Divider sx={{ mb: 2 }} />
          {faqs.map((faq, i) => (
            <Accordion
              key={i}
              expanded={expanded === i}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? i : false)}
              elevation={0}
              sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', mb: 1, borderRadius: '8px !important' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body1" fontWeight="medium">{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>

        {/* Support Contact */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Still Need Help?</Typography>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="info" sx={{ mb: 2 }}>
            If your funds appear stuck in a bucket that hasn't reached its goal, open the bucket and use the "Request Funds Release" button to contact support.
          </Alert>
          <Typography variant="body2" color="text.secondary" paragraph>
            For other questions or issues, use the <strong>Request Funds Release</strong> button
            inside a bucket, or reach out through the app. Direct support contact is coming soon.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can also review our <Link to="/terms" style={{ textDecoration: 'none' }}>Terms of Service</Link> for
            full details on how the app works and your rights as a user.
          </Typography>
        </Paper>
      </Container>
    </>
  );
};

export default HelpPage;
