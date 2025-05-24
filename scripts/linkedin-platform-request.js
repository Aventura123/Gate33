/**
 * Script para gerar formulário de solicitação do Marketing Developer Platform
 */

const CLIENT_ID = "77u9qtiet3nmdh";
const APP_NAME = "Gate33 Social Media Manager";
const COMPANY_NAME = "Gate33";

console.log("📝 SOLICITAÇÃO MARKETING DEVELOPER PLATFORM");
console.log("=".repeat(60));

console.log(`\n🏢 INFORMAÇÕES DA APLICAÇÃO:`);
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Nome da App: ${APP_NAME}`);
console.log(`Empresa: ${COMPANY_NAME}`);
console.log(`Website: https://gate33.net`);

console.log(`\n📋 PRODUTOS QUE VOCÊ PRECISA SOLICITAR:`);
console.log("1. Marketing Developer Platform");
console.log("2. Community Management API");
console.log("3. Posts API");

console.log(`\n📝 TEXTO PARA JUSTIFICATIVA (copie e cole):`);
console.log("=".repeat(60));
console.log(`
Solicito acesso aos produtos de Marketing Developer Platform para a aplicação ${CLIENT_ID}.

OBJETIVO:
Desenvolver sistema integrado de gerenciamento de conteúdo para postagens automatizadas em páginas de empresa do LinkedIn.

USO ESPECÍFICO:
- Publicação automática de conteúdo em páginas de empresa
- Gerenciamento de posts através de sistema web integrado
- Automatização de workflow de publicação para clientes empresariais

JUSTIFICATIVA TÉCNICA:
Necessitamos dos escopos r_organization_social e w_organization_social para:
1. Ler posts existentes da página de empresa
2. Criar novos posts na página de empresa
3. Gerenciar conteúdo de forma programática

GARANTIAS:
- Cumprimento de todas as políticas do LinkedIn
- Uso responsável da API conforme termos de serviço
- Implementação de boas práticas de segurança

Website da aplicação: https://gate33.net
Contato: [seu_email_aqui]
`);

console.log(`\n🔗 LINKS ÚTEIS:`);
console.log("=".repeat(60));
console.log("1. LinkedIn Developer Portal: https://www.linkedin.com/developers/apps/");
console.log("2. Sua aplicação: https://www.linkedin.com/developers/apps/" + CLIENT_ID);
console.log("3. Suporte LinkedIn: https://linkedin.zendesk.com/hc/en-us");
console.log("4. Documentação: https://docs.microsoft.com/en-us/linkedin/marketing/");

console.log(`\n🚀 PASSOS ALTERNATIVOS:`);
console.log("=".repeat(60));
console.log("Se não encontrar 'Marketing Developer Platform' na aba Products:");
console.log("1. Procure por 'Advertising API'");
console.log("2. Procure por 'Community Management'");
console.log("3. Procure por 'Posts API'");
console.log("4. Entre em contato direto com suporte LinkedIn");
console.log("5. Use o formulário de contato em linkedin.zendesk.com");

console.log(`\n📞 CONTATO DIRETO LINKEDIN:`);
console.log("=".repeat(60));
console.log("Email: api-support@linkedin.com");
console.log("Portal: https://linkedin.zendesk.com/hc/en-us");
console.log("Assunto: 'Request Marketing Developer Platform Access - App ID: " + CLIENT_ID + "'");

console.log(`\n✅ PRÓXIMOS PASSOS:`);
console.log("=".repeat(60));
console.log("1. Acesse sua aplicação no LinkedIn Developer Portal");
console.log("2. Verifique quais produtos estão disponíveis na aba 'Products'");
console.log("3. Se não encontrar os produtos necessários, use o suporte direto");
console.log("4. Envie a justificativa acima ao suporte LinkedIn");
console.log("5. Aguarde resposta (1-7 dias úteis)");
