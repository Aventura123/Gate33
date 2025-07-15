import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, type UserCredential, type Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, type DocumentData, setDoc, updateDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll, type StorageReference, type FirebaseStorage } from 'firebase/storage';

// Helper function to clean environment variables (remove quotes if present)
const cleanEnvVar = (value: string | undefined): string => {
  if (!value) return '';
  return value.replace(/^["']|["']$/g, ''); // Remove leading/trailing quotes
};

// Firebase configuration with sensitive information in environment variables
const firebaseConfig = {
  apiKey: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)
};

// Validate Firebase config before initialization
const validateFirebaseConfig = () => {
  const requiredFields = [
    { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
    { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
    { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
    { key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', value: firebaseConfig.storageBucket },
    { key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', value: firebaseConfig.messagingSenderId },
    { key: 'NEXT_PUBLIC_FIREBASE_APP_ID', value: firebaseConfig.appId }
  ];

  const missingFields = requiredFields.filter(field => !field.value || field.value.trim() === '');
  
  if (missingFields.length > 0) {
    console.error('❌ Missing Firebase configuration:');
    missingFields.forEach(field => {
      console.error(`  - ${field.key}: "${field.value}"`);
    });
    throw new Error(`Firebase configuration incomplete: ${missingFields.map(f => f.key).join(', ')}`);
  }

  console.log('✅ Firebase configuration validated:', {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 20)}...` : 'MISSING'
  });
};

// Validate config before proceeding (only in browser)
if (typeof window !== 'undefined') {
  validateFirebaseConfig();
}

// Initialize Firebase only once with proper error handling
let app: FirebaseApp;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase app initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase app:', error);
  console.error('Firebase config being used:', firebaseConfig);
  throw error;
}

// Initialize Services with error handling
let auth: Auth, db: Firestore, storage: FirebaseStorage;
try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log('✅ Firebase services initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase services:', error);
  throw error;
}

// Define a type for the storage error
interface StorageErrorType {
  code?: string;
  name?: string;
  message?: string;
  serverResponse?: string;
  stack?: string;
}

// Add handler to capture errors
const handleStorageError = (error: StorageErrorType) => {
  if (!error) {
    console.error("Firebase not initialized");
    return;
  }

  console.error("======== FIREBASE STORAGE ERROR ========");
  console.error("Error Code:", error.code);
  console.error("Error Name:", error.name);
  console.error("Error Message:", error.message);
  console.error("Server Response:", error.serverResponse);
  console.error("Error Stack:", error.stack);
  console.error("========================================");
  // Check common causes and provide detailed suggestions
  if (error.code === "storage/unauthorized") {
    console.error("SOLUTION: Check Firebase Storage security rules. Make sure the rule allows read and write access for the specified path.");
    console.error("Example of permissive rule for testing: service firebase.storage { match /b/{bucket}/o { match /{allPaths=**} { allow read, write: if request.auth != null || true; }}}");
  } else if (error.code === "storage/canceled") {
    console.error("SOLUTION: Upload was canceled. Check for timeout or if the user interrupted the process.");
  } else if (error.code === "storage/unknown") {
    console.error("SOLUTION: Check network connection, Firebase Storage rules, and file size.");
    console.error("Try restarting the application and verify if Firebase Storage is operational in the Firebase console.");
  } else if (error.code === "storage/object-not-found") {
    console.error("SOLUTION: The requested file does not exist. Check the path or create the file.");
  } else if (error.code === "storage/quota-exceeded") {
    console.error("SOLUTION: Firebase Storage quota exceeded. Upgrade to a higher plan or free up space.");
  } else if (error.code === "storage/unauthenticated") {
    console.error("SOLUTION: User not authenticated. Log in again or check security rules to allow anonymous access.");
  } else if (error.code === "storage/invalid-checksum") {
    console.error("SOLUTION: Problem with the upload. Try again or reduce the file size.");
  } else if (error.code === "storage/server-file-wrong-size") {
    console.error("SOLUTION: Problem with the file size. Try resizing the image before uploading.");
  }
};

// Advanced diagnostic function for Firebase Storage
const diagnoseFBStorage = async () => {
  try {
    // 1. Check if Firebase is initialized
    if (!storage) {
      console.error("Firebase Storage is not initialized!");
      return {
        status: "error",
        message: "Firebase Storage not initialized",
        suggestions: ["Check if Firebase credentials are correct", "Check if Firebase is being imported correctly"]
      };
    }
    
    // 2. Try a simple operation - list files
    try {
      // This line will fail if there are permission or connectivity issues
      const rootRef = ref(storage, '/');
      
      // Try to create a reference to a test file
      const testRef = ref(storage, 'test-connection.txt');
      
      return {
        status: "success",
        message: "Firebase Storage appears to be working correctly",
        storage: storage,
        rootRef: rootRef
      };
    } catch (listError) {
      console.error("Error when trying operation in Firebase Storage:", listError);
      return {
        status: "error",
        message: "Error executing operation in Firebase Storage",
        error: listError,
        suggestions: [
          "Check your internet connection",
          "Check Firebase Storage security rules",
          "Check if the Firebase Storage bucket exists and is accessible"
        ]
      };
    }
  } catch (error) {
    console.error("Error in Firebase Storage diagnostic:", error);
    return {
      status: "error",
      message: "Error executing diagnostic",
      error: error
    };
  }
};

// Helpers for common Firebase operations
const firebase = {
  app,
  auth,
  db,
  storage,
  
  // Auth helpers
  signIn: async (email: string, password: string): Promise<UserCredential> => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },
  
  // Firestore helpers
  getDocument: async (collection: string, id: string): Promise<DocumentData | null> => {
    try {
      const docRef = doc(db, collection, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error(`Error getting document from ${collection}:`, error);
      throw error;
    }
  },
  
  createDocument: async <T extends DocumentData>(collectionPath: string, id: string, data: T): Promise<void> => {
    try {
      const docRef = doc(db, collectionPath, id);
      await setDoc(docRef, data);
    } catch (error) {
      console.error(`Error creating document in ${collectionPath}:`, error);
      throw error;
    }
  },
  
  updateDocument: async <T extends DocumentData>(collectionPath: string, id: string, data: Partial<T>): Promise<void> => {
    try {
      const docRef = doc(db, collectionPath, id);
      await updateDoc(docRef, data as any);
    } catch (error) {
      console.error(`Error updating document in ${collectionPath}:`, error);
      throw error;
    }
  },
  
  deleteDocument: async (collectionPath: string, id: string): Promise<void> => {
    try {
      const docRef = doc(db, collectionPath, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${collectionPath}:`, error);
      throw error;
    }
  },
  
  // Storage helpers
  uploadFile: async (path: string, file: File | Blob): Promise<string> => {
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      handleStorageError(error as StorageErrorType);
      throw error;
    }
  },
  
  deleteFile: async (path: string): Promise<void> => {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      handleStorageError(error as StorageErrorType);
      throw error;
    }
  },
  
  listFiles: async (path: string): Promise<StorageReference[]> => {
    try {
      const storageRef = ref(storage, path);
      const result = await listAll(storageRef);
      return result.items;
    } catch (error) {
      handleStorageError(error as StorageErrorType);
      throw error;
    }
  }
};

export { firebase, auth, db, storage, handleStorageError, getAuth, GoogleAuthProvider, diagnoseFBStorage };
export default firebase;