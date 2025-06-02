# Microsserviço de Monitoramento

Este é um microsserviço Node.js dedicado para monitoramento de contratos e saldos do sistema Gate33.

## O que este serviço faz

- Executa o monitoramento contínuo dos contratos Learn2Earn e InstantJobsEscrow
- Verifica os saldos de tokens nativos nas carteiras de serviço
- Armazena os resultados no banco de dados para acesso do frontend
- Executa como um serviço tradicional (não serverless)

## Instalação e Execução

### Pré-requisitos
- Node.js v16+
- NPM ou Yarn

### Instalação
```bash
npm install
# ou
yarn install
```

### Configuração
Crie um arquivo `.env` com as seguintes variáveis:
```
FIRESTORE_CREDENTIALS=./credentials.json  # Arquivo de credenciais do Firebase
API_KEY=sua_chave_secreta_aqui            # Chave para proteger os endpoints
PORT=3001                                  # Porta do serviço (opcional, padrão: 3001)
MONITORING_INTERVAL=300000                # Intervalo entre verificações (em ms, padrão: 300000 = 5min)
CONDITIONAL_WRITES=true                   # Habilitar escritas condicionais para redução de custos
SERVICE_WALLET_ADDRESS=0xDdbC4f514019d835Dd9Ac6198fDa45c39512552C  # Endereço da carteira
```

### Estrutura de arquivos recomendada
```
monitoring-service/
├── src/
│   ├── index.ts               # Ponto de entrada do serviço
│   ├── config.ts              # Configurações e variáveis de ambiente
│   ├── db/
│   │   └── firestore.ts       # Conexão e helpers do Firestore
│   ├── api/
│   │   ├── routes.ts          # Definição de rotas da API
│   │   ├── controllers/
│   │   │   ├── status.ts      # Controlador para endpoint de status
│   │   │   └── monitoring.ts  # Controlador para endpoints de monitoramento
│   │   └── middleware/
│   │       └── auth.ts        # Middleware para autenticação da API
│   └── services/
│       ├── monitoring.ts      # Lógica central de monitoramento
│       ├── contracts.ts       # Monitoramento de contratos
│       └── balances.ts        # Verificação de saldos
└── package.json, tsconfig.json, etc.
```

### Iniciar o serviço
```bash
npm start
# ou para desenvolvimento
npm run dev
```

### Monitorar logs e desempenho
```bash
# Ver logs em tempo real
pm2 logs monitoring-service

# Estatísticas de uso de recursos
pm2 monit

# Status do serviço
pm2 status
```

## Hospedagem Recomendada

**Não hospede este serviço no Vercel ou outras plataformas serverless.**

Opções recomendadas:
- Amazon EC2 (instância t2.micro elegível para free tier por 12 meses)
- DigitalOcean Droplet ($5/mês, opção mais simples de configurar)
- Linode/Akamai ($5/mês)
- OVH VPS (opção econômica na Europa)
- Hospedagem tradicional que permita processos em segundo plano

### Comparativo de custos e recursos

| Provedor | Preço | CPU | RAM | Armazenamento | Transferência | Facilidade de uso |
|----------|-------|-----|-----|---------------|--------------|-----------------|
| AWS EC2 (t2.micro) | Free por 12 meses | 1 vCPU | 1 GB | 30 GB | 15 GB/mês | Média |
| DigitalOcean | $5/mês | 1 vCPU | 1 GB | 25 GB SSD | 1 TB | Alta |
| Linode/Akamai | $5/mês | 1 vCPU | 1 GB | 25 GB SSD | 1 TB | Média |
| OVH VPS | ~€3.5/mês | 1 vCPU | 2 GB | 20 GB SSD | Ilimitada | Média |

### Guia rápido de configuração (DigitalOcean)

1. Criar conta no DigitalOcean
2. Criar um Droplet ($5/mês, Ubuntu)
3. Configurar SSH e login
4. Instalar Node.js e NPM
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
5. Clonar repositório ou transferir arquivos
6. Instalar PM2 para gerenciamento de processos
   ```bash
   npm install -g pm2
   ```
7. Configurar inicialização automática
   ```bash
   pm2 start index.js --name "monitoring-service"
   pm2 startup
   pm2 save
   ```

## Endpoints da API

### Verificar status
- **GET** `/status`
- Retorna o status atual do serviço de monitoramento
- Resposta: 
  ```json
  {
    "isRunning": true,
    "lastUpdated": "2025-06-02T10:15:30Z",
    "contracts": {
      "walletMonitoring": true,
      "tokenDistribution": true,
      "learn2EarnContracts": [
        {"network": "ethereum", "address": "0x123...", "isActive": true}
      ],
      "instantJobsContracts": [
        {"network": "polygon", "address": "0xabc...", "isActive": true}
      ]
    },
    "balances": [
      {"network": "ethereum", "balance": "0.05", "symbol": "ETH"},
      {"network": "polygon", "balance": "10.2", "symbol": "MATIC"}
    ],
    "uptime": "2d 5h 30m"
  }
  ```

