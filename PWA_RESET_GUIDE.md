# Guia para Resetar PWA no Chrome

## Método 1: Limpeza Completa Chrome
1. Chrome → Configurações → Privacidade e segurança
2. Limpar dados de navegação → Avançado
3. Selecionar TUDO:
   - Histórico de navegação
   - Cookies e outros dados do site
   - Imagens e arquivos em cache
   - Senhas e outros dados de login
   - Dados de preenchimento automático
   - Configurações do site
4. Período: "Sempre"
5. Limpar dados

## Método 2: Site Settings específico
1. Chrome → chrome://settings/content/all
2. Procurar por "localhost:3000" ou seu domínio
3. Clicar e "Limpar e redefinir"

## Método 3: Chrome DevTools
1. F12 → Application → Storage
2. Clicar "Clear storage" → "Clear site data"
3. Application → Service Workers → "Unregister"
4. Application → Manifest → Verificar se não há erros

## Método 4: Chrome Flags (experimental)
1. Ir para chrome://flags
2. Procurar "desktop-pwas"
3. Resetar para padrão
4. Reiniciar Chrome

## Método 5: Reset Chrome Profile
1. Fechar Chrome completamente
2. Criar novo perfil do Chrome
3. Testar PWA no novo perfil

## Método 6: Força instalação via DevTools
1. F12 → Console
2. Executar: 
   ```javascript
   window.addEventListener('beforeinstallprompt', e => {
     e.preventDefault();
     e.prompt();
   });
   ```
