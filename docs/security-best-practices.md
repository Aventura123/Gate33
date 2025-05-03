# Práticas de Segurança para Chaves Privadas

Este documento descreve as melhores práticas para lidar com chaves privadas no projeto Gate33.

## Riscos de Armazenar Chaves Privadas em Serviços de Hospedagem

Armazenar chaves privadas como variáveis de ambiente no Vercel, Netlify ou qualquer serviço de hospedagem sempre apresenta riscos significativos:

- **Vazamento de dados**: Vulnerabilidades no provedor podem expor as chaves
- **Acesso a logs**: Pessoas com acesso aos logs podem visualizar variáveis de ambiente
- **Comprometimento da conta**: Se sua conta de hospedagem for comprometida
- **Ameaças internas**: Funcionários do provedor com acesso privilegiado

## Alternativas Mais Seguras

### 1. Usar um Vault de Segredos Externo

```javascript
// Exemplo usando HashiCorp Vault
import vault from 'node-vault';

const vaultClient = vault({
  endpoint: process.env.VAULT_ADDR
});

// Autenticação
await vaultClient.userpassLogin({
  username: process.env.VAULT_USERNAME,
  password: process.env.VAULT_PASSWORD
});

// Obter a chave privada
const result = await vaultClient.read('secret/data/gate33/wallet-keys');
const privateKey = result.data.data.privateKey;
```

### 2. Serviço de Assinatura de Transações

```javascript
// Em vez de armazenar a chave, envie a transação não assinada para um serviço seguro
async function processTransaction(unsignedTx) {
  const response = await fetch('https://seu-servico-seguro.com/sign', {
    method: 'POST',
    body: JSON.stringify({ tx: unsignedTx }),
    headers: { 'Authorization': 'Bearer ' + process.env.API_KEY }
  });
  
  return await response.json();
}
```

### 3. Hardware Security Module (HSM)

HSMs são dispositivos físicos específicos para proteger chaves criptográficas:

- AWS CloudHSM
- Google Cloud HSM
- Azure Dedicated HSM

## Configuração Recomendada para o Gate33

### Para ambiente de produção:

1. **Separar chaves por função**:
   - Chave para distribuição de tokens (privilégios mínimos)
   - Chave para operações administrativas (acesso restrito)

2. **Limitar o saldo**:
   - Manter apenas o necessário para gas nas carteiras de serviço
   - Reabastecer periodicamente de forma segura

3. **Monitorar transações**:
   - Implementar alertas para transações acima de certo limite
   - Monitoramento contínuo de atividades suspeitas

```javascript
// Exemplo de verificação de saldo antes de usar uma chave de serviço
async function checkServiceWalletBalance() {
  const balance = await provider.getBalance(serviceWalletAddress);
  const balanceInEth = ethers.utils.formatEther(balance);
  
  if (parseFloat(balanceInEth) > 0.1) {
    console.warn("Service wallet balance exceeds threshold!");
    // Enviar alerta
  }
}
```

4. **Rotação de chaves**:
   - Substituir periodicamente as chaves de serviço
   - Atualizar as permissões nos contratos inteligentes

## Implementação para o Vercel

Se for absolutamente necessário manter chaves no Vercel:

1. Use criptografia adicional para as chaves (não armazene a chave crua)
2. Divida a chave em múltiplas variáveis de ambiente
3. Implemente verificações adicionais antes do uso da chave
4. Limite os IPs que podem iniciar transações com essas chaves

```javascript
// Exemplo: Descriptografar chave privada armazenada com criptografia adicional
function getPrivateKey() {
  const encryptedKey = process.env.ENCRYPTED_PRIVATE_KEY;
  const decryptionKey = process.env.KEY_PART_1 + process.env.KEY_PART_2;
  
  // Uso de algoritmo de descriptografia
  return decrypt(encryptedKey, decryptionKey);
}
```

## Conclusão

A segurança de chaves privadas deve sempre ser tratada com máxima prioridade. Para o projeto Gate33, recomendamos:

1. **Fase inicial**: Usar carteiras de serviço com fundos limitados apenas para gas
2. **Crescimento**: Migrar para solução com HSM ou serviço de assinatura externo
3. **Escala completa**: Implementar uma solução multisig para operações críticas

Lembre-se: A segurança não é um produto, mas um processo contínuo.