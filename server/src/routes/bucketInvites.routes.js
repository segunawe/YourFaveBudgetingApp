const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// GET /api/bucket-invites
// Get pending bucket invites for the current user
router.get('/', async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection('bucketInvites')
      .where('toUid', '==', uid)
      .where('status', '==', 'pending')
      .get();

    const invites = [];
    snapshot.forEach(doc => {
      invites.push({ id: doc.id, ...doc.data() });
    });

    res.json({ invites });
  } catch (error) {
    console.error('Error fetching bucket invites:', error);
    res.status(500).json({ error: 'Failed to fetch bucket invites', details: error.message });
  }
});

// POST /api/bucket-invites/:id/accept
// Accept a bucket invite — adds user to bucket members
router.post('/:id/accept', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const inviteRef = db.collection('bucketInvites').doc(id);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    const invite = inviteDoc.data();

    if (invite.toUid !== uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invite is no longer pending' });
    }

    // Fetch user profile to build member entry
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    const newMember = {
      uid,
      email: userData.email,
      displayName: userData.displayName || userData.email,
      role: 'member',
    };

    // Add user to bucket members and memberUids
    const bucketRef = db.collection('buckets').doc(invite.bucketId);
    await bucketRef.update({
      members: admin.firestore.FieldValue.arrayUnion(newMember),
      memberUids: admin.firestore.FieldValue.arrayUnion(uid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark invite as accepted
    await inviteRef.update({ status: 'accepted' });

    res.json({ success: true, message: 'Bucket invite accepted' });
  } catch (error) {
    console.error('Error accepting bucket invite:', error);
    res.status(500).json({ error: 'Failed to accept bucket invite', details: error.message });
  }
});

// POST /api/bucket-invites/:id/decline
// Decline a bucket invite
router.post('/:id/decline', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const inviteRef = db.collection('bucketInvites').doc(id);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    const invite = inviteDoc.data();

    if (invite.toUid !== uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invite is no longer pending' });
    }

    await inviteRef.update({ status: 'declined' });

    res.json({ success: true, message: 'Bucket invite declined' });
  } catch (error) {
    console.error('Error declining bucket invite:', error);
    res.status(500).json({ error: 'Failed to decline bucket invite', details: error.message });
  }
});

module.exports = router;
