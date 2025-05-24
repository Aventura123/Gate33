/**
 * Este script testa se o token do LinkedIn está funcionando
 * fazendo uma chamada para a API v2/me do LinkedIn
 */

const axios = require('axios');
const admin = require('firebase-admin');

// Inicializa o Firebase Admin SDK
try {
  admin.initializeApp();
} catch (e) {
  // App já inicializado
}

async function testLinkedInToken() {
  try {
    console.log("Buscando token do LinkedIn no Firestore...");
    const db = admin.firestore();
    const linkedinConfig = await db.collection('config').doc('linkedin').get();
    
    if (!linkedinConfig.exists) {
      console.error("❌ Configuração do LinkedIn não encontrada no Firestore!");
      return;
    }
    
    const { access_token, created_at, expires_in } = linkedinConfig.data();
    
    // Verificar se o token ainda é válido
    const createdDate = new Date(created_at);
    const expiryDate = new Date(createdDate.getTime() + (expires_in * 1000));
    const now = new Date();
    
    if (now > expiryDate) {
      console.error("❌ O token do LinkedIn expirou em", expiryDate.toLocaleString());
      console.log("Por favor gere um novo token usando o script generate-linkedin-auth-url.js");
      return;
    }
    
    console.log("Token encontrado, expira em:", expiryDate.toLocaleString());
    console.log("Testando o token do LinkedIn com a API v2/me...");

    // Fazer uma chamada para a API do LinkedIn para testar
    try {
      const response = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      
      console.log("✅ Token válido! Informações do usuário:");
      console.log("ID:", response.data.id);
      console.log("Nome:", response.data.localizedFirstName, response.data.localizedLastName);
      
      // Testar permissões de compartilhamento
      console.log("\nVerificando permissões de compartilhamento...");
      try {
        const testPayload = {
          author: `urn:li:person:${response.data.id}`,
          lifecycleState: "DRAFT", // Apenas rascunho para teste
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: "Este é um teste de permissão (não será publicado)."
              },
              shareMediaCategory: "NONE"
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS'
          }
        };
        
        await axios.post('https://api.linkedin.com/v2/ugcPosts', testPayload, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          }
        });
        
        console.log("✅ Permissões de compartilhamento OK!");
      } catch (error) {
        console.error("❌ Erro ao testar permissões de compartilhamento:");
        if (error.response && error.response.data) {
          console.error(error.response.data);
        } else {
          console.error(error.message);
        }
        console.log("\nO token pode não ter as permissões adequadas (w_member_social).");
      }
      
    } catch (error) {
      console.error("❌ Token inválido ou erro na API:");
      if (error.response && error.response.data) {
        console.error(error.response.data);
      } else {
        console.error(error.message);
      }
    }
    
  } catch (error) {
    console.error("Erro geral:", error);
  }
}

testLinkedInToken()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
