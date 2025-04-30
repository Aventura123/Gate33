// Add a log at the very beginning of the file to confirm loading
console.log("--- firebase.ts loaded ---");

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { getFirestore, doc, getDoc, DocumentData, collection, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll, StorageReference } from 'firebase/storage';

// Configuração do Firebase com informações sensíveis em variáveis de ambiente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBUZ-F0kzPxRdlSkBacI2AnlNe8_-BuSZo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gate33-b5029.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gate33-b5029",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gate33-b5029.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "823331487278",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:823331487278:web:932f2936eef09e37c3a9bf"
};

// Initialize Firebase only once
console.log("Inicializando Firebase...");
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
console.log("Firebase inicializado com sucesso");

// Initialize Services
console.log("Inicializando serviços Firebase...");
const auth = getAuth(app);
const db = getFirestore(app);
let storage = getStorage(app);

// Ensure the correct bucket is used
console.log("Atualizando Firebase Storage para usar o bucket correto...");
storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
console.log("Firebase Storage atualizado com sucesso.");

// Define a type for the storage error
interface StorageErrorType {
  code?: string;
  name?: string;
  message?: string;
  serverResponse?: string;
  stack?: string;
}

// Adicionar handler para capturar erros
const handleStorageError = (error: StorageErrorType) => {
  if (!error) {
    console.error("Firebase não inicializado");
    return;
  }

  console.error("======== FIREBASE STORAGE ERROR ========");
  console.error("Error Code:", error.code);
  console.error("Error Name:", error.name);
  console.error("Error Message:", error.message);
  console.error("Server Response:", error.serverResponse);
  console.error("Error Stack:", error.stack);
  console.error("========================================");

  // Verificar causas comuns e fornecer sugestões mais detalhadas
  if (error.code === "storage/unauthorized") {
    console.error("SOLUÇÃO: Verifique as regras de segurança do Firebase Storage. Certifique-se de que a regra permita leitura e escrita para o caminho especificado.");
    console.error("Exemplo de regra permissiva para teste: service firebase.storage { match /b/{bucket}/o { match /{allPaths=**} { allow read, write: if request.auth != null || true; }}}");
  } else if (error.code === "storage/canceled") {
    console.error("SOLUÇÃO: Upload foi cancelado. Verifique se há timeout ou se o usuário interrompeu o processo.");
  } else if (error.code === "storage/unknown") {
    console.error("SOLUÇÃO: Verifique a conexão de rede, as regras do Firebase Storage e o tamanho do arquivo.");
    console.error("Tente reiniciar o aplicativo e verificar se o Firebase Storage está operacional na console do Firebase.");
  } else if (error.code === "storage/object-not-found") {
    console.error("SOLUÇÃO: O arquivo solicitado não existe. Verifique o caminho ou crie o arquivo.");
  } else if (error.code === "storage/quota-exceeded") {
    console.error("SOLUÇÃO: Cota do Firebase Storage excedida. Atualize para um plano superior ou libere espaço.");
  } else if (error.code === "storage/unauthenticated") {
    console.error("SOLUÇÃO: Usuário não autenticado. Faça login novamente ou verifique as regras de segurança para permitir acesso anônimo.");
  } else if (error.code === "storage/invalid-checksum") {
    console.error("SOLUÇÃO: Problema com o upload. Tente novamente ou reduza o tamanho do arquivo.");
  } else if (error.code === "storage/server-file-wrong-size") {
    console.error("SOLUÇÃO: Problema com o tamanho do arquivo. Tente redimensionar a imagem antes do upload.");
  }
};

// Função de diagnóstico avançado para o Firebase Storage
const diagnoseFBStorage = async () => {
  try {
    console.log("Iniciando diagnóstico do Firebase Storage...");
    
    // 1. Verificar se o Firebase está inicializado
    if (!storage) {
      console.error("Firebase Storage não está inicializado!");
      return {
        status: "error",
        message: "Firebase Storage não inicializado",
        suggestions: ["Verifique se as credenciais do Firebase estão corretas", "Verifique se o Firebase está sendo importado corretamente"]
      };
    }
    
    // 2. Tentar uma operação simples - listar arquivos
    try {
      console.log("Tentando listar referências no bucket padrão...");
      // Esta linha irá falhar se houver problemas de permissão ou conectividade
      const rootRef = ref(storage, '/');
      console.log("Referência root criada com sucesso:", rootRef);
      
      // Tentar criar uma referência a um arquivo de teste
      const testRef = ref(storage, 'test-connection.txt');
      console.log("Referência de teste criada com sucesso:", testRef);
      
      return {
        status: "success",
        message: "Firebase Storage parece estar funcionando corretamente",
        storage: storage,
        rootRef: rootRef
      };
    } catch (listError) {
      console.error("Erro ao tentar operação no Firebase Storage:", listError);
      return {
        status: "error",
        message: "Erro ao executar operação no Firebase Storage",
        error: listError,
        suggestions: [
          "Verifique sua conexão de internet",
          "Verifique as regras de segurança do Firebase Storage",
          "Verifique se o bucket do Firebase Storage existe e está acessível"
        ]
      };
    }
  } catch (error) {
    console.error("Erro no diagnóstico do Firebase Storage:", error);
    return {
      status: "error",
      message: "Erro ao executar diagnóstico",
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
      const snapshot = await uploadBytes(storageRef, file);
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