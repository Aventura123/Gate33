/**
 * Script para verificar produtos LinkedIn aprovados
 * Testa diferentes escopos para ver quais estão disponíveis
 */

const CLIENT_ID = "77u9qtiet3nmdh";
const REDIRECT_URI = "https://gate33.net/api/linkedin/callback";

// Lista de escopos para testar
const scopesToTest = [
    {
        name: "Profile básico",
        scope: "r_liteprofile",
        product: "Sign In with LinkedIn using OpenID Connect"
    },
    {
        name: "Email",
        scope: "r_emailaddress", 
        product: "Sign In with LinkedIn using OpenID Connect"
    },
    {
        name: "Compartilhamento pessoal",
        scope: "w_member_social",
        product: "Share on LinkedIn"
    },
    {
        name: "Leitura página empresa",
        scope: "r_organization_social",
        product: "Marketing Developer Platform"
    },
    {
        name: "Escrita página empresa", 
        scope: "w_organization_social",
        product: "Marketing Developer Platform"
    },
    {
        name: "Admin organização",
        scope: "rw_organization_admin",
        product: "Marketing Developer Platform"
    }
];

console.log("🔍 VERIFICAÇÃO DE PRODUTOS LINKEDIN APROVADOS");
console.log("=".repeat(60));
console.log(`Aplicação ID: ${CLIENT_ID}`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log("\n📋 STATUS DOS ESCOPOS:");
console.log("=".repeat(60));

scopesToTest.forEach((item, index) => {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: item.scope,
        state: `test_${index}_${Date.now()}`
    });
    
    const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    
    console.log(`\n${index + 1}. ${item.name}`);
    console.log(`   Escopo: ${item.scope}`);
    console.log(`   Produto necessário: ${item.product}`);
    console.log(`   URL de teste: ${url.substring(0, 100)}...`);
});

console.log("\n🚀 INSTRUÇÕES PARA TESTE:");
console.log("=".repeat(60));
console.log("1. Copie uma URL acima e cole no navegador");
console.log("2. Se der erro 'unauthorized_scope_error' = produto não aprovado");
console.log("3. Se funcionar = produto aprovado!");
console.log("4. Para empresa, você PRECISA do 'Marketing Developer Platform'");

console.log("\n📝 COMO SOLICITAR MARKETING DEVELOPER PLATFORM:");
console.log("=".repeat(60));
console.log("1. Acesse: https://www.linkedin.com/developers/apps/");
console.log("2. Selecione sua app (77u9qtiet3nmdh)");
console.log("3. Aba 'Products' → procure 'Marketing Developer Platform'");
console.log("4. Clique 'Request access' e preencha o formulário");
console.log("5. Justificativa sugerida:");
console.log("   'Necessário para automação de postagens em página de empresa");
console.log("   através de sistema de gerenciamento de conteúdo integrado'");

console.log("\n⏰ TEMPO DE APROVAÇÃO:");
console.log("=".repeat(60));
console.log("• Sign In with LinkedIn: Imediato");
console.log("• Share on LinkedIn: Imediato");  
console.log("• Marketing Developer Platform: 1-7 dias úteis");
