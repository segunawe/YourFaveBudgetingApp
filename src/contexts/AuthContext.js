import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { TOS_VERSION } from '../constants/tos';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Prevents onAuthStateChanged from racing with signup's own Firestore write
  const signingUpRef = useRef(false);

  // Sign up with email and password
  const signup = async (email, password, displayName) => {
    let user = null;
    try {
      setError(null);
      signingUpRef.current = true;

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName });
      }

      const firestoreData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || '',
        createdAt: new Date(),
        connectedAccounts: [],
        totalBalance: 0,
        termsAcceptedAt: new Date(),
        tosVersion: TOS_VERSION,
        transactionLimit: null,
        notificationPrefs: { email: true, inApp: true },
        tier: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };

      await setDoc(doc(db, 'users', user.uid), firestoreData);

      // Attach firestoreData before handing off to the rest of the app
      user.firestoreData = firestoreData;
      signingUpRef.current = false;
      setCurrentUser(user);

      return user;
    } catch (err) {
      signingUpRef.current = false;
      // If the Auth user was created but the Firestore write failed, delete the
      // Auth user so the email isn't permanently locked out of signing up again.
      if (user) {
        try { await deleteUser(user); } catch (_) {}
      }
      setError(err.message);
      throw err;
    }
  };

  // Login with email and password
  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      setError(null);
      if (currentUser) {
        await updateProfile(auth.currentUser, updates);

        // Update Firestore document
        await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Delete account — cleans up Firestore via backend then deletes Firebase Auth user
  const deleteAccount = async () => {
    try {
      setError(null);
      const token = await currentUser.getIdToken();
      await fetch(`${process.env.REACT_APP_API_URL}/users/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await deleteUser(auth.currentUser);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Get user document from Firestore
  const getUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  };

  // Re-fetch Firestore doc and update currentUser.firestoreData in state
  const refreshUserData = async () => {
    if (!auth.currentUser) return;
    const userData = await getUserData(auth.currentUser.uid);
    auth.currentUser.firestoreData = userData;
    setCurrentUser(Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser));
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // signup() manages its own state to avoid a race where this handler
      // fires before the Firestore doc has been written.
      if (signingUpRef.current) return;
      setLoading(true);
      if (user) {
        const userData = await getUserData(user.uid);
        user.firestoreData = userData;
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    error,
    signup,
    login,
    logout,
    updateUserProfile,
    getUserData,
    refreshUserData,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
