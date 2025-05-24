/**
 * Script para gerar URLs LinkedIn OAuth com diferentes scopes
 * IMPORTANTE: Sua aplicação deve ter os produtos habilitados primeiro!
 */

const CLIENT_ID = "77u9qtiet3nmdh";
const CLIENT_SECRET = "WPL_AP1.9FS2BXA5qW2rc7pI.76Uj3A==";
const REDIRECT_URI = "https://gate33.net/api/linkedin/callback";

// Função para gerar URL
function generateAuthUrl(scope, description) {
  // Criando URL com URLSearchParams para evitar problemas de codificação
  const params = new URLSearchParams();
  params.append("response_type", "code");
  params.append("client_id", CLIENT_ID);
  params.append("redirect_uri", REDIRECT_URI);
  params.append("scope", scope);
  params.append("state", Date.now().toString());
  
  const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  
  console.log(`\n${description}:`);
  console.log(`Scope: ${scope}`);
  console.log(`URL: ${url}`);
  
  return url;
}

console.log("🔧 PASSO 1: HABILITAR PRODUTOS NA APLICAÇÃO LINKEDIN");
console.log("================================================================");
console.log("1. Acesse: https://www.linkedin.com/developers/apps/");
console.log("2. Clique na sua aplicação (ID: 77u9qtiet3nmdh)");
console.log("3. Vá na aba 'Products'");
console.log("4. Adicione estes produtos:");
console.log("   ✅ Marketing Developer Platform (para postagem em página de empresa)");
console.log("   ✅ Share on LinkedIn (para w_member_social)");
console.log("5. Aguarde aprovação (pode levar algumas horas)");

console.log("\n🚀 PASSO 2: TESTAR URLs DE AUTENTICAÇÃO");
console.log("================================================================");

// Salvando todas as URLs para criar um HTML
const urls = [];

// URL 1: Apenas compartilhamento (perfil pessoal)
urls.push({
  description: "TESTE 1 - Compartilhamento como Perfil Pessoal",
  scope: "w_member_social",
  url: generateAuthUrl("w_member_social", "TESTE 1 - Compartilhamento como Perfil Pessoal")
});

// URL 2: Página de Empresa (Leitura)
urls.push({
  description: "TESTE 2 - Leitura da Página de Empresa",
  scope: "r_organization_social",
  url: generateAuthUrl("r_organization_social", "TESTE 2 - Leitura da Página de Empresa")
});

// URL 3: Página de Empresa (Escrita/Posting)
urls.push({
  description: "TESTE 3 - Postagem na Página de Empresa",
  scope: "w_organization_social",
  url: generateAuthUrl("w_organization_social", "TESTE 3 - Postagem na Página de Empresa")
});

// URL 4: COMPLETO para Página de Empresa (IDEAL)
urls.push({
  description: "TESTE 4 - EMPRESA (COMPLETO E IDEAL)",
  scope: "r_organization_social w_organization_social",
  url: generateAuthUrl("r_organization_social w_organization_social", "TESTE 4 - EMPRESA (COMPLETO E IDEAL)")
});

console.log("\n📋 INSTRUÇÕES:");
console.log("================================================================");
console.log("1. Se TESTE 1 funcionar → você pode postar como perfil pessoal");
console.log("2. Se TESTE 2 funcionar → você pode ler posts da página de empresa");
console.log("3. Se TESTE 3 funcionar → você pode postar na página de empresa");
console.log("4. Se TESTE 4 funcionar → PERFEITO! Use este token para a página de empresa");
console.log("5. Se nenhum funcionar → o produto 'Marketing Developer Platform' ainda não está ativo");
console.log("\n🔍 COMO TESTAR SEU TOKEN:");
console.log("================================================================");
console.log("1. Abra uma das URLs acima no navegador para obter um token");
console.log("2. Na página de callback, copie o valor de 'access_token'");
console.log("3. Teste o token com o comando:");
console.log("   node scripts/test-linkedin-permissions.js SEU_TOKEN_AQUI");

// URL 5: Todos os Escopos Empresariais (para casos específicos)
urls.push({
  description: "TESTE 5 - TODOS OS ESCOPOS EMPRESARIAIS",
  scope: "r_emailaddress r_liteprofile r_organization_social w_organization_social",
  url: generateAuthUrl("r_emailaddress r_liteprofile r_organization_social w_organization_social", "TESTE 5 - TODOS OS ESCOPOS EMPRESARIAIS")
});

// Gerar HTML com os links clicáveis
const fs = require('fs');
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>LinkedIn OAuth URLs</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2 {
            color: #0077b5;
        }
        .url-container {
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .url-link {
            display: inline-block;
            margin-top: 10px;
            padding: 10px 15px;
            background-color: #0077b5;
            color: white;
            text-decoration: none;
            border-radius: 4px;
        }
        .scope {
            background-color: #f3f6f8;
            padding: 5px 10px;
            border-radius: 4px;
            font-family: monospace;
        }
        .instructions {
            background-color: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #0077b5;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>LinkedIn OAuth URLs</h1>
    <div class="instructions">
        <h2>Instruções:</h2>
        <ol>
            <li>Verifique se a aplicação tem os produtos necessários habilitados no LinkedIn Developer Portal</li>
            <li>Clique em um dos botões abaixo para iniciar o fluxo de autorização</li>
            <li>Na página de callback, copie o valor de access_token</li>
            <li>Teste o token com: <code>node scripts/test-linkedin-permissions.js SEU_TOKEN_AQUI</code></li>
        </ol>
    </div>
    
    ${urls.map(item => `
    <div class="url-container">
        <h3>${item.description}</h3>
        <p>Escopo: <span class="scope">${item.scope}</span></p>
        <a href="${item.url}" class="url-link" target="_blank">Autorizar no LinkedIn</a>
    </div>
    `).join('')}

    <div class="instructions">
        <h3>Resultados esperados:</h3>
        <ul>
            <li>TESTE 1 (w_member_social): permite postar como perfil pessoal</li>
            <li>TESTE 2 (r_organization_social): permite ler posts da página de empresa</li>
            <li>TESTE 3 (w_organization_social): permite postar na página de empresa</li>
            <li>TESTE 4 (r+w organization_social): ideal para página de empresa (leitura+escrita)</li>
            <li>TESTE 5 (todos os escopos): para casos específicos que precisam de profile</li>
        </ul>
        <p>Se nenhum funcionar, provavelmente o produto "Marketing Developer Platform" ainda não está ativo no LinkedIn Developer Portal.</p>
    </div>
</body>
</html>
`;

// Salvar o HTML
fs.writeFileSync('linkedin-auth-urls.html', htmlContent);
console.log("\n✅ Arquivo HTML com URLs clicáveis gerado: linkedin-auth-urls.html");
