#!/bin/bash
# Script de deploy para migração do serviço de monitoramento para o servidor Ocian
# Uso: ./deploy.sh ou bash deploy.sh

echo "🚀 Iniciando migração do Gate33 Monitoring Service para Ocian..."

# Configurações do servidor
SERVER_IP="159.65.92.60"
SERVER_USER="root"
SERVICE_NAME="gate33-monitoring"
DEPLOY_PATH="/opt/gate33-monitoring"

# Verificar se existe conexão SSH
echo "📡 Testando conexão SSH com o servidor..."
if ! ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "echo 'Conexão OK'"; then
    echo "❌ Erro: Não foi possível conectar ao servidor $SERVER_IP"
    exit 1
fi

echo "✅ Conexão SSH estabelecida"

# Criar estrutura no servidor
echo "📁 Criando estrutura de diretórios no servidor..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $DEPLOY_PATH"

# Transferir arquivos essenciais
echo "📦 Transferindo arquivos..."
scp package.json $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
scp index.js $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
scp contracts.js $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
scp balances.js $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/

# Transferir .env do projeto principal
echo "🔧 Transferindo configurações do ambiente..."
scp ../.env $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/

# Instalar dependências e configurar serviço
echo "⚙️ Instalando dependências no servidor..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/gate33-monitoring

# Instalar Node.js se não estiver instalado
if ! command -v node &> /dev/null; then
    echo "📥 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

# Instalar PM2 se não estiver instalado
if ! command -v pm2 &> /dev/null; then
    echo "📥 Instalando PM2..."
    npm install -g pm2
fi

# Instalar dependências do projeto
echo "📦 Instalando dependências..."
npm install

# Parar serviço se já estiver rodando
pm2 delete gate33-monitoring 2>/dev/null || true

# Iniciar serviço
echo "🚀 Iniciando serviço..."
pm2 start index.js --name "gate33-monitoring"

# Configurar para iniciar automaticamente
pm2 startup systemd
pm2 save

echo "✅ Serviço iniciado com sucesso!"
pm2 status
EOF

echo "🎉 Migração concluída!"
echo "📊 Para verificar o status: ssh $SERVER_USER@$SERVER_IP 'pm2 status'"
echo "📋 Para ver logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs gate33-monitoring'"
