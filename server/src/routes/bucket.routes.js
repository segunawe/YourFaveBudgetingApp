const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const stripe = require('../config/stripe');

// Helper: check if a user is a member of a bucket
const isMember = (bucket, uid) => {
  if (bucket.userId === uid) return true;
  if (bucket.members && bucket.members.some(m => m.uid === uid)) return true;
  return false;
};

// GET /api/buckets
// Get all buckets the user owns or is a member of
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;

    // Query buckets owned by the user
    const ownedSnapshot = db.collection('buckets').where('userId', '==', userId).get();

    // Query shared buckets where user is a member but not the owner
    const sharedSnapshot = db
      .collection('buckets')
      .where('memberUids', 'array-contains', userId)
      .get();

    const [ownedResult, sharedResult] = await Promise.all([ownedSnapshot, sharedSnapshot]);

    const bucketMap = new Map();
    ownedResult.forEach(doc => bucketMap.set(doc.id, { id: doc.id, ...doc.data() }));
    sharedResult.forEach(doc => {
      if (!bucketMap.has(doc.id)) {
        bucketMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });

    const buckets = Array.from(bucketMap.values());

    buckets.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
      const bTime = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
      return bTime - aTime;
    });

    res.json({ buckets });
  } catch (error) {
    console.error('Error fetching buckets:', error);
    res.status(500).json({
      error: 'Failed to fetch buckets',
      details: error.message
    });
  }
});

// GET /api/buckets/:id
// Get a specific bucket by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const bucketDoc = await db.collection('buckets').doc(id).get();

    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucket = bucketDoc.data();

    if (!isMember(bucket, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ id: bucketDoc.id, ...bucket });
  } catch (error) {
    console.error('Error fetching bucket:', error);
    res.status(500).json({
      error: 'Failed to fetch bucket',
      details: error.message
    });
  }
});

// POST /api/buckets
// Create a new bucket (optionally shared with friends)
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, goalAmount, targetDate, description, memberUids } = req.body;

    if (!name || !goalAmount) {
      return res.status(400).json({ error: 'Name and goal amount are required' });
    }

    if (goalAmount <= 0) {
      return res.status(400).json({ error: 'Goal amount must be greater than 0' });
    }

    // Fetch creator profile for member entry
    const creatorDoc = await db.collection('users').doc(userId).get();
    const creatorData = creatorDoc.data();

    // Enforce free tier limit: 1 active or completed bucket at a time
    const tier = creatorData.tier || 'free';
    if (tier === 'free') {
      const activeSnap = await db.collection('buckets')
        .where('userId', '==', userId)
        .where('status', 'in', ['active', 'completed'])
        .get();
      if (!activeSnap.empty) {
        return res.status(403).json({
          error: 'Free plan limit reached. Upgrade to AJOIN Plus for unlimited groups.',
          code: 'TIER_LIMIT_REACHED',
        });
      }
    }

    const ownerMember = {
      uid: userId,
      email: creatorData.email,
      displayName: creatorData.displayName || creatorData.email,
      role: 'owner',
    };

    let members = [ownerMember];
    let isShared = false;
    let allMemberUids = [userId];

    if (memberUids && memberUids.length > 0) {
      // Verify all invited users are actually friends of the creator
      const friendUids = creatorData.friends || [];
      const invalidUids = memberUids.filter(uid => !friendUids.includes(uid));
      if (invalidUids.length > 0) {
        return res.status(400).json({ error: 'You can only share buckets with friends' });
      }

      // Fetch invited users' profiles
      const inviteProfiles = [];
      for (let i = 0; i < memberUids.length; i += 10) {
        const batch = memberUids.slice(i, i + 10);
        const snapshot = await db
          .collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .get();
        snapshot.forEach(doc => {
          const data = doc.data();
          inviteProfiles.push({
            uid: doc.id,
            email: data.email,
            displayName: data.displayName || data.email,
            role: 'member',
          });
        });
      }

      members = [ownerMember, ...inviteProfiles];
      isShared = true;
      allMemberUids = [userId, ...memberUids];
    }

    const bucketData = {
      userId,
      name,
      goalAmount: parseFloat(goalAmount),
      targetDate: targetDate ? admin.firestore.Timestamp.fromDate(new Date(targetDate)) : null,
      description: description || '',
      currentAmount: 0,
      status: 'active',
      contributions: [],
      isShared,
      members,
      memberUids: allMemberUids,
      collectorUid: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const bucketRef = await db.collection('buckets').add(bucketData);

    res.status(201).json({
      id: bucketRef.id,
      ...bucketData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating bucket:', error);
    res.status(500).json({
      error: 'Failed to create bucket',
      details: error.message
    });
  }
});

