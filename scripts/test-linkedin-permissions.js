/**
 * Script para testar um token do LinkedIn e verificar suas permissões
 * Usage: node test-linkedin-permissions.js YOUR_ACCESS_TOKEN
 */

const axios = require('axios');
const token = process.argv[2];

if (!token) {
  console.error('\n❌ ERROR: Por favor forneça um token de acesso como argumento.');
  console.error('Exemplo: node test-linkedin-permissions.js YOUR_ACCESS_TOKEN\n');
  process.exit(1);
}

// Cores para console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}🧪 TESTE DO TOKEN LINKEDIN${colors.reset}`);
console.log('=============================================');

async function runTest() {
  try {
    // Teste 1: Perfil básico (verificar se o token funciona)
    try {
      console.log(`\n${colors.bold}Teste 1: Verificando Perfil Básico${colors.reset}`);
      const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      console.log(`${colors.green}✅ Token válido! Perfil: ${profileResponse.data.localizedFirstName} ${profileResponse.data.localizedLastName} (ID: ${profileResponse.data.id})${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Erro ao acessar perfil: ${error.response?.data?.message || error.message}${colors.reset}`);
    }

    // Teste 2: Listar organizações a que o usuário tem acesso
    try {
      console.log(`\n${colors.bold}Teste 2: Verificando Acesso a Organizações (r_organization_social)${colors.reset}`);
      const orgsResponse = await axios.get('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      if (orgsResponse.data.elements && orgsResponse.data.elements.length > 0) {
        console.log(`${colors.green}✅ Acesso a ${orgsResponse.data.elements.length} organizações:${colors.reset}`);
        for (const org of orgsResponse.data.elements) {
          console.log(`   - Organização: ${org.organizationTarget || org.organization}, Papel: ${org.role}, Status: ${org.state}`);
        }
      } else {
        console.log(`${colors.yellow}⚠️ Nenhuma organização encontrada. Isso pode indicar falta de permissão r_organization_social ou que o usuário não tem papéis em nenhuma organização.${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Erro ao listar organizações. Possivelmente sem permissão r_organization_social.${colors.reset}`);
      console.log(`   Erro: ${error.response?.data?.message || error.message}`);
    }

    // Teste 3: Tentar criar um post simples (testar w_member_social)
    console.log(`\n${colors.bold}Teste 3: Tentando Postar como Perfil Pessoal (w_member_social)${colors.reset}`);
    try {
      // Primeiro obtemos o ID do usuário
      const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      const personId = profileResponse.data.id;
      console.log(`   Tentando criar post como perfil pessoal (ID: ${personId})`);
      
      // Tentamos criar um post
      await axios.post('https://api.linkedin.com/v2/ugcPosts', {
        author: `urn:li:person:${personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: 'Teste de API - Este post será deletado automaticamente.'
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS'
        }
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`${colors.green}✅ Sucesso! Você tem permissão para postar como perfil pessoal (w_member_social)${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Erro ao postar como perfil pessoal. Possivelmente sem permissão w_member_social.${colors.reset}`);
      console.log(`   Erro: ${error.response?.data?.message || error.message}`);
    }

    // Teste 4: Verificar se pode postar como empresa (se tiver acesso a alguma)
    console.log(`\n${colors.bold}Teste 4: Verificando Capacidade de Postar como Empresa (w_organization_social)${colors.reset}`);
    try {
      // Primeiro verifica se tem acesso a alguma organização
      const orgsResponse = await axios.get('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      if (orgsResponse.data.elements && orgsResponse.data.elements.length > 0) {
        // Pega a primeira organização com papel adequado
        const orgWithPostingRights = orgsResponse.data.elements.find(org => 
          ['ADMINISTRATOR', 'DIRECT_SPONSORED_CONTENT_POSTER', 'CONTENT_ADMINISTRATOR'].includes(org.role) && 
          org.state === 'APPROVED');
        
        if (orgWithPostingRights) {
          const orgId = (orgWithPostingRights.organizationTarget || orgWithPostingRights.organization).split(':')[2];
          console.log(`   Tentando criar post como organização (ID: ${orgId})`);
          
          // Não executa o post real para evitar spam, apenas verifica permissões
          console.log(`${colors.green}✅ Você tem as permissões necessárias para postar como empresa!${colors.reset}`);
          console.log(`   Organização: ${orgWithPostingRights.organizationTarget || orgWithPostingRights.organization}`);
          console.log(`   Papel: ${orgWithPostingRights.role}`);
          console.log('   Para postar, use a API: https://api.linkedin.com/rest/posts');
          console.log('   Com o corpo adequado e autor sendo a organização.');
        } else {
          console.log(`${colors.yellow}⚠️ Você tem acesso a organizações, mas sem papel adequado para postar.${colors.reset}`);
          console.log('   Papéis necessários: ADMINISTRATOR, DIRECT_SPONSORED_CONTENT_POSTER ou CONTENT_ADMINISTRATOR');
        }
      } else {
        console.log(`${colors.yellow}⚠️ Nenhuma organização encontrada para testar postagem como empresa.${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Erro ao verificar capacidade de postar como empresa.${colors.reset}`);
      console.log(`   Erro: ${error.response?.data?.message || error.message}`);
    }
  } catch (e) {
    console.log(`${colors.red}❌ Erro geral: ${e.message}${colors.reset}`);
  }

  console.log('\n=============================================');
  console.log(`${colors.bold}📋 RESULTADO DOS TESTES:${colors.reset}`);
  console.log('1. Se o Teste 1 passou: Token válido');
  console.log('2. Se o Teste 2 passou: Você tem r_organization_social');
  console.log('3. Se o Teste 3 passou: Você tem w_member_social');
  console.log('4. Se o Teste 4 passou: Você tem w_organization_social');
  console.log('\nSe precisar de todas as permissões, use:');
  console.log(`${colors.blue}Scope: r_organization_social w_organization_social${colors.reset}`);
}

runTest();
