console.log("🔍 LinkedIn OAuth - Teste de Scopes");
console.log("====================================");

const CLIENT_ID = "77u9qtiet3nmdh";
const REDIRECT_URI = "https://gate33.net/api/linkedin/callback";

// Teste apenas com w_member_social
const params1 = new URLSearchParams({
  response_type: "code",
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: "w_member_social",
  state: "test1"
});

console.log("1. Apenas w_member_social:");
console.log(`https://www.linkedin.com/oauth/v2/authorization?${params1.toString()}`);
console.log("");

// Teste com r_liteprofile
const params2 = new URLSearchParams({
  response_type: "code",
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: "r_liteprofile",
  state: "test2"
});

console.log("2. Apenas r_liteprofile:");
console.log(`https://www.linkedin.com/oauth/v2/authorization?${params2.toString()}`);
console.log("");

console.log("IMPORTANTE:");
console.log("- Acesse https://www.linkedin.com/developers/apps/");
console.log("- Selecione sua aplicação");
console.log("- Vá em 'Products' e adicione 'Share on LinkedIn'");
console.log("- Aguarde aprovação para usar w_member_social");
