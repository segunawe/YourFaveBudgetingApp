const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      return admin.app();
    }

    // Initialize with credentials from environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    console.log('Firebase Admin initialized successfully');
    return admin.app();
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
};

// Initialize on module load
initializeFirebase();

// Export admin instance and Firestore
const db = admin.firestore();
const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth,
};
