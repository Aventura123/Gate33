"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User,
  sendPasswordResetEmail,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Import firebase app reference
import firebase, { auth, db } from '../lib/firebase';

// Define types for user roles
export type UserRole = 'seeker' | 'company' | 'admin' | 'support';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  userRole: UserRole | null;
  loginWithGoogle: (role?: UserRole) => Promise<User>;
  loginWithEmail: (email: string, password: string, role?: UserRole) => Promise<User>;
  signup: (email: string, password: string, userData: any, role?: UserRole) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
export const AuthProvider = ({ children, initialRole = 'seeker' }: { children: ReactNode, initialRole?: UserRole }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Try to determine user role from localStorage
      if (user) {        // Try to determine role based on tokens in localStorage
        if (localStorage.getItem('seekerToken')) {
          setUserRole('seeker');
        } else if (localStorage.getItem('companyToken') || localStorage.getItem('token') || localStorage.getItem('companyId')) {
          setUserRole('company');
        } else if (localStorage.getItem('adminToken')) {
          setUserRole('admin');
        } else if (localStorage.getItem('supportToken')) {
          setUserRole('support');
        } else {
          // Default to the initial role
          setUserRole(initialRole);
        }
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [initialRole]);

  const clearError = () => setError(null);
  const loginWithGoogle = async (role: UserRole = 'seeker') => {
    setError(null);
    try {
      // Currently, only seekers can use Google authentication
      if (role !== 'seeker') {
        throw new Error(`Google authentication is not available for ${role} accounts`);
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if this email exists in companies collection first
      if (result.user.email) {
        const companiesRef = collection(db, 'companies');
        const companyQuery = query(companiesRef, where('email', '==', result.user.email));
        const companySnap = await getDocs(companyQuery);
        
        if (!companySnap.empty) {
          await signOut(auth); // Sign out from Firebase
          throw new Error('This email belongs to a company account. Please login as a company using email and password.');
        }
      }
      
      // Check if user exists in Firestore
      const userRef = doc(db, "seekers", result.user.uid);
      const userDoc = await getDoc(userRef);
      
      // If user doesn't exist in Firestore, create a new record
      if (!userDoc.exists()) {
        const userData = {
          email: result.user.email,
          firstName: result.user.displayName?.split(' ')[0] || '',
          lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          name: result.user.displayName?.split(' ')[0] || '',
          surname: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          photoURL: result.user.photoURL,
          createdAt: new Date(),
          notificationPreferences: { marketing: true },
          authProvider: "google"
        };
        
        await setDoc(userRef, userData);
      }
      
      // Set role and token
      setUserRole('seeker');
      localStorage.setItem('seekerToken', btoa(result.user.uid));
      
      return result.user;
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
      throw err;
    }
  };const loginWithEmail = async (email: string, password: string, role: UserRole = 'seeker') => {
    console.log(`AuthProvider.loginWithEmail called with email: ${email}, role: ${role}`);
    setError(null);
    try {
      // First, authenticate with Firebase
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Now check if the user exists in the correct collection based on the role
      if (role === 'seeker') {
        console.log('Attempting seeker login...');
        
        // Check if user exists in seekers collection
        const seekerRef = doc(db, 'seekers', result.user.uid);
        const seekerSnap = await getDoc(seekerRef);
        
        if (!seekerSnap.exists()) {
          // Check if this email exists in companies collection
          const companiesRef = collection(db, 'companies');
          const companyQuery = query(companiesRef, where('email', '==', email));
          const companySnap = await getDocs(companyQuery);
          
          if (!companySnap.empty) {
            await signOut(auth); // Sign out from Firebase
            throw new Error('This email belongs to a company account. Please login as a company.');
          }
          
          // If not found in either collection, this might be a new Firebase user
          throw new Error('Seeker account not found. Please sign up as a job seeker.');
        }
        
        localStorage.setItem('seekerToken', btoa(result.user.uid));
        setUserRole('seeker');
        return result.user;
        
      } else if (role === 'company') {
        console.log('Attempting company login...');
        
        // Check if user exists in companies collection
        const companyRef = doc(db, 'companies', result.user.uid);
        const companySnap = await getDoc(companyRef);
        
        if (!companySnap.exists()) {
          console.log('Company document not found, looking by email...');
          // Check if this email exists in seekers collection
          const seekersRef = collection(db, 'seekers');
          const seekerQuery = query(seekersRef, where('email', '==', email));
          const seekerSnap = await getDocs(seekerQuery);
          
          if (!seekerSnap.empty) {
            await signOut(auth); // Sign out from Firebase
            throw new Error('This email belongs to a job seeker account. Please login as a job seeker.');
          }
          
          // Procurar por email se não encontrar pelo UID
          const companiesRef = collection(db, 'companies');
          const emailQuery = query(companiesRef, where('email', '==', email));
          const emailSnap = await getDocs(emailQuery);
          
          if (!emailSnap.empty) {
            console.log('Found company by email, migrating...');
            const existingCompanyData = emailSnap.docs[0].data();
            const existingCompanyId = emailSnap.docs[0].id;
            
            // Migrar dados para o novo UID
            await setDoc(companyRef, {
              ...existingCompanyData,
              firebaseAuthUid: result.user.uid,
              migratedAt: new Date()
            });
            
            console.log('Company migrated successfully');
          } else {
            await signOut(auth); // Sign out from Firebase
            throw new Error('Company account not found. Please register as a company.');
          }
        }
        
        // Re-fetch company data
        const finalCompanySnap = await getDoc(companyRef);
        const companyData = finalCompanySnap.data();
        
        if (!companyData?.approved && companyData?.status !== 'approved') {
          await signOut(auth); // Sign out from Firebase
          throw new Error('Company account is pending approval by administrator.');
        }
        
        localStorage.setItem('companyToken', btoa(result.user.uid));
        setUserRole('company');
        return result.user;
      } else {
        await signOut(auth); // Sign out from Firebase
        throw new Error(`Email authentication via Firebase is only available for seeker or company accounts`);
      }
    } catch (err: any) {
      console.error('LoginWithEmail error:', err);// Translate common Firebase errors
      let errorMessage = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'User not found.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  const signup = async (email: string, password: string, userData: any, role: UserRole = 'seeker') => {
    setError(null);
    try {
      // Only seekers use Firebase Auth for now
      if (role === 'seeker') {
        // Create user with Firebase Auth
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        // Set user data in Firestore using the UID from Firebase Auth
        const userRef = doc(db, "seekers", result.user.uid);
        await setDoc(userRef, {
          ...userData,
          email,
          createdAt: new Date(),
          notificationPreferences: { marketing: true },
          authProvider: "email"
        });
        
        // Update user profile display name
        if (userData.firstName) {
          await updateProfile(result.user, {
            displayName: `${userData.firstName} ${userData.lastName || ''}`.trim()
          });
        }
        
        // Store token
        localStorage.setItem('seekerToken', btoa(result.user.uid));
        setUserRole('seeker');
        
        return result.user;
      } else {
        throw new Error(`Sign up via Firebase is only available for seeker accounts`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      throw err;
    }
  };
  const logout = async () => {
    setError(null);
    try {
      // If it's a Firebase-authenticated user (seeker or company)
      if (userRole === 'seeker') {
        await signOut(auth);
        localStorage.removeItem('seekerToken');
      } else if (userRole === 'company') {
        await signOut(auth);
        localStorage.removeItem('companyToken');
        // Also remove legacy tokens if they exist
        localStorage.removeItem('token');
        localStorage.removeItem('companyId');
        localStorage.removeItem('companyName');
        localStorage.removeItem('companyPhoto');
      } else if (userRole === 'admin') {
        localStorage.removeItem('adminToken');
      } else if (userRole === 'support') {
        localStorage.removeItem('supportToken');
      }
      
      setUserRole(null);
      document.cookie = "isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch (err: any) {
      setError(err.message || 'Failed to logout');
      throw err;
    }
  };
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      // Firebase password reset (for seeker and company)
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
      throw err;
    }
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    setError(null);
    try {
      if (!auth.currentUser) throw new Error('No user signed in');
      
      await updateProfile(auth.currentUser, {
        displayName,
        ...(photoURL && { photoURL })
      });
        // Also update in Firestore based on user role
      if (userRole === 'seeker' && auth.currentUser) {
        const userRef = doc(db, "seekers", auth.currentUser.uid);
        await updateDoc(userRef, {
          name: displayName.split(' ')[0],
          surname: displayName.split(' ').slice(1).join(' '),
          ...(photoURL && { photoURL })
        });
      } else if (userRole === 'company' && auth.currentUser) {
        const userRef = doc(db, "companies", auth.currentUser.uid);
        await updateDoc(userRef, {
          companyName: displayName,
          ...(photoURL && { photoURL })
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setError(null);
    try {
      if (!auth.currentUser || !auth.currentUser.email) throw new Error('No user signed in');
      
      // Re-authenticate user before changing password (for Firebase Auth)
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, newPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      throw err;
    }
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    userRole,
    loginWithGoogle,
    loginWithEmail,
    signup,
    logout,
    resetPassword,
    updateUserProfile,
    changePassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// For backwards compatibility
export const SeekerAuthProvider = AuthProvider;
export const useSeekerAuth = useAuth;