### Acionar verificação manual
- **POST** `/trigger-check`
- Headers: `Authorization: Bearer sua_chave_api`
- Aciona manualmente uma verificação completa
- Corpo da requisição (opcional):
  ```json
  {
    "checkBalances": true,
    "checkContracts": true
  }
  ```
- Resposta:
  ```json
  {
    "success": true,
    "timestamp": "2025-06-02T10:15:30Z",
    "details": {
      "balancesChecked": true,
      "contractsChecked": true,
      "issuesFound": 0
    }
  }
  ```

### Reiniciar monitoramento
- **POST** `/restart`
- Headers: `Authorization: Bearer sua_chave_api`
- Reinicia o serviço de monitoramento
- Resposta:
  ```json
  {
    "success": true,
    "message": "Monitoring service restarted successfully",
    "newState": {
      "isRunning": true,
      "startedAt": "2025-06-02T10:15:30Z"
    }
  }
  ```

### Receber configuração
- **GET** `/config`
- Headers: `Authorization: Bearer sua_chave_api`
- Obtém a configuração atual do serviço
- Resposta:
  ```json
  {
    "monitoringInterval": 300000,
    "conditionalWrites": true,
    "contractsMonitored": 5,
    "networksMonitored": ["ethereum", "polygon", "binance-smart-chain"]
  }
  ```

### Atualizar configuração
- **PUT** `/config`
- Headers: `Authorization: Bearer sua_chave_api`
- Atualiza a configuração do serviço
- Corpo da requisição:
  ```json
  {
    "monitoringInterval": 600000,
    "conditionalWrites": true
  }
  ```

## Arquitetura

Este serviço funciona independentemente do frontend e do backend principal.
Ele armazena os resultados no mesmo banco de dados Firestore usado pelo
aplicativo principal, permitindo que o frontend simplesmente leia o
estado mais recente do monitoramento.

### Otimizações de desempenho e custo

Para minimizar o impacto no Firestore e reduzir custos:

1. **Frequência de verificação reduzida**: 
   - Configurar intervalo de verificação para 5 minutos em vez de 1 minuto
   - Isso resulta em aproximadamente 8.640 operações por mês (bem abaixo do limite gratuito)
   - Ainda oferece monitoramento adequado para a maioria dos contratos blockchain

2. **Escritas condicionais**:
   ```javascript
   // Exemplo de escrita condicional
   const currentDoc = await firestore.doc('monitoring/status').get();
   if (currentDoc.data().isRunning !== isRunning) {
     await firestore.doc('monitoring/status').update({ isRunning });
   }
   ```

3. **Armazenamento eficiente**:
   - Manter apenas um documento para status geral: `/monitoring/status`
   - Um documento para cada contrato: `/monitoring/contracts/[contractId]`
   - Um documento para saldos: `/monitoring/balances`
   - Não armazenar histórico completo, apenas última verificação

4. **Estrutura de dados otimizada**:
   ```javascript
   // Exemplo de estrutura de dados para status
   {
     isRunning: true,
     lastUpdated: serverTimestamp(),
     contracts: {
       isWalletMonitoring: true,
       isTokenDistributionMonitoring: true,
       // outros estados compactados...
     }
   }
   ```

## Integração com o Aplicativo Principal

O componente `SystemActivityMonitor.tsx` no aplicativo principal apenas
consulta os dados de status no Firestore, em vez de tentar executar o 
monitoramento diretamente.

### Modificações necessárias no componente React

1. **Remover os loops de monitoramento**:
   ```typescript
   // ANTES:
   useEffect(() => {
     fetchMonitoringState();
     const interval = setInterval(fetchMonitoringState, 60000);
     return () => clearInterval(interval);
   }, []);

   // DEPOIS:
   useEffect(() => {
     // Busca apenas uma vez quando o componente carrega
     fetchMonitoringState();
     
     // Opcional: configurar listener para atualizações em tempo real
     const unsubscribe = firestore.doc('monitoring/status')
       .onSnapshot(snapshot => {
         // Atualizar estado com os dados do snapshot
       });
       
     return () => unsubscribe();
   }, []);
   ```

2. **Atualizar a função de reinício**:
   ```typescript
   // ANTES: chamada para API local
   const response = await fetch("/api/diagnostics/restart-monitoring", {...});

   // DEPOIS: chamada para microsserviço
   const response = await fetch("https://seu-microservico.com/restart", {
     method: "POST",
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${API_KEY}`
     },
   });
   ```
