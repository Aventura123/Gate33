/**
 * Script para descobrir seu Person URN do LinkedIn usando o token atual
 * Mesmo sem r_liteprofile, podemos tentar algumas APIs alternativas
 */

const axios = require('axios');

const ACCESS_TOKEN = "AQVEL7uyrzy1gqk8OHD4ZEH9aDLm3oW59o2djqcUtlHDVagI-eGQSt1Oipev-ykfQJrelhdU64fd7UELkO6YjXWYCrZJyuD3wYf9SJeRqT6x-LkS3qAplvCxfEfcmB6ui4Pmu0qbpgWW1cDPXKrJDlLmGC9UfPAuUZzohfEmmbweIb6Z_7GRVJOQRKeSX5ynxxFgn4gzwuDpXBRA_oui_Zv8a27qlT-jc1OHHRTvsx1lBSpkBWp0CCutx0_V-ajAmfEEg_EsEyBGoLRj_r3fath_QR2o03nTuFYGu85oFFO6tMtuw_Fuu0LytHwrG5qUQ1cpM6CSWD22bYnuLYLx-O6D3v1r5g";

async function testLinkedInPosting() {
  console.log("🚀 Testando posting no LinkedIn com w_member_social apenas...\n");
  
  try {
    // Vamos tentar fazer um post usando um Person URN genérico
    // O LinkedIn pode retornar o Person URN correto no erro
    const testURN = "urn:li:person:test"; // URN temporário para forçar erro útil
    
    const postData = {
      author: testURN,
      lifecycleState: "PUBLISHED", 
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: "🚀 Teste de integração Gate33 - LinkedIn API"
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    console.log("Tentando post de teste...");
    const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    console.log("✅ Post realizado com sucesso!");
    console.log("Response:", response.data);

  } catch (error) {
    console.log("❌ Erro esperado - vamos analisar para encontrar o Person URN:");
    
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Erro completo:", JSON.stringify(error.response.data, null, 2));
      
      // Procurar por Person URN nas mensagens de erro
      const errorText = JSON.stringify(error.response.data);
      const urnMatch = errorText.match(/urn:li:person:([a-zA-Z0-9_-]+)/);
      
      if (urnMatch) {
        console.log("\n🎉 Person URN encontrado:", urnMatch[0]);
        console.log("Use este URN no código:");
        console.log(`const PERSON_URN = "${urnMatch[0]}";`);
      }
    }
    
    // Teste alternativo: tentar descobrir Person URN através de outros endpoints
    console.log("\n🔍 Tentando descobrir Person URN através de outros métodos...");
    
    try {
      // Algumas vezes o token JWT contém informações
      const tokenParts = ACCESS_TOKEN.split('.');
      if (tokenParts.length > 1) {
        // Tentar decodificar (pode não funcionar, mas vale a pena tentar)
        console.log("Token analisado - procure por 'sub' ou 'user_id'");
      }
    } catch (e) {
      console.log("Não foi possível extrair info do token");
    }
  }
}

// Função alternativa: usar Person URN fixo conhecido
async function testWithFixedURN() {
  console.log("\n🔧 SOLUÇÃO ALTERNATIVA: Use um Person URN fixo");
  console.log("1. Vá para seu perfil LinkedIn");
  console.log("2. Copie o ID do perfil da URL (linkedin.com/in/[ID])");
  console.log("3. Use: urn:li:person:[ID]");
  console.log("\nExemplo de código para usar:");
  
  const exampleCode = `
// No arquivo socialMediaPromotionScheduler.ts, substitua:
const FIXED_PERSON_URN = "urn:li:person:SEU_ID_AQUI"; // Substitua pelo seu ID

// E use diretamente no post:
const postData = {
  author: FIXED_PERSON_URN,
  lifecycleState: "PUBLISHED",
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: { text: jobDescription },
      shareMediaCategory: "NONE"
    }
  },
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
};`;
  
  console.log(exampleCode);
}

testLinkedInPosting().then(() => {
  testWithFixedURN();
}).catch(error => {
  console.error("Erro fatal:", error.message);
  testWithFixedURN();
});