// POST /api/buckets/:id/allocate
// Allocate funds to a bucket (any member can contribute)
router.post('/:id/allocate', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const bucketRef = db.collection('buckets').doc(id);
    const bucketDoc = await bucketRef.get();

    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucket = bucketDoc.data();

    if (!isMember(bucket, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (bucket.status === 'completed') {
      return res.status(400).json({ error: 'Cannot allocate to a completed bucket' });
    }

    // Get contributing user's bank balance and settings
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Enforce transaction limit if set
    if (userData.transactionLimit && parseFloat(amount) > userData.transactionLimit) {
      return res.status(400).json({
        error: `Amount exceeds your transaction limit of $${userData.transactionLimit.toFixed(2)}`,
        transactionLimit: userData.transactionLimit,
      });
    }

    // Require ACH payment method
    const stripeCustomerId = userData.stripeCustomerId;
    const stripeAchPaymentMethodId = userData.stripeAchPaymentMethodId;
    if (!stripeCustomerId || !stripeAchPaymentMethodId) {
      return res.status(402).json({
        error: 'Bank not set up for ACH. Please set up your bank account first.',
        code: 'ACH_NOT_CONFIGURED',
      });
    }

    // Create Stripe PaymentIntent for ACH debit
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: stripeAchPaymentMethodId,
      payment_method_types: ['us_bank_account'],
      confirm: true,
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
          },
        },
      },
      metadata: { bucketId: id, contributorUid: userId },
    });

    const contribution = {
      amount: parseFloat(amount),
      date: admin.firestore.Timestamp.now(),
      uid: userId,
      stripePaymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      settledAt: null,
      failureReason: null,
    };

    // Do NOT increment currentAmount yet — webhook handles that on settlement
    await bucketRef.update({
      pendingAmount: admin.firestore.FieldValue.increment(parseFloat(amount)),
      contributions: admin.firestore.FieldValue.arrayUnion(contribution),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      goalAmount: bucket.goalAmount,
    });
  } catch (error) {
    console.error('Error allocating funds:', error);
    res.status(500).json({
      error: 'Failed to allocate funds',
      details: error.message
    });
  }
});

// POST /api/buckets/:id/collect
// Collect funds from a completed bucket (owner only)
router.post('/:id/collect', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const bucketRef = db.collection('buckets').doc(id);
    const bucketDoc = await bucketRef.get();

    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucket = bucketDoc.data();

    const collectorUid = bucket.collectorUid || bucket.userId;
    if (collectorUid !== userId) {
      return res.status(403).json({ error: 'Only the designated collector can collect funds' });
    }

    if (bucket.status !== 'completed') {
      return res.status(400).json({
        error: 'Bucket must be completed before collecting',
        currentAmount: bucket.currentAmount,
        goalAmount: bucket.goalAmount
      });
    }

    // Block if any ACH contributions are still pending
    const contributions = bucket.contributions || [];
    const pendingAch = contributions.filter(
      c => c.stripePaymentIntentId && c.paymentStatus === 'pending'
    );
    if (pendingAch.length > 0) {
      const pendingTotal = pendingAch.reduce((sum, c) => sum + (c.amount || 0), 0);
      return res.status(400).json({
        error: 'Not all contributions have settled',
        pendingCount: pendingAch.length,
        pendingAmount: pendingTotal,
      });
    }

    // Require Connect account to be onboarded
    const collectorDoc = await db.collection('users').doc(userId).get();
    const collectorData = collectorDoc.data();
    const { stripeConnectAccountId, stripeConnectOnboarded } = collectorData;
    if (!stripeConnectAccountId || !stripeConnectOnboarded) {
      return res.status(402).json({
        error: 'Payout account not set up. Complete Connect onboarding first.',
        code: 'CONNECT_NOT_ONBOARDED',
      });
    }

    // Sum only settled contributions
    const settledAmount = contributions
      .filter(c => !c.stripePaymentIntentId || c.paymentStatus === 'succeeded')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const transfer = await stripe.transfers.create({
      amount: Math.round(settledAmount * 100),
      currency: 'usd',
      destination: stripeConnectAccountId,
      metadata: { bucketId: id, collectorUid: userId },
    });

    await bucketRef.update({
      status: 'collected',
      collectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeTransferId: transfer.id,
    });

    res.json({
      success: true,
      message: 'Funds collected successfully',
      amount: settledAmount,
      stripeTransferId: transfer.id,
    });
  } catch (error) {
    console.error('Error collecting funds:', error);
    res.status(500).json({
      error: 'Failed to collect funds',
      details: error.message
    });
  }
});

