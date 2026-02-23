const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendSupportNotification = async ({ bucketName, bucketId, userEmail, amountStuck, message }) => {
  if (!process.env.GMAIL_USER || !process.env.SUPPORT_NOTIFY_EMAIL) return;
  await mailer.sendMail({
    from: `"YourFaveBudgetingApp" <${process.env.GMAIL_USER}>`,
    to: process.env.SUPPORT_NOTIFY_EMAIL,
    subject: `Support Request: Stuck Funds — ${bucketName}`,
    text: [
      `A user has submitted a funds release request.`,
      ``,
      `User:       ${userEmail}`,
      `Bucket:     ${bucketName} (ID: ${bucketId})`,
      `Amount:     $${amountStuck.toFixed(2)}`,
      ``,
      `Message:`,
      message,
    ].join('\n'),
  });
};

// POST /api/support/stuck-funds
// Submit a stuck funds support request
router.post('/stuck-funds', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { bucketId, message } = req.body;

    if (!bucketId || !message) {
      return res.status(400).json({ error: 'bucketId and message are required' });
    }

    // Verify bucket exists and user is a member
    const bucketDoc = await db.collection('buckets').doc(bucketId).get();
    if (!bucketDoc.exists) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucket = bucketDoc.data();
    const isMember = bucket.userId === uid ||
      (bucket.memberUids || []).includes(uid);

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate amount stuck for this user
    const userContributions = (bucket.contributions || [])
      .filter(c => c.uid === uid || (!c.uid && bucket.userId === uid))
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    // Check for existing open request
    const existingSnapshot = await db
      .collection('supportRequests')
      .where('uid', '==', uid)
      .where('bucketId', '==', bucketId)
      .where('status', '==', 'open')
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(400).json({ error: 'You already have an open request for this bucket' });
    }

    const requestRef = await db.collection('supportRequests').add({
      uid,
      type: 'stuck_funds',
      bucketId,
      bucketName: bucket.name,
      amountStuck: userContributions,
      message: message.trim(),
      status: 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Fire-and-forget email — don't block the response if mail fails
    sendSupportNotification({
      bucketName: bucket.name,
      bucketId,
      userEmail: req.user.email,
      amountStuck: userContributions,
      message: message.trim(),
    }).catch(err => console.error('Support email failed:', err));

    res.status(201).json({ id: requestRef.id, message: 'Support request submitted' });
  } catch (error) {
    console.error('Error submitting support request:', error);
    res.status(500).json({ error: 'Failed to submit support request', details: error.message });
  }
});

// GET /api/support/requests
// Get the current user's support requests
router.get('/requests', async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection('supportRequests')
      .where('uid', '==', uid)
      .get();

    const requests = [];
    snapshot.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));

    requests.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() ?? new Date(0);
      const bTime = b.createdAt?.toDate?.() ?? new Date(0);
      return bTime - aTime;
    });

    res.json({ requests });
  } catch (error) {
    console.error('Error fetching support requests:', error);
    res.status(500).json({ error: 'Failed to fetch support requests', details: error.message });
  }
});

module.exports = router;
