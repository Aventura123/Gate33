/**
 * Este script atualiza a variável de ambiente LINKEDIN_ACCESS_TOKEN no Firebase Functions
 * usando o token armazenado no Firestore.
 * 
 * Nota: Para executar este script, você deve ter as permissões necessárias e estar 
 * autenticado no Firebase CLI (firebase login).
 */

const admin = require('firebase-admin');
const { execSync } = require('child_process');

// Inicializa o Firebase Admin SDK
try {
  admin.initializeApp();
} catch (e) {
  // App já inicializado
}

async function updateLinkedInEnv() {
  try {
    console.log("Buscando token do LinkedIn no Firestore...");
    const db = admin.firestore();
    const linkedinConfig = await db.collection('config').doc('linkedin').get();
    
    if (!linkedinConfig.exists) {
      console.error("Configuração do LinkedIn não encontrada no Firestore!");
      return;
    }
    
    const { access_token, created_at, expires_in } = linkedinConfig.data();
    
    // Verificar se o token ainda é válido
    const createdDate = new Date(created_at);
    const expiryDate = new Date(createdDate.getTime() + (expires_in * 1000));
    const now = new Date();
    
    if (now > expiryDate) {
      console.error("O token do LinkedIn expirou em", expiryDate.toLocaleString());
      console.log("Por favor gere um novo token usando o script generate-linkedin-auth-url.js");
      return;
    }
    
    console.log("Token válido encontrado, expira em:", expiryDate.toLocaleString());
    
    // Atualizar a variável de ambiente no Firebase Functions
    console.log("Atualizando variável de ambiente no Firebase Functions...");
    
    try {
      execSync(`firebase functions:config:set linkedin.access_token="${access_token}"`, { stdio: 'inherit' });
      console.log("Variável de ambiente atualizada com sucesso!");
      
      // Agora vamos fazer deploy das funções para aplicar a mudança
      console.log("Fazendo deploy das funções para aplicar a mudança...");
      execSync(`firebase deploy --only functions`, { stdio: 'inherit' });
      
      console.log("✅ Tudo pronto! O token do LinkedIn está configurado e as funções foram atualizadas.");
    } catch (error) {
      console.error("Erro ao atualizar variáveis de ambiente:", error);
    }
    
  } catch (error) {
    console.error("Erro:", error);
  }
}

updateLinkedInEnv()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
