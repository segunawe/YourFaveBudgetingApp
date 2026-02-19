const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

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

    // Get contributing user's bank balance
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    let totalBankBalance = 0;
    if (userData.plaidItems) {
      Object.values(userData.plaidItems).forEach(item => {
        if (item.accounts) {
          item.accounts.forEach(account => {
            totalBankBalance += account.balance.current || 0;
          });
        }
      });
    }

    // Calculate how much this user has already allocated across their buckets
    const userBucketsSnapshot = await db
      .collection('buckets')
      .where('memberUids', 'array-contains', userId)
      .where('status', '==', 'active')
      .get();

    // Also check buckets the user owns (for pre-sharing buckets without memberUids)
    const ownedBucketsSnapshot = await db
      .collection('buckets')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();

    const seenIds = new Set();
    let totalAllocated = 0;

    const countAllocation = (doc) => {
      if (seenIds.has(doc.id)) return;
      seenIds.add(doc.id);
      const data = doc.data();
      // Sum contributions from this user only
      const userContributions = (data.contributions || [])
        .filter(c => c.uid === userId || (!c.uid && data.userId === userId))
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      totalAllocated += userContributions;
    };

    userBucketsSnapshot.forEach(countAllocation);
    ownedBucketsSnapshot.forEach(countAllocation);

    const availableBalance = totalBankBalance - totalAllocated;

    if (amount > availableBalance) {
      return res.status(400).json({
        error: 'Insufficient available balance',
        available: availableBalance,
        requested: amount
      });
    }

    const contribution = {
      amount: parseFloat(amount),
      date: admin.firestore.Timestamp.now(),
      uid: userId,
    };

    const newCurrentAmount = bucket.currentAmount + parseFloat(amount);
    const newStatus = newCurrentAmount >= bucket.goalAmount ? 'completed' : 'active';

    await bucketRef.update({
      currentAmount: newCurrentAmount,
      status: newStatus,
      contributions: admin.firestore.FieldValue.arrayUnion(contribution),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      currentAmount: newCurrentAmount,
      goalAmount: bucket.goalAmount,
      status: newStatus,
      availableBalance: availableBalance - parseFloat(amount),
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

    if (bucket.userId !== userId) {
      return res.status(403).json({ error: 'Only the bucket owner can collect funds' });
    }

    if (bucket.status !== 'completed') {
      return res.status(400).json({
        error: 'Bucket must be completed before collecting',
        currentAmount: bucket.currentAmount,
        goalAmount: bucket.goalAmount
      });
    }

    await bucketRef.update({
      status: 'collected',
      collectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: 'Funds collected successfully',
      amount: bucket.currentAmount,
    });
  } catch (error) {
    console.error('Error collecting funds:', error);
    res.status(500).json({
      error: 'Failed to collect funds',
      details: error.message
    });
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
