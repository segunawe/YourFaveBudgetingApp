import React, { createContext, useState, useEffect, useContext } from 'react';
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

  // Sign up with email and password
  const signup = async (email, password, displayName) => {
    try {
      setError(null);

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName || '',
        createdAt: new Date(),
        connectedAccounts: [],
        totalBalance: 0,
        termsAcceptedAt: new Date(),
        transactionLimit: null,
        notificationPrefs: { email: true, inApp: true },
        tier: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      });

      return user;
    } catch (err) {
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
      if (user) {
        // User is signed in - keep the Firebase user object intact
        const userData = await getUserData(user.uid);
        // Attach Firestore data as a property instead of spreading
        user.firestoreData = userData;
        setCurrentUser(user);
      } else {
        // User is signed out
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
