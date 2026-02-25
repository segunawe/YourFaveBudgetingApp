const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const { db } = require('../config/firebase');

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    let customerId = userData.stripeCustomerId;

    // Create Stripe customer if not yet linked
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { firebaseUid: userId },
      });
      customerId = customer.id;
      await db.collection('users').doc(userId).update({ stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/stripe/portal
router.post('/portal', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const { stripeCustomerId } = userDoc.data();

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/settings`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// GET /api/stripe/status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const { tier, stripeSubscriptionId } = userDoc.data();
    res.json({ tier: tier || 'free', stripeSubscriptionId: stripeSubscriptionId || null });
  } catch (error) {
    console.error('Error fetching stripe status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST /api/stripe/create-setup-intent
// Create a SetupIntent for Stripe Financial Connections bank account linking
router.post('/create-setup-intent', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    let customerId = userData.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { firebaseUid: userId },
      });
      customerId = customer.id;
      await db.collection('users').doc(userId).update({ stripeCustomerId: customerId });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] },
        },
      },
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ error: 'Failed to create setup intent', details: error.message });
  }
});

// POST /api/stripe/finalize-ach-setup
// After client-side Financial Connections confirmation, save PM details to Firestore
router.post('/finalize-ach-setup', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { setupIntentId } = req.body;

    if (!setupIntentId) {
      return res.status(400).json({ error: 'setupIntentId is required' });
    }

    const si = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ['payment_method'],
    });

    if (si.status !== 'succeeded') {
      return res.status(400).json({ error: `SetupIntent status is ${si.status}, expected succeeded` });
    }

    const pm = si.payment_method;
    const last4 = pm.us_bank_account?.last4 || null;
    const bankName = pm.us_bank_account?.bank_name || null;

    await db.collection('users').doc(userId).update({
      stripeAchPaymentMethodId: pm.id,
      stripeAchAccountLast4: last4,
      stripeAchBankName: bankName,
    });

    res.json({ success: true, last4, bankName });
  } catch (error) {
    console.error('Error finalizing ACH setup:', error);
    res.status(500).json({ error: 'Failed to finalize ACH setup', details: error.message });
  }
});

// DELETE /api/stripe/payment-method
// Detach the ACH payment method and clear from Firestore
router.delete('/payment-method', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const { stripeAchPaymentMethodId } = userDoc.data();

    if (stripeAchPaymentMethodId) {
      await stripe.paymentMethods.detach(stripeAchPaymentMethodId);
    }

    await db.collection('users').doc(userId).update({
      stripeAchPaymentMethodId: null,
      stripeAchAccountLast4: null,
      stripeAchBankName: null,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing payment method:', error);
    res.status(500).json({ error: 'Failed to remove payment method', details: error.message });
  }
});

// GET /api/stripe/ach-status
// Return current ACH payment method info from Firestore
router.get('/ach-status', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const { stripeAchPaymentMethodId, stripeAchAccountLast4, stripeAchBankName } = userDoc.data();
    res.json({
      hasAchMethod: !!stripeAchPaymentMethodId,
      last4: stripeAchAccountLast4 || null,
      bankName: stripeAchBankName || null,
    });
  } catch (error) {
    console.error('Error fetching ACH status:', error);
    res.status(500).json({ error: 'Failed to fetch ACH status' });
  }
});

// POST /api/stripe/connect/onboard
// Create (or retrieve) a Connect Express account and return an onboarding link
router.post('/connect/onboard', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    let connectAccountId = userData.stripeConnectAccountId;

    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: userData.email,
        capabilities: { transfers: { requested: true } },
      });
      connectAccountId = account.id;
      await db.collection('users').doc(userId).update({ stripeConnectAccountId: connectAccountId });
    }

    const returnUrl = `${process.env.STRIPE_CONNECT_RETURN_URL || process.env.CLIENT_URL}/settings?connect=return`;
    const refreshUrl = `${process.env.STRIPE_CONNECT_RETURN_URL || process.env.CLIENT_URL}/settings?connect=refresh`;

    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Connect onboarding link:', error);
    res.status(500).json({ error: 'Failed to create onboarding link', details: error.message });
  }
});

// GET /api/stripe/connect/status
// Return Connect account status
router.get('/connect/status', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const { stripeConnectAccountId } = userDoc.data();

    if (!stripeConnectAccountId) {
      return res.json({ connectAccountId: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false });
    }

    const account = await stripe.accounts.retrieve(stripeConnectAccountId);

    res.json({
      connectAccountId: stripeConnectAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    console.error('Error fetching Connect status:', error);
    res.status(500).json({ error: 'Failed to fetch Connect status', details: error.message });
  }
});

module.exports = router;