// POST /api/buckets/:id/invite
// Invite a friend to an existing bucket (owner only)
router.post('/:id/invite', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { friendUid } = req.body;

    if (!friendUid) {
      return res.status(400).json({ error: 'friendUid is required' });
    }

    const bucketDoc = await db.collection('buckets').doc(id).get();
    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucket = bucketDoc.data();

    if (bucket.userId !== userId) {
      return res.status(403).json({ error: 'Only the bucket owner can invite members' });
    }

    // Verify friendUid is in owner's friends list
    const ownerDoc = await db.collection('users').doc(userId).get();
    const ownerData = ownerDoc.data();
    if (!(ownerData.friends || []).includes(friendUid)) {
      return res.status(400).json({ error: 'You can only invite friends' });
    }

    // Check not already a member
    if ((bucket.memberUids || []).includes(friendUid)) {
      return res.status(400).json({ error: 'User is already a member of this bucket' });
    }

    // Check no pending invite already exists
    const existing = await db
      .collection('bucketInvites')
      .where('bucketId', '==', id)
      .where('toUid', '==', friendUid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'Invite already sent to this user' });
    }

    await db.collection('bucketInvites').add({
      bucketId: id,
      bucketName: bucket.name,
      fromUid: userId,
      fromDisplayName: ownerData.displayName || ownerData.email,
      toUid: friendUid,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ success: true, message: 'Invite sent' });
  } catch (error) {
    console.error('Error inviting to bucket:', error);
    res.status(500).json({ error: 'Failed to send invite', details: error.message });
  }
});

// PATCH /api/buckets/:id/collector
// Change the designated collector (owner only)
router.patch('/:id/collector', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { collectorUid } = req.body;

    if (!collectorUid) {
      return res.status(400).json({ error: 'collectorUid is required' });
    }

    const bucketRef = db.collection('buckets').doc(id);
    const bucketDoc = await bucketRef.get();

    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucket = bucketDoc.data();

    if (bucket.userId !== userId) {
      return res.status(403).json({ error: 'Only the bucket owner can change the collector' });
    }

    if (!(bucket.memberUids || []).includes(collectorUid)) {
      return res.status(400).json({ error: 'Collector must be a current member of the bucket' });
    }

    await bucketRef.update({
      collectorUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: 'Collector updated' });
  } catch (error) {
    console.error('Error updating collector:', error);
    res.status(500).json({ error: 'Failed to update collector', details: error.message });
  }
});

// DELETE /api/buckets/:id
// Delete a bucket (owner only)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const bucketRef = db.collection('buckets').doc(id);
    const bucketDoc = await bucketRef.get();

    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucket = bucketDoc.data();

    if (bucket.userId !== userId) {
      return res.status(403).json({ error: 'Only the bucket owner can delete it' });
    }

    await bucketRef.delete();

    res.json({
      success: true,
      message: 'Bucket deleted successfully',
      freedAmount: bucket.currentAmount,
    });
  } catch (error) {
    console.error('Error deleting bucket:', error);
    res.status(500).json({
      error: 'Failed to delete bucket',
      details: error.message
    });
  }
});

module.exports = router;
