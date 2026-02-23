const express = require('express');
const router = express.Router();
const { db, auth } = require('../config/firebase');
const admin = require('firebase-admin');

// PATCH /api/users/profile
// Update display name, transaction limit, or notification preferences
router.patch('/profile', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { displayName, transactionLimit, notificationPrefs } = req.body;

    const updates = {};

    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || !displayName.trim()) {
        return res.status(400).json({ error: 'Display name cannot be empty' });
      }
      updates.displayName = displayName.trim();
      // Also update Firebase Auth display name
      await auth.updateUser(uid, { displayName: displayName.trim() });
    }

    if (transactionLimit !== undefined) {
      if (transactionLimit !== null && (isNaN(transactionLimit) || transactionLimit <= 0)) {
        return res.status(400).json({ error: 'Transaction limit must be a positive number or null' });
      }
      updates.transactionLimit = transactionLimit === null ? null : parseFloat(transactionLimit);
    }

    if (notificationPrefs !== undefined) {
      updates.notificationPrefs = notificationPrefs;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('users').doc(uid).update(updates);

    res.json({ success: true, message: 'Profile updated', updates });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// DELETE /api/users/account
// Delete user account — removes Firestore user doc and buckets owned by user
router.delete('/account', async (req, res) => {
  try {
    const uid = req.user.uid;

    // Delete buckets owned by the user
    const bucketsSnapshot = await db
      .collection('buckets')
      .where('userId', '==', uid)
      .get();

    const batch = db.batch();
    bucketsSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete user document
    batch.delete(db.collection('users').doc(uid));

    await batch.commit();

    // Delete Firebase Auth user
    await auth.deleteUser(uid);

    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

module.exports = router;
