/**
 * Guia completo para configurar LinkedIn OAuth com permissões adequadas
 * 
 * PROBLEMA ATUAL:
 * - Temos token com w_member_social mas não conseguimos postar
 * - Precisamos de r_liteprofile para obter ID do usuário
 * - Aplicação LinkedIn precisa ter produtos corretos habilitados
 */

console.log("📋 GUIA: Como criar token LinkedIn com autorização completa\n");

console.log("🔧 PASSO 1: Configurar aplicação LinkedIn");
console.log("=========================================");
console.log("1. Acesse: https://www.linkedin.com/developers/apps/");
console.log("2. Selecione sua aplicação (ID: 77u9qtiet3nmdh)");
console.log("3. Vá na aba 'Products'");
console.log("4. Adicione estes produtos:");
console.log("   ✅ Sign In with LinkedIn");
console.log("   ✅ Share on LinkedIn");
console.log("5. Aguarde aprovação (pode levar horas)\n");

console.log("🔧 PASSO 2: Verificar configurações da aplicação");
console.log("===============================================");
console.log("1. Na aba 'Auth' da aplicação:");
console.log("2. Verificar Redirect URLs:");
console.log("   ✅ https://gate33.net/api/linkedin/callback");
console.log("3. Verificar escopos disponíveis:");
console.log("   ✅ r_liteprofile (Sign In with LinkedIn)");
console.log("   ✅ w_member_social (Share on LinkedIn)\n");

const CLIENT_ID = "77u9qtiet3nmdh";
const REDIRECT_URI = "https://gate33.net/api/linkedin/callback";

console.log("🔧 PASSO 3: URLs de teste por etapas");
console.log("====================================");

// Teste 1: Apenas login básico
const params1 = new URLSearchParams({
  response_type: "code",
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: "r_liteprofile",
  state: "test_profile_" + Date.now()
});

console.log("3A. Teste apenas perfil (r_liteprofile):");
console.log(`https://www.linkedin.com/oauth/v2/authorization?${params1.toString()}\n`);

// Teste 2: Apenas compartilhamento
const params2 = new URLSearchParams({
  response_type: "code",
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: "w_member_social",
  state: "test_share_" + Date.now()
});

console.log("3B. Teste apenas compartilhamento (w_member_social):");
console.log(`https://www.linkedin.com/oauth/v2/authorization?${params2.toString()}\n`);

// Teste 3: Ambos os escopos
const params3 = new URLSearchParams({
  response_type: "code",
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: "r_liteprofile w_member_social",
  state: "test_both_" + Date.now()
});

console.log("3C. Teste completo (r_liteprofile w_member_social):");
console.log(`https://www.linkedin.com/oauth/v2/authorization?${params3.toString()}\n`);

console.log("🔧 PASSO 4: Processo de teste");
console.log("=============================");
console.log("1. Teste PRIMEIRO a URL 3A (apenas perfil)");
console.log("2. Se funcionar, teste a URL 3B (apenas compartilhamento)");
console.log("3. Se ambas funcionarem, teste a URL 3C (ambos escopos)");
console.log("4. Use o token da URL 3C para postar no LinkedIn\n");

console.log("🔧 PASSO 5: Se os testes falharem");
console.log("==================================");
console.log("❌ Se URL 3A falhar:");
console.log("   - Produto 'Sign In with LinkedIn' não está aprovado");
console.log("   - Aguarde aprovação ou solicite novamente");
console.log("");
console.log("❌ Se URL 3B falhar:");
console.log("   - Produto 'Share on LinkedIn' não está aprovado");
console.log("   - Aguarde aprovação ou solicite novamente");
console.log("");
console.log("❌ Se URL 3C falhar:");
console.log("   - Um dos produtos não está aprovado");
console.log("   - Teste URLs individuais primeiro\n");

console.log("🎯 SOLUÇÃO TEMPORÁRIA");
console.log("=====================");
console.log("Se não conseguir r_liteprofile, podemos:");
console.log("1. Usar um Person URN fixo (hardcoded)");
console.log("2. Configurar manualmente o ID do usuário");
console.log("3. Postar apenas com w_member_social\n");

console.log("📝 PRÓXIMOS PASSOS:");
console.log("1. Verifique os produtos na aplicação LinkedIn");
console.log("2. Teste as URLs na ordem sugerida");
console.log("3. Compartilhe os resultados para continuarmos");
