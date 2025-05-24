/**
 * Este script gera uma URL de autenticação do LinkedIn para obter um access token
 * com as permissões necessárias para compartilhar conteúdo.
 */

const CLIENT_ID = "77u9qtiet3nmdh";
const REDIRECT_URI = "https://gate33.net/auth/linkedin/callback";
const SCOPE = "w_member_social"; // Permissão para compartilhar posts

// Gera a URL de autenticação
function generateAuthUrl() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state: Date.now().toString() // Um valor arbitrário para verificar o estado da requisição
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

const authUrl = generateAuthUrl();

console.log("======================================");
console.log("URL de Autenticação do LinkedIn:");
console.log("======================================");
console.log(authUrl);
console.log("\nCole essa URL no seu navegador para autenticar e obter o código de autorização.");
console.log("Você será redirecionado para a página de callback onde poderá ver e copiar o token de acesso.");
