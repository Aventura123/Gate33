/**
 * Teste específico para w_member_social - Apenas posting
 */

const axios = require('axios');

const ACCESS_TOKEN = "AQVEL7uyrzy1gqk8OHD4ZEH9aDLm3oW59o2djqcUtlHDVagI-eGQSt1Oipev-ykfQJrelhdU64fd7UELkO6YjXWYCrZJyuD3wYf9SJeRqT6x-LkS3qAplvCxfEfcmB6ui4Pmu0qbpgWW1cDPXKrJDlLmGC9UfPAuUZzohfEmmbweIb6Z_7GRVJOQRKeSX5ynxxFgn4gzwuDpXBRA_oui_Zv8a27qlT-jc1OHHRTvsx1lBSpkBWp0CCutx0_V-ajAmfEEg_EsEyBGoLRj_r3fath_QR2o03nTuFYGu85oFFO6tMtuw_Fuu0LytHwrG5qUQ1cpM6CSWD22bYnuLYLx-O6D3v1r5g";

async function testLinkedInPosting() {
  try {
    console.log("🔍 Testando posting no LinkedIn apenas com w_member_social...\n");

    // Como não temos acesso ao perfil, vamos usar um URN fixo ou tentar descobrir
    // Primeira tentativa: usar API para descobrir o person URN
    console.log("1. Tentando descobrir person URN...");
    
    // Para w_member_social, podemos usar o endpoint de userinfo do LinkedIn
    try {
      const userinfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        }
      });
      
      console.log("✅ Userinfo obtido com sucesso:");
      console.log(`   - Sub: ${userinfoResponse.data.sub}`);
      console.log(`   - Name: ${userinfoResponse.data.name}`);
      
      const personURN = `urn:li:person:${userinfoResponse.data.sub}`;
      console.log(`   - URN: ${personURN}\n`);
      
      await testPost(personURN);
      
    } catch (userinfoError) {
      console.log("❌ Userinfo não disponível, tentando com URN alternativo...");
      console.log(`   Erro: ${userinfoError.response?.data?.message || userinfoError.message}`);
      
      // Tentativa alternativa: usar um URN baseado no que sabemos
      console.log("\n2. Tentando post com estrutura alternativa...");
      await testPostAlternative();
    }

  } catch (error) {
    console.error("❌ Erro geral:", error.message);
  }
}

async function testPost(personURN) {
  console.log("2. Testando post com URN descoberto...");
  
  const postData = {
    author: personURN,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: "🚀 Teste de integração LinkedIn - Gate33 Platform #Gate33 #Blockchain"
        },
        shareMediaCategory: "NONE"
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  try {
    const postResponse = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    console.log("🎉 POST REALIZADO COM SUCESSO!");
    console.log(`   - Post ID: ${postResponse.data.id}`);
    console.log(`   - Status: ${postResponse.status}`);
    
  } catch (postError) {
    console.error("❌ Erro ao postar:");
    console.error(`   - Status: ${postError.response?.status}`);
    console.error(`   - Erro: ${JSON.stringify(postError.response?.data, null, 2)}`);
  }
}

async function testPostAlternative() {
  // Tentar com uma estrutura mais simples
  const simplePostData = {
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: "🚀 Teste Gate33 Platform - LinkedIn Integration"
        },
        shareMediaCategory: "NONE"
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  try {
    const postResponse = await axios.post('https://api.linkedin.com/v2/ugcPosts', simplePostData, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    console.log("🎉 POST ALTERNATIVO REALIZADO COM SUCESSO!");
    console.log(`   - Post ID: ${postResponse.data.id}`);
    console.log(`   - Status: ${postResponse.status}`);
    
  } catch (postError) {
    console.error("❌ Erro no post alternativo:");
    console.error(`   - Status: ${postError.response?.status}`);
    console.error(`   - Erro: ${JSON.stringify(postError.response?.data, null, 2)}`);
  }
}

testLinkedInPosting().catch(error => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
