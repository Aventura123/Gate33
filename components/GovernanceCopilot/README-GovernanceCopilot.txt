# Governance Copilot - Documentação

## O que é?
O Governance Copilot é um painel integrado à plataforma Gate33 que permite ao usuário acompanhar, votar e visualizar o histórico de propostas de governança de DAOs (Organizações Autônomas Descentralizadas), como Aave, Optimism, entre outras.

## Para que serve?
- Facilitar o acompanhamento de propostas de governança de diferentes DAOs em um só lugar.
- Permitir que o usuário vote diretamente nas propostas, utilizando sua carteira conectada.
- Exibir o histórico de votos do usuário, promovendo transparência e controle.
- Oferecer resumos automáticos de propostas usando IA (futuramente).

## Como está estruturado?
- **Dashboard:** Interface principal, com cabeçalho, lista de propostas ativas, botão de wallet e painel de histórico.
- **ProposalList:** Lista de propostas ativas, integrável com Snapshot/Tally.
- **VoteButton:** Permite votar em propostas (integração futura com contratos/Snapshot).
- **HistoryPanel:** Mostra o histórico de votos do usuário.
- **ProposalSummary:** Mostra resumo da proposta (futuramente via OpenAI).
- **Serviço de Governança:** Centralizado em `services/governanceService.ts`, responsável por buscar propostas, histórico e enviar votos.
- **Layout:** Usa o mesmo layout e cores do restante do projeto para integração visual.

## Login (Exemplo de fluxo)
- O login é feito via conexão de carteira Web3 (MetaMask, WalletConnect, etc).
- O usuário clica em "Conectar Wallet" e assina uma mensagem para autenticação.
- Não há senha tradicional: a posse da carteira garante a identidade.
- Permite login rápido, seguro e sem necessidade de cadastro tradicional.

## Exemplos práticos

### Exemplo prático de implementação de login (Web3)
1. O usuário clica em “Conectar Wallet”.
2. O app chama o método do provedor Web3 (ex: window.ethereum.request({ method: 'eth_requestAccounts' })).
3. O usuário aprova a conexão na carteira (MetaMask, WalletConnect, etc).
4. O app pode pedir para o usuário assinar uma mensagem (ex: “Login no Gate33 - {timestamp}”) para autenticação.
5. O backend (opcional) pode verificar a assinatura para garantir que o usuário é dono da carteira.
6. O endereço da carteira é salvo no estado global (contexto ou provider) e usado como identificação do usuário.

### Fluxos de monetização
- **Freemium:** Acesso básico gratuito, recursos premium (ex: resumos de IA, alertas, analytics) mediante assinatura mensal ou pagamento por uso.
- **Pay-per-use:** Cobrança por cada resumo de IA gerado, ou por cada alerta customizado criado.
- **Parcerias:** DAOs podem pagar para ter suas propostas em destaque ou para campanhas de engajamento.
- **Marketplace:** Venda de serviços para DAOs (consultoria, votação delegada, relatórios avançados).
- **Ads/Patrocínio:** Espaços para banners ou conteúdos patrocinados de projetos Web3.

### Estratégias para atingir o público alvo
- **Comunidade cripto/Web3:** Divulgar em fóruns, Discords, Telegrams e eventos de DAOs.
- **Parcerias com DAOs:** Oferecer integração fácil para DAOs listarem suas propostas e engajarem membros.
- **Conteúdo educativo:** Produzir tutoriais, vídeos e artigos sobre governança e uso do Copilot.
- **Gamificação:** Recompensar usuários ativos com badges, rankings ou até tokens.
- **Onboarding simplificado:** Foco em UX para facilitar o uso até para quem nunca votou em DAOs.

## Público alvo
- Usuários de criptoativos interessados em participar de DAOs.
- Delegados, holders de tokens de governança e entusiastas de Web3.
- Comunidade Gate33 que deseja centralizar sua experiência de governança.
- DAOs e projetos que queiram engajar sua comunidade de forma mais acessível.

## Monetização
- Possibilidades futuras:
  - Cobrança de taxa para uso de funcionalidades premium (ex: resumos de IA, alertas personalizados, analytics avançados).
  - Parcerias com DAOs para destaque de propostas ou campanhas patrocinadas.
  - Analytics e insights pagos para DAOs e projetos parceiros.
  - Venda de assinaturas para recursos exclusivos (ex: notificações push, relatórios de governança, integração multi-wallet).
  - Marketplace de serviços para DAOs (ex: consultoria, votação delegada, etc).

## O que falta para ficar 100% funcional?
- Integração real com APIs de governança (Snapshot, Tally, etc) para buscar propostas e enviar votos.
- Integração do botão de voto com assinatura/transação real via carteira conectada.
- Integração do ProposalSummary com OpenAI ou outro serviço de IA para resumos automáticos.
- Melhorias de UX: feedback visual de sucesso/erro, loading states, validações.
- Testes de usabilidade e segurança.
- Eventual integração de notificações e alertas personalizados.

---

**Responsável:** Gate33 Dev Team
**Última atualização:** 25/05/2025
