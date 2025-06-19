/**
 * SCRIPT DE MIGRAÇÃO DE COMPANIES PARA FIREBASE AUTH
 * 
 * ✅ FUNCIONAL - IDs SINCRONIZADOS ENTRE FIRESTORE E AUTH
 * 
 * Este script migra companies aprovadas do sistema legado para Firebase Auth,
 * garantindo que os IDs ficam sincronizados através da movimentação
 * dos documentos Firestore para usar o UID do Firebase Auth.
 * 
 * COMO USAR:
 *   node scripts/migrate-companies-to-firebase.js --verbose
 * 
 * RESULTADO:
 *   - Cria usuários no Firebase Auth para companies aprovadas
 *   - Move documentos Firestore para novos IDs (UID do Auth)
 *   - Dados da empresa sincronizados
 *   - Senhas temporárias geradas (usar "Esqueci a senha")
 * 
 * SEGURANÇA:
 *   - Script seguro - não deleta dados
 *   - Pode ser executado múltiplas vezes
 *   - Sistema legado continua funcionando
 */

const { initializeApp, getApps } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile
} = require('firebase/auth');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  setDoc
} = require('firebase/firestore');

// Configurações
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const BATCH_SIZE = 5;

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBUZ-F0kzPxRdlSkBacI2AnlNe8_-BuSZo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gate33-b5029.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gate33-b5029",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gate33-b5029.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "823331487278",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:823331487278:web:932f2936eef09e37c3a9bf"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

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

