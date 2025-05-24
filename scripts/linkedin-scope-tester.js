/**
 * Script para verificar os produtos disponíveis na aplicação LinkedIn
 * e gerar URLs com diferentes combinações de scopes
 */

const CLIENT_ID = "77u9qtiet3nmdh";
const REDIRECT_URI = "https://gate33.net/api/linkedin/callback";

// Diferentes combinações de scopes para testar
const scopeOptions = [
  {
    name: "Sign In with LinkedIn",
    scopes: "r_liteprofile r_emailaddress",
    description: "Apenas login básico"
  },
  {
    name: "Share on LinkedIn", 
    scopes: "w_member_social",
    description: "Apenas compartilhamento"
  },
  {
    name: "Marketing Developer Platform",
    scopes: "r_organization_social w_organization_social r_basicprofile",
    description: "Para páginas de empresa"
  },
  {
    name: "Consumer Solutions Platform",
    scopes: "r_liteprofile w_member_social",
    description: "Perfil + compartilhamento (recomendado)"
  }
];

console.log("🔍 LinkedIn OAuth - Diferentes opções de produtos/scopes\n");
console.log("Cada URL abaixo testa diferentes produtos da aplicação LinkedIn:\n");

scopeOptions.forEach((option, index) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: option.scopes,
    state: `test_${index + 1}_${Date.now()}`
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  
  console.log(`${index + 1}. ${option.name}`);
  console.log(`   Descrição: ${option.description}`);
  console.log(`   Scopes: ${option.scopes}`);
  console.log(`   URL: ${authUrl}\n`);
});

console.log("📋 INSTRUÇÕES:");
console.log("1. Teste cada URL na ordem para ver qual funciona");
console.log("2. Se nenhuma funcionar, verifique os produtos habilitados na aplicação LinkedIn");
console.log("3. Acesse: https://www.linkedin.com/developers/apps/");
console.log("4. Selecione sua aplicação e vá em 'Products'");
console.log("5. Adicione os produtos necessários:\n");

console.log("   📌 PRODUTOS NECESSÁRIOS:");
console.log("   - Sign In with LinkedIn (para r_liteprofile, r_emailaddress)");
console.log("   - Share on LinkedIn (para w_member_social)");
console.log("   - Marketing Developer Platform (para organizações)");
console.log("\n6. Após adicionar os produtos, aguarde aprovação e teste novamente.");
