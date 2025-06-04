#!/bin/bash
# Script de migração simplificado

echo "Migrando Gate33 Monitoring Service..."

SERVER="root@159.65.92.60"
DEPLOY_PATH="/opt/gate33-monitoring"

# Criar diretório
echo "1. Criando diretório no servidor..."
ssh $SERVER "mkdir -p $DEPLOY_PATH"

# Transferir arquivos
echo "2. Transferindo arquivos..."
scp package.json $SERVER:$DEPLOY_PATH/
scp index.js $SERVER:$DEPLOY_PATH/
scp contracts.js $SERVER:$DEPLOY_PATH/
scp balances.js $SERVER:$DEPLOY_PATH/
scp ../.env $SERVER:$DEPLOY_PATH/

# Setup servidor
echo "3. Configurando servidor..."
ssh $SERVER << 'EOF'
cd /opt/gate33-monitoring

# Instalar Node.js se necessário
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Instalar PM2 se necessário
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Instalar dependências
npm install

# Parar serviço existente
pm2 delete gate33-monitoring 2>/dev/null || true

# Iniciar serviço
pm2 start index.js --name gate33-monitoring

# Configurar auto-start
pm2 startup
pm2 save

# Mostrar status
pm2 status
EOF

echo "Migração concluída!"
echo "Verificar: ssh $SERVER 'pm2 logs gate33-monitoring'"