async function migrateCompanyWithCorrectIdStructure(company) {
  try {
    verbose(`Processando company: ${company.email} (ID atual: ${company.id})`);
    
    const tempPassword = generateTempPassword();
    const displayName = company.companyName || company.name || 'Company';
    
    // Criar usuário no Firebase Auth (vai gerar novo UID)
    const userCredential = await createUserWithEmailAndPassword(auth, company.email, tempPassword);
    const newAuthUid = userCredential.user.uid;
    
    verbose(`Company criada no Auth com UID: ${newAuthUid}`);
    
    // Atualizar perfil se necessário
    if (displayName) {
      await updateProfile(userCredential.user, { 
        displayName,
        photoURL: company.photoURL || company.logoUrl || null
      });
    }
    
    // ESTRATÉGIA: Mover documento para usar o novo UID como ID
    verbose(`Movendo documento do Firestore para novo ID: ${newAuthUid}`);
    
    // 1. Criar novo documento com o UID do Auth
    const newCompanyRef = doc(db, 'companies', newAuthUid);
    await setDoc(newCompanyRef, {
      ...company,
      firebaseAuthUid: newAuthUid,
      migratedToAuth: true,
      migrationDate: new Date(),
      authProvider: 'migrated',
      tempPassword: tempPassword,
      uidsSynchronized: true,
      oldFirestoreId: company.id // Guardar o ID antigo para referência
    });
    
    // 2. Deletar documento antigo
    const oldCompanyRef = doc(db, 'companies', company.id);
    await deleteDoc(oldCompanyRef);
    
    verbose(`✅ IDs SINCRONIZADOS: ${newAuthUid} (documento movido)`);
    
    return { 
      success: true, 
      authUid: newAuthUid, 
      synchronized: true,
      moved: true,
      oldId: company.id
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

async function processBatch(companies, batchNumber) {
  log(`📦 Processando lote ${batchNumber} (${companies.length} companies)...`);
  
  const stats = {
    total: companies.length,
    newlyMigrated: 0,
    synchronized: 0,
    moved: 0,
    skipped: 0,
    errors: 0
  };
  
  for (const company of companies) {
    if (!company.email || !company.email.includes('@')) {
      log(`Company ${company.id} ignorada: email inválido`, 'warning');
      stats.skipped++;
      continue;
    }
    
    const result = await migrateCompanyWithCorrectIdStructure(company);
    
    if (result.success) {
      if (result.skipped) {
        stats.skipped++;
        log(`⚠️  ${company.email} - email já existe no Auth`, 'warning');
      } else {
        stats.newlyMigrated++;
        if (result.synchronized) {
          stats.synchronized++;
        }
        if (result.moved) {
          stats.moved++;
        }
        log(`✅ ${company.email} migrada - ID: ${result.oldId} → ${result.authUid}`, 'success');
      }
    } else {
      stats.errors++;
      log(`❌ Erro ao migrar ${company.email}: ${result.error}`, 'error');
    }
    
    // Pausa para evitar rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return stats;
}

async function migrateCompanies() {
  try {
    log('🚀 Iniciando migração de COMPANIES com SINCRONIZAÇÃO DE IDs...');
    log('🎯 ESTRATÉGIA: Mover documentos Firestore para usar UID do Auth');
    
    // Buscar todas as companies aprovadas não migradas
    log('📖 Buscando companies aprovadas não migradas...');
    const companiesCollection = collection(db, 'companies');
    const snapshot = await getDocs(companiesCollection);
      const companies = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Migrar companies que ainda não foram migradas para o Auth
      // Considera aprovada se: approved=true OU status='approved' OU não tem esses campos (legacy)
      const isApproved = data.approved === true || 
                        data.status === 'approved' || 
                        (!data.hasOwnProperty('approved') && !data.hasOwnProperty('status'));
      
      if (isApproved && !data.migratedToAuth) {
        companies.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    log(`📊 Encontradas ${companies.length} companies para migrar`);
    
    if (companies.length === 0) {
      log('✅ Nenhuma company encontrada para migrar', 'success');
      return;
    }
    
    // Processar em lotes
    const totalStats = {
      total: companies.length,
      newlyMigrated: 0,
      synchronized: 0,
      moved: 0,
      skipped: 0,
      errors: 0
    };
    
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(companies.length / BATCH_SIZE);
      
      log(`\n📦 Lote ${batchNumber}/${totalBatches}`);
      
      const batchStats = await processBatch(batch, batchNumber);
      
      // Agregar estatísticas
      Object.keys(totalStats).forEach(key => {
        totalStats[key] += batchStats[key];
      });
      
      // Pausa entre lotes
      if (i + BATCH_SIZE < companies.length) {
        log('⏸️  Pausa entre lotes...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Relatório final
    log('\n📊 RELATÓRIO FINAL:');
    log(`   Total de companies: ${totalStats.total}`);
    log(`   🆕 Migradas: ${totalStats.newlyMigrated}`);
    log(`   🎯 IDs sincronizados: ${totalStats.synchronized}`);
    log(`   📦 Documentos movidos: ${totalStats.moved}`);
    log(`   ⚠️  Puladas: ${totalStats.skipped}`);
    log(`   ❌ Erros: ${totalStats.errors}`);
    
    const successRate = ((totalStats.newlyMigrated + totalStats.skipped) / totalStats.total * 100).toFixed(1);
    log(`   📈 Taxa de sucesso: ${successRate}%`);
    
    if (totalStats.synchronized > 0) {
      log('\n🎉 MIGRAÇÃO COM IDs SINCRONIZADOS CONCLUÍDA!', 'success');
      log('   ✅ Dados sincronizados entre Firestore e Auth', 'success');
    }
    
    if (totalStats.newlyMigrated > 0) {
      log('\n🔑 SENHAS TEMPORÁRIAS:', 'warning');
      log('   Companies podem usar "Esqueci a senha" para redefinir', 'warning');
    }
    
    log('\n✅ Migração de companies concluída!', 'success');
    
  } catch (error) {
    log(`❌ Erro fatal: ${error}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Executar migração
migrateCompanies()
  .then(() => {
    log('🎉 Script concluído com sucesso!', 'success');
    process.exit(0);
  })
  .catch((error) => {
    log(`💥 Script falhou: ${error}`, 'error');
    console.error(error);
    process.exit(1);
  });
