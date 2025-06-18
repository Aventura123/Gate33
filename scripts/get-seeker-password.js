// Script para consultar senhas temporárias de seekers migrados
const { initializeApp, getApps } = require('firebase/app');
const { 
  getFirestore, 
  doc, 
  getDoc
} = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBUZ-F0kzPxRdlSkBacI2AnlNe8_-BuSZo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gate33-b5029.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gate33-b5029",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gate33-b5029.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "823331487278",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:823331487278:web:932f2936eef09e37c3a9bf"
};

// Inicializar Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function getSeekerTempPassword(email) {
  try {
    console.log(`🔍 Buscando informações do seeker: ${email}`);
    
    // Buscar pelo email nos documentos seekers
    const { collection, getDocs, query, where } = require('firebase/firestore');
    
    const seekersRef = collection(db, 'seekers');
    const q = query(seekersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`❌ Nenhum seeker encontrado com o email: ${email}`);
      return null;
    }
    
    let seekerData = null;
    querySnapshot.forEach((doc) => {
      seekerData = { id: doc.id, ...doc.data() };
    });
    
    console.log(`✅ Seeker encontrado: ID ${seekerData.id}`);
    console.log(`📧 Email: ${seekerData.email}`);
    console.log(`👤 Nome: ${seekerData.firstName || seekerData.name || 'N/A'} ${seekerData.lastName || seekerData.surname || ''}`);
    
    if (seekerData.migratedToAuth) {
      console.log(`✅ Status: Migrado para Firebase Auth`);
      console.log(`🔑 Firebase Auth UID: ${seekerData.firebaseAuthUid || 'N/A'}`);
      console.log(`📅 Data da migração: ${seekerData.migrationDate ? new Date(seekerData.migrationDate.seconds * 1000).toLocaleString() : 'N/A'}`);
      
      if (seekerData.tempPassword) {
        console.log(`🔐 Senha temporária: ${seekerData.tempPassword}`);
        console.log(`⚠️  IMPORTANTE: Esta senha deve ser redefinida pelo usuário!`);
      } else {
        console.log(`❌ Senha temporária não encontrada`);
      }
    } else {
      console.log(`⚠️  Status: Ainda não migrado para Firebase Auth`);
      if (seekerData.password) {
        console.log(`🔐 Senha atual (sistema legado): ${seekerData.password}`);
      }
    }
    
    return seekerData;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar seeker:`, error);
    return null;
  }
}

// Verificar argumentos da linha de comando
const email = process.argv[2];

if (!email) {
  console.log(`
🔍 Script para consultar senhas de seekers

USO:
  node scripts/get-seeker-password.js <email>

EXEMPLO:
  node scripts/get-seeker-password.js susana@teste5.com
`);
  process.exit(1);
}

// Executar consulta
getSeekerTempPassword(email)
  .then((seeker) => {
    if (seeker) {
      console.log(`\n✅ Consulta concluída!`);
    } else {
      console.log(`\n❌ Seeker não encontrado!`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error(`💥 Erro fatal:`, error);
    process.exit(1);
  });
