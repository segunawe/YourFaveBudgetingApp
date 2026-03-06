require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const { db } = require('./config/firebase');
const admin = require('firebase-admin');
const { createNotification, notifyByEmail } = require('./utils/notifications');
const { contributionFailedEmail, goalReachedEmail, voteNeededEmail } = require('./utils/mailer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));

// Stripe webhook — must be registered BEFORE express.json() to receive raw body
const stripe = require('./config/stripe');
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const usersSnap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
      if (!usersSnap.empty) {
        await usersSnap.docs[0].ref.update({
          tier: 'plus',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const usersSnap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
      if (!usersSnap.empty) {
        await usersSnap.docs[0].ref.update({
          tier: 'free',
          stripeSubscriptionId: null,
        });
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const bucketId = pi.metadata?.bucketId;
      const piId = pi.id;
      const amountDollars = pi.amount / 100;

      if (bucketId) {
        const bucketRef = db.collection('buckets').doc(bucketId);
        const bucketDoc = await bucketRef.get();
        if (bucketDoc.exists) {
          const bucket = bucketDoc.data();
          const contributions = bucket.contributions || [];
          const idx = contributions.findIndex(c => c.stripePaymentIntentId === piId);
          if (idx !== -1 && contributions[idx].paymentStatus !== 'succeeded') {
            const updated = contributions.map((c, i) =>
              i === idx
                ? { ...c, paymentStatus: 'succeeded', settledAt: admin.firestore.Timestamp.now() }
                : c
            );
            const newCurrentAmount = (bucket.currentAmount || 0) + amountDollars;
            const newPendingAmount = Math.max(0, (bucket.pendingAmount || 0) - amountDollars);
            const newStatus = newCurrentAmount >= bucket.goalAmount ? 'completed' : bucket.status;
            const updatePayload = {
              contributions: updated,
              currentAmount: newCurrentAmount,
              pendingAmount: newPendingAmount,
              status: newStatus,
              updatedAt: admin.firestore.Timestamp.now(),
            };
            if (newStatus === 'completed' && bucket.status !== 'completed') {
              const isSolo = !bucket.isShared || (bucket.memberUids || []).length <= 1;
              updatePayload.collectionVoteInitiatedAt = admin.firestore.Timestamp.now();
              updatePayload.collectionVotes = {};
              updatePayload.collectionVoteApproved = isSolo;

              // Notify all members + owner that the goal was reached
              const allUids = [...new Set([bucket.userId, ...(bucket.memberUids || [])])].filter(Boolean);
              for (const memberUid of allUids) {
                createNotification(memberUid, {
                  type: 'goal_reached',
                  title: 'Savings Goal Reached!',
                  body: `"${bucket.name}" has reached its goal of $${bucket.goalAmount.toFixed(2)}.`,
                  link: `/buckets/${bucketId}`,
                });
                notifyByEmail(memberUid, `Goal Reached: ${bucket.name}`, goalReachedEmail({ bucketName: bucket.name, goalAmount: bucket.goalAmount }));
              }

              // If shared, also send vote_needed
              if (!isSolo) {
                for (const memberUid of allUids) {
                  createNotification(memberUid, {
                    type: 'vote_needed',
                    title: 'Vote to Collect Funds',
                    body: `"${bucket.name}" needs your vote to approve the payout.`,
                    link: `/buckets/${bucketId}`,
                  });
                  notifyByEmail(memberUid, `Action Required: Vote to collect "${bucket.name}"`, voteNeededEmail({ bucketName: bucket.name }));
                }
              }
            }
            await bucketRef.update(updatePayload);
          }
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      const bucketId = pi.metadata?.bucketId;
      const piId = pi.id;
      const amountDollars = pi.amount / 100;
      const declineCode = pi.last_payment_error?.decline_code || pi.last_payment_error?.code || 'unknown';

      if (bucketId) {
        const bucketRef = db.collection('buckets').doc(bucketId);
        const bucketDoc = await bucketRef.get();
        if (bucketDoc.exists) {
          const bucket = bucketDoc.data();
          const contributions = bucket.contributions || [];
          const idx = contributions.findIndex(c => c.stripePaymentIntentId === piId);
          if (idx !== -1 && contributions[idx].paymentStatus === 'pending') {
            const failedContribution = contributions[idx];
            const updated = contributions.map((c, i) =>
              i === idx ? { ...c, paymentStatus: 'failed', failureReason: declineCode } : c
            );
            await bucketRef.update({
              contributions: updated,
              pendingAmount: Math.max(0, (bucket.pendingAmount || 0) - amountDollars),
              updatedAt: admin.firestore.Timestamp.now(),
            });

            const contributorUid = failedContribution.uid || bucket.userId;
            if (contributorUid) {
              createNotification(contributorUid, {
                type: 'contribution_failed',
                title: 'Payment Failed',
                body: `Your $${amountDollars.toFixed(2)} contribution to "${bucket.name}" could not be processed.`,
                link: `/buckets/${bucketId}`,
              });
              notifyByEmail(contributorUid, `Payment Failed: ${bucket.name}`, contributionFailedEmail({ bucketName: bucket.name, amount: amountDollars, reason: declineCode }));
            }
          }
        }
      }
    } else if (event.type === 'charge.dispute.created') {
      const charge = event.data.object;
      const piId = charge.payment_intent;
      const amountDollars = charge.amount / 100;

      // Find the bucket containing this payment intent
      const bucketsSnap = await db.collection('buckets').get();
      for (const bucketDoc of bucketsSnap.docs) {
        const bucket = bucketDoc.data();
        const contributions = bucket.contributions || [];
        const idx = contributions.findIndex(c => c.stripePaymentIntentId === piId);
        if (idx !== -1) {
          const updated = contributions.map((c, i) =>
            i === idx ? { ...c, paymentStatus: 'reversed' } : c
          );
          const newCurrentAmount = Math.max(0, (bucket.currentAmount || 0) - amountDollars);
          const updatePayload = {
            contributions: updated,
            currentAmount: newCurrentAmount,
            updatedAt: admin.firestore.Timestamp.now(),
          };
          if (bucket.status === 'completed' && newCurrentAmount < bucket.goalAmount) {
            updatePayload.status = 'active';
          }
          if (bucket.status === 'collected') {
            updatePayload.hasReversal = true;
            console.warn(`[Webhook] Reversal on collected bucket ${bucketDoc.id} — manual review required`);
          }
          await bucketDoc.ref.update(updatePayload);
          break;
        }
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const piId = charge.payment_intent;
      const amountRefundedDollars = charge.amount_refunded / 100;

      const bucketsSnap = await db.collection('buckets').get();
      for (const bucketDoc of bucketsSnap.docs) {
        const bucket = bucketDoc.data();
        const contributions = bucket.contributions || [];
        const idx = contributions.findIndex(c => c.stripePaymentIntentId === piId);
        if (idx !== -1) {
          if (contributions[idx].paymentStatus === 'refunded') {
            console.log(`[Webhook] charge.refunded: PI ${piId} already marked refunded in bucket ${bucketDoc.id}`);
          } else {
            const updated = contributions.map((c, i) =>
              i === idx ? { ...c, paymentStatus: 'refunded', refundedAt: admin.firestore.Timestamp.now() } : c
            );
            await bucketDoc.ref.update({
              contributions: updated,
              currentAmount: Math.max(0, (bucket.currentAmount || 0) - amountRefundedDollars),
              updatedAt: admin.firestore.Timestamp.now(),
            });
          }
          break;
        }
      }
    } else if (event.type === 'setup_intent.succeeded') {
      const si = event.data.object;
      const customerId = si.customer;
      const pmId = si.payment_method;
      if (customerId && pmId) {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        const last4 = pm.us_bank_account?.last4 || null;
        const bankName = pm.us_bank_account?.bank_name || null;
        const usersSnap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!usersSnap.empty) {
          await usersSnap.docs[0].ref.update({
            stripeAchPaymentMethodId: pmId,
            stripeAchAccountLast4: last4,
            stripeAchBankName: bankName,
          });
        }
      }
    } else if (event.type === 'account.updated') {
      const account = event.data.object;
      const usersSnap = await db
        .collection('users')
        .where('stripeConnectAccountId', '==', account.id)
        .limit(1)
        .get();
      if (!usersSnap.empty) {
        await usersSnap.docs[0].ref.update({
          stripeConnectOnboarded: account.charges_enabled,
        });
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Financial Budgeting App API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Auth middleware
const authMiddleware = require('./middleware/auth');

// API Routes
app.use('/api/buckets', authMiddleware, require('./routes/bucket.routes'));
app.use('/api/friends', authMiddleware, require('./routes/friends.routes'));
app.use('/api/bucket-invites', authMiddleware, require('./routes/bucketInvites.routes'));
app.use('/api/support', authMiddleware, require('./routes/support.routes'));
app.use('/api/users', authMiddleware, require('./routes/user.routes'));
app.use('/api/stripe', authMiddleware, require('./routes/stripe.routes'));
// app.use('/api/groups', authMiddleware, require('./routes/groups.routes'));
// app.use('/api/transactions', authMiddleware, require('./routes/transactions.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404 } });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Daily cron at 01:00 UTC: log buckets approaching/eligible for the 90-day cancellation window
cron.schedule('0 1 * * *', async () => {
  console.log('[Cron] Checking 90-day inactivity windows...');
  try {
    const SEVENTY_FIVE_DAYS_MS = 75 * 24 * 60 * 60 * 1000;
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const snapshot = await db
      .collection('buckets')
      .where('status', 'in', ['active', 'completed'])
      .get();

    snapshot.forEach(doc => {
      const bucket = doc.data();
      if (!bucket.lastContributionAt) return;
      const elapsedMs = now - bucket.lastContributionAt.toMillis();
      if (elapsedMs >= NINETY_DAYS_MS) {
        console.log(`[Cron] Bucket ${doc.id} (owner: ${bucket.userId}) is eligible for cancellation (90+ days since last contribution).`);
      } else if (elapsedMs >= SEVENTY_FIVE_DAYS_MS) {
        const daysRemaining = Math.ceil((NINETY_DAYS_MS - elapsedMs) / (24 * 60 * 60 * 1000));
        console.log(`[Cron] Bucket ${doc.id} (owner: ${bucket.userId}) approaching cancellation window — ${daysRemaining} day(s) remaining.`);
      }
    });
  } catch (err) {
    console.error('[Cron] 90-day inactivity check error:', err);
  }
});

// Daily scheduler: auto-collect completed buckets whose target date has passed
cron.schedule('0 0 * * *', async () => {
  console.log('[Scheduler] Checking for buckets to auto-collect...');
  try {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db
      .collection('buckets')
      .where('status', '==', 'completed')
      .get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
      const bucket = doc.data();
      // Skip buckets that have any real ACH contributions (requires Stripe Transfer, not auto-collect)
      if (bucket.contributions?.some(c => c.stripePaymentIntentId)) return;
      if (bucket.targetDate && bucket.targetDate.toMillis() <= now.toMillis()) {
        batch.update(doc.ref, {
          status: 'collected',
          collectedAt: now,
          updatedAt: now,
          autoCollected: true,
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[Scheduler] Auto-collected ${count} bucket(s).`);
    } else {
      console.log('[Scheduler] No buckets to auto-collect.');
    }
  } catch (err) {
    console.error('[Scheduler] Auto-collect error:', err);
  }
});
