#!/bin/pwsh
# Script para fazer commit das mudanças do WalletButton

# Caminho para o diretório do projeto
$projectDir = "c:\Users\ventu\visual studio\gate33 newage"

# Navegar para o diretório do projeto
cd $projectDir

# Adicionar os arquivos modificados
git add components/WalletButton.tsx
git add components/WalletButtonExamples.tsx
git add components/CHANGELOG.md
git add components/README.md
git add config/paymentConfig.ts
git add services/web3Service.ts
git add pages/wallet-examples.tsx

# Commit das alterações
git commit -m "feat: adiciona suporte para Avalanche e Optimism no WalletButton

- Adiciona suporte para redes Avalanche e Optimism
- Melhora a configuração de cores e detalhes das redes
- Implementa exemplo de uso para Layer 2
- Resolve problemas na detecção de tipo para NetworkType
- Adiciona documentação para o componente"

# Push das alterações para o repositório remoto
# git push origin master

Write-Host "Commit realizado com sucesso! Para enviar as alterações para o repositório remoto, execute:"
Write-Host "git push origin master"
