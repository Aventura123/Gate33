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

// Import the synchronization utility
import { syncUserRoleWithFirebase } from '../utils/firebaseAuthSync';

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
      
      if (user) {
        try {
          // Obter token e claims atualizados
          const idToken = await user.getIdToken(true);
          const idTokenResult = await user.getIdTokenResult();
          
          // Atualizar token no localStorage
          localStorage.setItem('firebaseToken', idToken);
          localStorage.setItem('firebaseUid', user.uid);
          
          // Determinar role baseado nos claims ou localStorage
          let userRole: UserRole | null = null;
          
          if (idTokenResult.claims.role) {
            userRole = idTokenResult.claims.role as UserRole;
            localStorage.setItem('userRole', userRole);
          } else {
            // Fallback: tentar determinar role baseado nos tokens existentes
            if (localStorage.getItem('seekerToken')) {
              userRole = 'seeker';
            } else if (localStorage.getItem('companyToken') || localStorage.getItem('token') || localStorage.getItem('companyId')) {
              userRole = 'company';
            } else if (localStorage.getItem('adminToken')) {
              userRole = 'admin';
            } else if (localStorage.getItem('supportToken')) {
              userRole = 'support';
            } else {
              userRole = initialRole;
            }
          }
          
          setUserRole(userRole);
          
          console.log('Auth state updated:', {
            uid: user.uid,
            email: user.email,
            role: userRole,
            claims: idTokenResult.claims
          });
          
        } catch (error) {
          console.error('Erro ao processar mudança de auth state:', error);
          
          // Fallback para role baseado em localStorage
          if (localStorage.getItem('seekerToken')) {
            setUserRole('seeker');
          } else if (localStorage.getItem('companyToken') || localStorage.getItem('token') || localStorage.getItem('companyId')) {
            setUserRole('company');
          } else if (localStorage.getItem('adminToken')) {
            setUserRole('admin');
          } else if (localStorage.getItem('supportToken')) {
            setUserRole('support');
          } else {
            setUserRole(initialRole);
          }
        }
      } else {
        setUserRole(null);
        // Limpar tokens do Firebase
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('firebaseUid');
        localStorage.removeItem('userRole');
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
      
      // Sincronizar o papel do usuário com o Firebase Auth para as regras do Firestore funcionarem
      await syncUserRoleWithFirebase(result.user, 'seeker');
      
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
        // Manter compatibilidade com alguns componentes que esperam estes valores
        const seekerData = seekerSnap.data();
        if (seekerData?.id) {
          localStorage.setItem("token", btoa(seekerData.id));
        }
        
        setUserRole('seeker');
        
        // Sincronizar o papel do usuário com o Firebase Auth
        await syncUserRoleWithFirebase(result.user, 'seeker');
        
        return result.user;
        
      } else if (role === 'company') {
        console.log('Attempting company login...');
        
        // Check if user exists in companies collection
        const companyRef = doc(db, 'companies', result.user.uid);
        const companySnap = await getDoc(companyRef);
        
        if (!companySnap.exists()) {
          console.log('Company document not found by UID, looking by email...');
          // Check if this email exists in seekers collection first
          const seekersRef = collection(db, 'seekers');
          const seekerQuery = query(seekersRef, where('email', '==', email));
          const seekerSnap = await getDocs(seekerQuery);
          
          if (!seekerSnap.empty) {
            await signOut(auth); // Sign out from Firebase
            throw new Error('This email belongs to a job seeker account. Please login as a job seeker.');
          }
          
          // Look for company by email - this should not happen if properly migrated
          const companiesRef = collection(db, 'companies');
          const emailQuery = query(companiesRef, where('email', '==', email));
          const emailSnap = await getDocs(emailQuery);
          
          if (!emailSnap.empty) {
            console.log('Found company by email but not by UID - migration issue');
            await signOut(auth);
            throw new Error('Company account found but not properly migrated. Please contact support.');
          } else {
            await signOut(auth); // Sign out from Firebase
            throw new Error('Company account not found. Please register as a company.');
          }
        }
        
        // Company found, check if approved
        const companyData = companySnap.data();
        
        if (!companyData?.approved && companyData?.status !== 'approved') {
          await signOut(auth); // Sign out from Firebase
          throw new Error('Company account is pending approval by administrator.');
        }
        
        localStorage.setItem('companyToken', btoa(result.user.uid));
        // Manter compatibilidade com o dashboard que espera estes valores
        localStorage.setItem("token", btoa(companyData.id || result.user.uid));
        localStorage.setItem("companyId", companyData.id || result.user.uid);
        localStorage.setItem("companyName", companyData.companyName || companyData.name || result.user.email || "Company");
        localStorage.setItem("companyEmail", result.user.email || "");
        localStorage.setItem("companyFirebaseUid", result.user.uid);
        
        // Set authentication cookie
        document.cookie = "isAuthenticated=true; path=/; max-age=86400"; // 24 hours
        
        setUserRole('company');
        
        // Sincronizar o papel do usuário com o Firebase Auth
        await syncUserRoleWithFirebase(result.user, 'company');
        
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
        
        // Sincronizar o papel do usuário com o Firebase Auth
        await syncUserRoleWithFirebase(result.user, 'seeker');
        
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
        // Remover também tokens de compatibilidade
        localStorage.removeItem('token');
      } else if (userRole === 'company') {
        await signOut(auth);
        localStorage.removeItem('companyToken');
        // Also remove legacy tokens if they exist
        localStorage.removeItem('token');
        localStorage.removeItem('companyId');
        localStorage.removeItem('companyName');
        localStorage.removeItem('companyEmail');
        localStorage.removeItem('companyFirebaseUid');
        localStorage.removeItem('firebaseToken');
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
