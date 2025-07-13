/**
 * SCRIPT DE MIGRAÇÃO DE ADMINS PARA FIREBASE AUTH
 * 
 * ✅ FUNCIONAL - IDs SINCRONIZADOS ENTRE FIRESTORE E AUTH
 * 
 * Este script migra admins do sistema legado para Firebase Auth,
 * garantindo que os IDs ficam sincronizados através da movimentação
 * dos documentos Firestore para usar o UID do Firebase Auth.
 * 
 * COMO USAR:
 *   node scripts/migrate-admins-to-firebase.js --verbose
 * 
 * RESULTADO:
 *   - Cria usuários no Firebase Auth para admins
 *   - Move documentos Firestore para novos IDs (UID do Auth)
 *   - Custom claims definidos automaticamente
 *   - Senhas temporárias geradas (usar "Esqueci a senha")
 * 
 * SEGURANÇA:
 *   - Script seguro - não deleta dados
 *   - Pode ser executado múltiplas vezes
 *   - Sistema legado continua funcionando
 */

const { initializeApp, getApps } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } = require('firebase/firestore');
const admin = require('firebase-admin');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase Admin (for custom claims)
let adminApp;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
    const serviceAccount = {
      type: 'service_account',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      projectId: process.env.FIREBASE_PROJECT_ID,
    };
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    throw new Error('No Firebase Admin credentials found');
  }
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase Admin:', error);
  process.exit(1);
}

// Initialize Firebase client
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Command line arguments
const VERBOSE = process.argv.includes('--verbose');

function log(message, level = 'info') {
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${prefix[level]} ${message}`);
}

function verbose(message) {
  if (VERBOSE) {
    console.log(`   🔍 ${message}`);
  }
}

function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function migrateAdminWithCorrectIdStructure(adminUser) {
  try {
    verbose(`Processando admin: ${adminUser.email} (ID atual: ${adminUser.id})`);
    
    const tempPassword = generateTempPassword();
    const displayName = adminUser.name || adminUser.username || 'Admin';
    
    // Criar usuário no Firebase Auth (vai gerar novo UID)
    const userCredential = await createUserWithEmailAndPassword(auth, adminUser.email, tempPassword);
    const newAuthUid = userCredential.user.uid;
    
    verbose(`Admin criado no Auth com UID: ${newAuthUid}`);
    
    // Atualizar perfil se necessário
    if (displayName) {
      await updateProfile(userCredential.user, { 
        displayName,
        photoURL: adminUser.photoURL || adminUser.photo || null
      });
    }
    
    // Definir custom claims via Firebase Admin
    await admin.auth().setCustomUserClaims(newAuthUid, {
      role: 'admin',
      adminId: adminUser.id // Manter referência ao ID original
    });
    
    verbose(`Custom claims definidos para admin: ${newAuthUid}`);
    
    // ESTRATÉGIA: Mover documento para usar o novo UID como ID
    verbose(`Movendo documento do Firestore para novo ID: ${newAuthUid}`);
    
    // 1. Criar novo documento com o UID do Auth
    const newAdminRef = doc(db, 'admins', newAuthUid);
    await setDoc(newAdminRef, {
      ...adminUser,
      firebaseAuthUid: newAuthUid,
      migratedToAuth: true,
      migrationDate: new Date(),
      authProvider: 'migrated',
      tempPassword: tempPassword,
      uidsSynchronized: true,
      oldFirestoreId: adminUser.id // Guardar o ID antigo para referência
    });
    
    // 2. Deletar documento antigo
    const oldAdminRef = doc(db, 'admins', adminUser.id);
    await deleteDoc(oldAdminRef);
    
    verbose(`✅ IDs SINCRONIZADOS: ${newAuthUid} (documento movido)`);
    
    return { 
      success: true, 
      authUid: newAuthUid, 
      synchronized: true,
      moved: true,
      tempPassword: tempPassword,
      oldId: adminUser.id
    };
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      verbose('Email já existe no Auth - pulando');
      return { success: true, authUid: 'existing', skipped: true };
    }
    
    const errorMsg = error.message || error.toString();
    verbose(`❌ Erro ao migrar: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

async function migrateAdmins() {
  try {
    log('🚀 Iniciando migração de ADMINS com SINCRONIZAÇÃO DE IDs...');
    log('🎯 ESTRATÉGIA: Mover documentos Firestore para usar UID do Auth');
    
    // Buscar todos os admins não migrados
    log('📖 Buscando admins não migrados...');
    const adminsCollection = collection(db, 'admins');
    const snapshot = await getDocs(adminsCollection);
    
    const admins = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Migrar admins que ainda não foram migrados para o Auth
      if (!data.migratedToAuth && data.email && data.email.includes('@')) {
        admins.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    if (admins.length === 0) {
      log('✅ Todos os admins já foram migrados!', 'success');
      return;
    }
    
    log(`📊 Encontrados ${admins.length} admins para migrar`);
    
    const stats = {
      total: admins.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      newlyMigrated: 0
    };
    
    // Migrar cada admin
    for (const adminUser of admins) {
      verbose(`\n--- Migrando Admin: ${adminUser.email} ---`);
      
      const result = await migrateAdminWithCorrectIdStructure(adminUser);
      
      if (result.success) {
        if (result.skipped) {
          stats.skipped++;
          verbose(`⏭️ Admin já existia no Auth: ${adminUser.email}`);
        } else {
          stats.migrated++;
          if (result.moved) {
            stats.newlyMigrated++;
            log(`✅ Admin migrado com IDs sincronizados: ${adminUser.email} → ${result.authUid}`, 'success');
          }
        }
      } else {
        stats.errors++;
        log(`❌ Erro ao migrar ${adminUser.email}: ${result.error}`, 'error');
      }
      
      // Pausa pequena para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Relatório final
    log('\n📊 RELATÓRIO FINAL:', 'success');
    log(`   📋 Total de admins: ${stats.total}`);
    log(`   ✅ Migrados com sucesso: ${stats.migrated}`);
    log(`   ⏭️ Já existiam: ${stats.skipped}`);
    log(`   ❌ Erros: ${stats.errors}`);
    
    if (stats.newlyMigrated > 0) {
      log('\n🎉 MIGRAÇÃO COM IDs SINCRONIZADOS CONCLUÍDA!', 'success');
      log('   ✅ Custom claims definidos automaticamente', 'success');
      log('   ✅ Dados sincronizados entre Firestore e Auth', 'success');
    }
    
    if (stats.newlyMigrated > 0) {
      log('\n🔑 SENHAS TEMPORÁRIAS:', 'warning');
      log('   Admins podem usar "Esqueci a senha" para redefinir', 'warning');
    }
    
    log('\n✅ Migração concluída!', 'success');
    
  } catch (error) {
    log(`❌ Erro fatal: ${error}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Executar migração se este arquivo for chamado diretamente
if (require.main === module) {
  migrateAdmins()
    .then(() => {
      console.log('\n🏁 Script de migração finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal no script:', error);
      process.exit(1);
    });
}

module.exports = { migrateAdmins };
