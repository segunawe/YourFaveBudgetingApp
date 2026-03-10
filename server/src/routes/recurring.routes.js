const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// Compute next run timestamp from now based on frequency
const computeNextRunAt = (frequency) => {
  const d = new Date();
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'biweekly') {
    d.setDate(d.getDate() + 14);
  } else if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  }
  return admin.firestore.Timestamp.fromDate(d);
};

// POST /api/recurring — create a recurring schedule
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { bucketId, amount, frequency } = req.body;

    if (!bucketId || !amount || !frequency) {
      return res.status(400).json({ error: 'bucketId, amount, and frequency are required' });
    }
    if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return res.status(400).json({ error: 'frequency must be weekly, biweekly, or monthly' });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const bucketDoc = await db.collection('buckets').doc(bucketId).get();
    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }
    const bucket = bucketDoc.data();

    const isMember = bucket.userId === userId || (bucket.memberUids || []).includes(userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData.stripeAchPaymentMethodId) {
      return res.status(402).json({
        error: 'Bank account not set up for ACH. Please link your bank first.',
        code: 'ACH_NOT_CONFIGURED',
      });
    }

    // Apply share enforcement for shared non-flexible buckets
    if (!bucket.flexibleContributions && bucket.isShared) {
      const memberCount = (bucket.memberUids || []).length;
      const equalShare = Math.ceil((bucket.goalAmount / memberCount) * 100) / 100;
      const alreadyCommitted = (bucket.contributions || [])
        .filter(c => c.uid === userId &&
          c.paymentStatus !== 'failed' &&
          c.paymentStatus !== 'reversed' &&
          c.paymentStatus !== 'refunded')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      const remaining = Math.max(0, equalShare - alreadyCommitted);
      if (alreadyCommitted >= equalShare) {
        return res.status(400).json({
          error: `You have already reached your share of $${equalShare.toFixed(2)}.`,
          code: 'SHARE_LIMIT_REACHED',
          equalShare,
        });
      }
      if (parseFloat(amount) > remaining) {
        return res.status(400).json({
          error: `Amount exceeds your remaining share of $${remaining.toFixed(2)}.`,
          code: 'SHARE_LIMIT_EXCEEDED',
          equalShare,
          remaining,
        });
      }
    }

    const now = admin.firestore.Timestamp.now();
    const nextRunAt = computeNextRunAt(frequency);

    const docRef = await db.collection('recurringContributions').add({
      uid: userId,
      bucketId,
      amount: parseFloat(amount),
      frequency,
      active: true,
      nextRunAt,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      id: docRef.id,
      uid: userId,
      bucketId,
      amount: parseFloat(amount),
      frequency,
      active: true,
      nextRunAt: nextRunAt.toDate().toISOString(),
    });
  } catch (error) {
    console.error('Error creating recurring schedule:', error);
    res.status(500).json({ error: 'Failed to create recurring schedule', details: error.message });
  }
});

// GET /api/recurring — list the authenticated user's schedules
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db
      .collection('recurringContributions')
      .where('uid', '==', userId)
      .get();

    const schedules = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        nextRunAt: data.nextRunAt?.toDate?.().toISOString() ?? null,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
      };
    });

    res.json({ schedules });
  } catch (error) {
    console.error('Error fetching recurring schedules:', error);
    res.status(500).json({ error: 'Failed to fetch recurring schedules', details: error.message });
  }
});

// PATCH /api/recurring/:id — update amount, frequency, or active state
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { amount, frequency, active } = req.body;

    const docRef = db.collection('recurringContributions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Recurring schedule not found' });
    }
    if (docSnap.data().uid !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const update = { updatedAt: admin.firestore.Timestamp.now() };
    if (amount !== undefined) update.amount = parseFloat(amount);
    if (typeof active === 'boolean') update.active = active;
    if (frequency !== undefined) {
      if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
        return res.status(400).json({ error: 'frequency must be weekly, biweekly, or monthly' });
      }
      update.frequency = frequency;
      update.nextRunAt = computeNextRunAt(frequency);
    }

    await docRef.update(update);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating recurring schedule:', error);
    res.status(500).json({ error: 'Failed to update recurring schedule', details: error.message });
  }
});

// DELETE /api/recurring/:id — permanently cancel a schedule
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const docRef = db.collection('recurringContributions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Recurring schedule not found' });
    }
    if (docSnap.data().uid !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await docRef.delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring schedule:', error);
    res.status(500).json({ error: 'Failed to delete recurring schedule', details: error.message });
  }
});

module.exports = router;
