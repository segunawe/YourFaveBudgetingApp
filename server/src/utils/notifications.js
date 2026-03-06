const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const { sendMail } = require('./mailer');

/**
 * Write an in-app notification for a user if notificationPrefs.inApp is enabled.
 * Fire-and-forget — does not throw.
 *
 * @param {string} uid
 * @param {{ type: string, title: string, body: string, link?: string }} payload
 */
const createNotification = (uid, { type, title, body, link }) => {
  db.collection('users').doc(uid).get().then(userDoc => {
    if (!userDoc.exists) return;
    const prefs = userDoc.data().notificationPrefs || {};
    if (prefs.inApp === false) return;

    return db
      .collection('notifications')
      .doc(uid)
      .collection('items')
      .add({
        type,
        title,
        body,
        link: link || null,
        read: false,
        createdAt: admin.firestore.Timestamp.now(),
      });
  }).catch(err => console.error('[Notifications] createNotification error:', err.message));
};

/**
 * Send an email notification to a user if notificationPrefs.email is enabled.
 * Fire-and-forget — does not throw.
 *
 * @param {string} uid
 * @param {string} subject
 * @param {string} html
 */
const notifyByEmail = (uid, subject, html) => {
  db.collection('users').doc(uid).get().then(userDoc => {
    if (!userDoc.exists) return;
    const data = userDoc.data();
    const prefs = data.notificationPrefs || {};
    if (prefs.email === false) return;
    if (!data.email) return;
    sendMail(data.email, subject, html);
  }).catch(err => console.error('[Notifications] notifyByEmail error:', err.message));
};

module.exports = { createNotification, notifyByEmail };
