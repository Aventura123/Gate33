# Script de migração para o servidor Ocian
# Executa: .\migrate.ps1

Write-Host "Migrando Gate33 Monitoring Service para Ocian..." -ForegroundColor Green

$server = "root@159.65.92.60"
$deployPath = "/opt/gate33-monitoring"

# Transferir arquivos
Write-Host "Transferindo arquivos..." -ForegroundColor Yellow
scp package.json "${server}:${deployPath}/"
scp index.js "${server}:${deployPath}/"
scp contracts.js "${server}:${deployPath}/"
scp balances.js "${server}:${deployPath}/"
scp ..\.env "${server}:${deployPath}/"

# Setup completo no servidor
Write-Host "Configurando servidor..." -ForegroundColor Yellow
$setupScript = @"
mkdir -p $deployPath
cd $deployPath

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Instalar PM2
npm install -g pm2

# Instalar dependencias
npm install

# Parar servico se existir
pm2 delete gate33-monitoring 2>/dev/null; true

# Iniciar servico
pm2 start index.js --name gate33-monitoring

# Auto-start
pm2 startup
pm2 save

pm2 status
"@

ssh $server $setupScript

Write-Host "Migração concluida!" -ForegroundColor Green
Write-Host "Verificar status: ssh $server 'pm2 status'" -ForegroundColor Cyan
Write-Host "Ver logs: ssh $server 'pm2 logs gate33-monitoring'" -ForegroundColor Cyan
