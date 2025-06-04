# Gate33 Monitoring Service - Ocian Migration Guide

Este documento detalha o processo de migração do serviço de monitoramento Gate33 para o servidor Ocian (DigitalOcean Droplet).

## Visão Geral

O serviço de monitoramento é responsável por:
- Monitorar contratos Learn2Earn e InstantJobsEscrow em várias redes blockchain
- Verificar os saldos das carteiras de serviço
- Registrar eventos importantes no Firestore
- Atualizar o status para ser exibido no painel admin

## Processo de Migração

### Pré-requisitos
- Acesso SSH ao servidor Ocian (DigitalOcean Droplet)
- Node.js v16+ instalado no servidor
- Git instalado no servidor
- Credenciais do Firebase para o projeto Gate33

### Arquivos de Migração

Os seguintes arquivos foram criados para a migração:
- `monitoring-service/index.js`: Ponto de entrada do serviço
- `monitoring-service/contracts.js`: Código para monitoramento de contratos
- `monitoring-service/balances.js`: Código para monitoramento de saldos
- `monitoring-service/package.json`: Dependências do projeto
- `monitoring-service/.env.example`: Exemplo de arquivo de configuração

### Etapas da Migração

1. **Preparar o Servidor Ocian**
   ```bash
   # Conectar via SSH
   ssh root@159.65.92.60
   
   # Instalar Node.js v16
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Instalar PM2 para gerenciamento de processos
   npm install -g pm2
   ```

2. **Clonar o Repositório**
   ```bash
   # Criar diretório para o projeto
   mkdir -p /opt/gate33
   cd /opt/gate33
   
   # Clonar apenas os arquivos necessários (ou fazer upload manual)
   git clone https://github.com/seu-usuario/gate33.git .
   # OU use SCP para transferir os arquivos
   ```

3. **Configurar o Ambiente**
   ```bash
   # Copiar exemplo de .env
   cd monitoring-service
   cp .env.example .env
   
   # Editar o arquivo .env com as configurações corretas
   nano .env
   
   # Instalar as dependências
   npm install
   ```

4. **Iniciar o Serviço**
   ```bash
   # Iniciar com PM2
   pm2 start index.js --name "gate33-monitoring"
   
   # Configurar para iniciar automaticamente após reboot
   pm2 startup
   pm2 save
   ```

5. **Verificar Logs e Status**
   ```bash
   # Ver logs em tempo real
   pm2 logs gate33-monitoring
   
   # Ver status do serviço
   pm2 status
   ```

### Verificando a Integração

Após a migração, o frontend continuará se comunicando com o serviço através do Firestore. O painel de administração deve mostrar o status correto do monitoramento sem modificações adicionais.

## Estrutura de Dados no Firestore

O serviço utiliza a seguinte estrutura no Firestore:
```
/monitoring/status                    # Status geral do monitoramento
/monitoring/contracts/{contractId}    # Status de cada contrato monitorado  
/monitoring/balances                  # Saldos das carteiras de serviço
```

## Resolução de Problemas

Se ocorrerem problemas durante ou após a migração:

1. Verifique os logs:
   ```bash
   pm2 logs gate33-monitoring
   ```

2. Reinicie o serviço:
   ```bash
   pm2 restart gate33-monitoring
   ```

3. Verifique se as credenciais do Firebase estão corretas
4. Confirme que as variáveis de ambiente estão configuradas corretamente
5. Verifique se o firewall permite conexões WebSocket para as redes blockchain
