const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// GET /api/buckets
// Get all buckets for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;

    const bucketsSnapshot = await db
      .collection('buckets')
      .where('userId', '==', userId)
      .get();

    const buckets = [];
    bucketsSnapshot.forEach(doc => {
      buckets.push({
        id: doc.id,
        ...doc.data(),
      });
    });

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

    // Verify ownership
    if (bucket.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: bucketDoc.id,
      ...bucket,
    });
  } catch (error) {
    console.error('Error fetching bucket:', error);
    res.status(500).json({
      error: 'Failed to fetch bucket',
      details: error.message
    });
  }
});

// POST /api/buckets
// Create a new bucket
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, goalAmount, targetDate, description } = req.body;

    // Validation
    if (!name || !goalAmount) {
      return res.status(400).json({
        error: 'Name and goal amount are required'
      });
    }

    if (goalAmount <= 0) {
      return res.status(400).json({
        error: 'Goal amount must be greater than 0'
      });
    }

    // Create bucket document
    const bucketData = {
      userId,
      name,
      goalAmount: parseFloat(goalAmount),
      targetDate: targetDate ? admin.firestore.Timestamp.fromDate(new Date(targetDate)) : null,
      description: description || '',
      currentAmount: 0,
      status: 'active',
      contributions: [],
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
// Allocate funds to a bucket
router.post('/:id/allocate', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    const bucketRef = db.collection('buckets').doc(id);
    const bucketDoc = await bucketRef.get();

    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucket = bucketDoc.data();

    // Verify ownership
    if (bucket.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if bucket is already completed
    if (bucket.status === 'completed') {
      return res.status(400).json({
        error: 'Cannot allocate to a completed bucket'
      });
    }

    // Get user's total available balance from Plaid accounts
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

    // Calculate already allocated amount
    const allBucketsSnapshot = await db
      .collection('buckets')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();

    let totalAllocated = 0;
    allBucketsSnapshot.forEach(doc => {
      totalAllocated += doc.data().currentAmount || 0;
    });

    const availableBalance = totalBankBalance - totalAllocated;

    // Check if user has enough available balance
    if (amount > availableBalance) {
      return res.status(400).json({
        error: 'Insufficient available balance',
        available: availableBalance,
        requested: amount
      });
    }

    // Create contribution record
    const contribution = {
      amount: parseFloat(amount),
      date: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Update bucket
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
// Collect funds from a completed bucket
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

    // Verify ownership
    if (bucket.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if bucket is completed
    if (bucket.status !== 'completed') {
      return res.status(400).json({
        error: 'Bucket must be completed before collecting',
        currentAmount: bucket.currentAmount,
        goalAmount: bucket.goalAmount
      });
    }

    // Mark bucket as collected (archived)
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
// Delete a bucket
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

    // Verify ownership
    if (bucket.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the bucket
    await bucketRef.delete();

    res.json({
      success: true,
      message: 'Bucket deleted successfully',
      freedAmount: bucket.currentAmount, // Amount that was freed up
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
