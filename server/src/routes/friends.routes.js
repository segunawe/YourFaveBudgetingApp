const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// POST /api/friends/request
// Send a friend request by email
router.post('/request', async (req, res) => {
  try {
    const fromUid = req.user.uid;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (email === req.user.email) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend' });
    }

    // Look up target user by email
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    const targetUserDoc = usersSnapshot.docs[0];
    const toUid = targetUserDoc.id;
    const targetUser = targetUserDoc.data();

    // Check if already friends
    const fromUserDoc = await db.collection('users').doc(fromUid).get();
    const fromUser = fromUserDoc.data();
    if (fromUser.friends && fromUser.friends.includes(toUid)) {
      return res.status(400).json({ error: 'You are already friends with this user' });
    }

    // Check if a pending request already exists
    const existingRequest = await db
      .collection('friendRequests')
      .where('fromUid', '==', fromUid)
      .where('toUid', '==', toUid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingRequest.empty) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Create the request
    const requestRef = await db.collection('friendRequests').add({
      fromUid,
      toUid,
      fromEmail: req.user.email,
      fromDisplayName: fromUser.displayName || req.user.email,
      toEmail: targetUser.email,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: requestRef.id, message: 'Friend request sent' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request', details: error.message });
  }
});

// GET /api/friends/requests
// Get pending incoming friend requests for the current user
router.get('/requests', async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection('friendRequests')
      .where('toUid', '==', uid)
      .where('status', '==', 'pending')
      .get();

    const requests = [];
    snapshot.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });

    res.json({ requests });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests', details: error.message });
  }
});

// POST /api/friends/requests/:id/accept
// Accept a friend request
router.post('/requests/:id/accept', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const requestRef = db.collection('friendRequests').doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const request = requestDoc.data();

    if (request.toUid !== uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    // Update request status
    await requestRef.update({ status: 'accepted' });

    // Add each user to the other's friends array
    const batch = db.batch();
    batch.update(db.collection('users').doc(uid), {
      friends: admin.firestore.FieldValue.arrayUnion(request.fromUid),
    });
    batch.update(db.collection('users').doc(request.fromUid), {
      friends: admin.firestore.FieldValue.arrayUnion(uid),
    });
    await batch.commit();

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request', details: error.message });
  }
});

// POST /api/friends/requests/:id/decline
// Decline a friend request
router.post('/requests/:id/decline', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const requestRef = db.collection('friendRequests').doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const request = requestDoc.data();

    if (request.toUid !== uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    await requestRef.update({ status: 'declined' });

    res.json({ success: true, message: 'Friend request declined' });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Failed to decline friend request', details: error.message });
  }
});

// GET /api/friends
// Get the current user's friends list
router.get('/', async (req, res) => {
  try {
    const uid = req.user.uid;

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const friendUids = userData.friends || [];

    if (friendUids.length === 0) {
      return res.json({ friends: [] });
    }

    // Fetch friend profiles in batches of 10 (Firestore 'in' limit)
    const friends = [];
    for (let i = 0; i < friendUids.length; i += 10) {
      const batch = friendUids.slice(i, i + 10);
      const snapshot = await db
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get();
      snapshot.forEach(doc => {
        const data = doc.data();
        friends.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName || data.email,
        });
      });
    }

    res.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends', details: error.message });
  }
});

module.exports = router;
