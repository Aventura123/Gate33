import { ethers } from "ethers";
import { getDoc, doc, collection, query, where, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getWeb3Provider } from "./crypto";

// Minimum ABI for ERC20 token operations
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Learn2Earn contract ABI (atualizado para corresponder exatamente ao contrato)
const LEARN2EARN_ABI = [
  "function createLearn2Earn(string memory _firebaseId, address _tokenAddress, uint256 _tokenAmount, uint256 _startTime, uint256 _endTime, uint256 _maxParticipants) external",
  "function claimLearn2Earn(uint256 _learn2earnId, uint256 _amount, bytes memory _signature) external",
  "function learn2earns(uint256) external view returns (string memory id, address tokenAddress, uint256 tokenAmount, uint256 startTime, uint256 endTime, uint256 maxParticipants, uint256 participantCount, bool active)",
  "function hasClaimed(uint256 _learn2earnId, address _user) view returns (bool)",
  "function getTokenPerParticipant(uint256 _learn2earnId) external view returns (uint256)",
  "function learn2earnCount() external view returns (uint256)",
  "function endLearn2Earn(uint256 _learn2earnId) external",
  "function reactivateLearn2Earn(uint256 _learn2earnId) external",
  "function updateFeeConfig(address feeCollector, uint256 feePercent) external"
];

// Define network contract address interface
interface NetworkContractAddress {
  contractAddress: string;
  tokenAddress: string;
}

// Network RPC URLs for different blockchains
const NETWORK_RPC_URLS: Record<string, string> = {
  'ethereum': 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  'polygon': 'https://polygon-rpc.com',
  'binance': 'https://bsc-dataseed.binance.org/',
  'bnb': 'https://bsc-dataseed.binance.org/',
  'bsc': 'https://bsc-dataseed.binance.org/',
  'arbitrum': 'https://arb1.arbitrum.io/rpc',
  'optimism': 'https://mainnet.optimism.io',
  'avalanche': 'https://api.avax.network/ext/bc/C/rpc',
  'sepolia': 'https://rpc.sepolia.org',
  'mumbai': 'https://rpc-mumbai.maticvigil.com',
  'bsctestnet': 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  'bnbt': 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  'goerli': 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  'matic': 'https://polygon-rpc.com',
  'maticmum': 'https://rpc-mumbai.maticvigil.com'
};

/**
 * Gets the RPC URL for a specified network
 * @param network The network name
 * @returns The RPC URL for the network
 */
function getNetworkRPC(network: string): string {
  const normalizedNetwork = network.trim().toLowerCase();
  
  // Map network name variations to standard names
  const networkMapping: Record<string, string> = {
    'bsc testnet': 'bsctestnet',
    'binance smart chain testnet': 'bsctestnet',
    'binance testnet': 'bsctestnet',
    'binance smart chain': 'binance',
    'polygon mainnet': 'polygon',
    'polygon mumbai': 'mumbai',
    'eth mainnet': 'ethereum',
    'ethereum mainnet': 'ethereum'
  };
  
  // Use mapped name if it exists
  const mappedNetwork = networkMapping[normalizedNetwork];
  const networkKey = mappedNetwork || normalizedNetwork;
  
  // Return the RPC URL if it exists, otherwise return a default
  return NETWORK_RPC_URLS[networkKey] || 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
}

class Learn2EarnContractService {
  private contractAddresses: Record<string, NetworkContractAddress> = {};
  private initialized = false;
  private lastFirebaseCheck: number = 0;
  private readonly FIREBASE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    this.loadContractAddresses();
  }

  /**
   * Loads contract addresses from Firebase
   */
  private async loadContractAddresses() {
    try {
      if (!db) {
        console.warn("Firebase database not initialized");
        return;
      }
      
      // Record the time of the query
      this.lastFirebaseCheck = Date.now();
      const addresses: Record<string, NetworkContractAddress> = {};
      
      // MÉTODO 1: Buscar na coleção contractConfigs
      const contractConfigsCollection = collection(db, "contractConfigs");
      const querySnapshot = await getDocs(contractConfigsCollection);
      
      if (!querySnapshot.empty) {
        // Process all contract configs
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.network && data.contractAddress) {
            const normalizedNetwork = data.network.trim().toLowerCase();
            addresses[normalizedNetwork] = {
              contractAddress: data.contractAddress,
              tokenAddress: data.tokenAddress || ""
            };
          }
        });
      }
      
      // MÉTODO 2: Buscar também no documento settings/learn2earn
      console.log("Searching in settings/learn2earn for contract configurations");
      const settingsDoc = doc(db, "settings", "learn2earn");
      const settingsSnapshot = await getDoc(settingsDoc);
      
      if (settingsSnapshot.exists()) {
        const data = settingsSnapshot.data();
        const contracts = data.contracts || [];
        
        // Processar todos os contratos do array
        contracts.forEach((contract: any) => {
          if (contract.network && contract.contractAddress) {
            const normalizedNetwork = contract.network.trim().toLowerCase();
            console.log(`Found contract in settings/learn2earn for ${normalizedNetwork}`);
            
            addresses[normalizedNetwork] = {
              contractAddress: contract.contractAddress,
              tokenAddress: contract.tokenAddress || ""
            };
          }
        });
      }
      
      if (Object.keys(addresses).length > 0) {
        this.contractAddresses = addresses;
        this.initialized = true;
        console.log("Learn2Earn contract addresses loaded from Firebase:", this.contractAddresses);
        return;
      }
      
      console.warn("No contract configurations found in Firestore.");
      this.initialized = true;
    } catch (error) {
      console.error("Error loading learn2earn contract addresses:", error);
    }
  }

  /**
   * Returns list of supported networks for UI
   */
  async getSupportedNetworks(): Promise<string[]> {
    // Reload addresses from Firebase if needed
    await this.refreshContractAddressesIfNeeded();
    return Object.keys(this.contractAddresses);
  }

  /**
   * Periodically reload contracts from Firebase
   */
  private async refreshContractAddressesIfNeeded(): Promise<void> {
    const now = Date.now();
    if (!this.initialized || (now - this.lastFirebaseCheck) > this.FIREBASE_CHECK_INTERVAL) {
      await this.loadContractAddresses();
    }
  }

  /**
   * Obtains the contract address for the specified network
   */
  private async getContractAddress(network: string): Promise<string> {
    // Reload addresses from Firebase if needed
    await this.refreshContractAddressesIfNeeded();
    
    const normalizedNetwork = network.trim().toLowerCase();
    const address = this.contractAddresses[normalizedNetwork];
    
    if (!address || !address.contractAddress) {
      // Just return null instead of throwing an error - this will be handled by the UI
      return "";
    }
    
    return address.contractAddress;
  }

  /**
   * Checks if the token has been approved for the learn2earn contract
   */
  async checkTokenApproval(network: string, tokenAddress: string): Promise<boolean> {
    try {
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const learn2earnContractAddress = await this.getContractAddress(network);
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      // Check current allowance
      const allowance = await tokenContract.allowance(userAddress, learn2earnContractAddress);
      
      // If allowance is greater than 0, the token has been approved
      return !allowance.isZero();
    } catch (error) {
      console.error("Error checking token approval:", error);
      return false;
    }
  }

  /**
   * Approves the learn2earn contract to use the tokens
   */
  async approveToken(network: string, tokenAddress: string): Promise<any> {
    try {
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const signer = provider.getSigner();
      const learn2earnContractAddress = await this.getContractAddress(network);
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      // Approve a maximum value (adjust as needed)
      const maxAmount = ethers.constants.MaxUint256;
      const tx = await tokenContract.approve(learn2earnContractAddress, maxAmount);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: unknown) {
      console.error("Error approving token:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to approve token: ${errorMessage}`);
    }
  }

  /**
   * Creates a new learn2earn opportunity
   */
  async createLearn2Earn(
    network: string,
    id: string,
    tokenAddress: string, 
    amount: number,
    startDate: Date,
    endDate: Date,
    maxParticipants: number = 0
  ): Promise<any> {
    try {
      console.log(`Creating learn2earn on network: ${network}`);
      console.log("Parameters:", { 
        id, 
        tokenAddress, 
        amount, 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString(), 
        maxParticipants 
      });
      
      // Get the contract address
      const contractAddresses = await this.getContractAddresses(network);
      console.log("Contract addresses loaded:", contractAddresses);
      
      if (!contractAddresses || !contractAddresses.contractAddress) {
        // Instead of error, return a descriptive object that UI can handle gracefully
        return {
          success: false,
          message: `The selected network (${network}) is not currently supported for learn2earn.`,
          notSupported: true
        };
      }
      
      const contractAddress = contractAddresses.contractAddress;
      console.log(`Using contract address: ${contractAddress}`);
      
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const signer = provider.getSigner();
      
      // Create learn2earn contract instance
      const learn2earnContract = new ethers.Contract(contractAddress, LEARN2EARN_ABI, signer);
      
      // Convert amount to the correct unit (assuming 18 decimals - adjust as needed)
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);

      // Ensure timestamps are in the future by adjusting if needed
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      
      // Ensure startTimestamp is at least 60 seconds in the future to avoid blockchain rejection
      let startTimestamp = Math.floor(startDate.getTime() / 1000);
      if (startTimestamp <= now) {
        startTimestamp = now + 300; // 5 minutes in the future if timestamp is in the past
        console.log(`Start timestamp was in the past, adjusted to ${startTimestamp} (${new Date(startTimestamp * 1000).toISOString()})`);
      }
      
      // Ensure endTimestamp is at least 1 hour after startTimestamp
      let endTimestamp = Math.floor(endDate.getTime() / 1000);
      const minEndTimestamp = startTimestamp + 3600; // At least 1 hour after start
      if (endTimestamp <= minEndTimestamp) {
        endTimestamp = minEndTimestamp;
        console.log(`End timestamp was too close to start, adjusted to ${endTimestamp} (${new Date(endTimestamp * 1000).toISOString()})`);
      }
      
      // Add a buffer to the end time to prevent early expiration due to blockchain variance
      const endTimeBuffer = 3600; // 1 hour buffer
      endTimestamp += endTimeBuffer;
      console.log(`Added ${endTimeBuffer} seconds buffer to end timestamp: ${endTimestamp} (${new Date(endTimestamp * 1000).toISOString()})`);
      
      console.log("Creating learn2earn with params:", {
        id,
        tokenAddress,
        amountInWei: amountInWei.toString(),
        startTimestamp,
        endTimestamp,
        maxParticipants
      });

      // Check token balance before attempting to create
      try {
        // Use a minimal ERC20 ABI with just the functions we need
        const minimalERC20ABI = [
          "function balanceOf(address owner) view returns (uint256)",
          "function allowance(address owner, address spender) view returns (uint256)"
        ];
        
        const tokenContract = new ethers.Contract(tokenAddress, minimalERC20ABI, signer);
        const userAddress = await signer.getAddress();
        const balance = await tokenContract.balanceOf(userAddress);
        
        if (balance.lt(amountInWei)) {
          // Format token amount without trying to get symbol
          return {
            success: false,
            message: `Insufficient token balance. You need at least ${amount} tokens to create this Learn2Earn campaign.`,
            insufficientBalance: true,
            requiredAmount: amount,
            currentBalance: ethers.utils.formatUnits(balance, 18)
          };
        }
        
        // Check allowance again to make sure
        const allowance = await tokenContract.allowance(userAddress, contractAddress);
        if (allowance.lt(amountInWei)) {
          return {
            success: false,
            message: `Token allowance insufficient. Please approve the contract to spend your tokens first.`,
            insufficientAllowance: true
          };
        }
      } catch (error) {
        console.warn("Error checking token balance or allowance:", error);
        // Continue anyway, as the contract call will fail if there's a real issue
      }
      
      // Call the contract to create the learn2earn
      try {
        const tx = await learn2earnContract.createLearn2Earn(
          id,
          tokenAddress,
          amountInWei,
          startTimestamp,
          endTimestamp,
          maxParticipants
        );
        
        console.log("Transaction sent:", tx.hash);
        
        // Wait for transaction confirmation
        const receipt = await tx.wait(1);
        
        console.log("Transaction confirmed:", receipt.transactionHash);
        console.log("Transaction logs:", receipt.logs.length, "logs found");
        
        // Extract learn2earn ID from event (adjust based on your contract's event)
        let learn2earnId = 0;
        try {
          // Adicionar logs para depuração
          console.log(`Analisando ${receipt.logs.length} logs para encontrar ID do Learn2Earn`);
          
          // Primeiro, vamos verificar diretamente a linguagem de baixo nível dos logs sem usar o ABI
          // Esta abordagem evita o erro "no matching event" porque não depende do ABI
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
              console.log("Encontrado log do contrato:", {
                topics: log.topics,
                data: log.data
              });
              
              try {
                // Se temos pelo menos 2 tópicos, o segundo geralmente é o ID em eventos de criação
                if (log.topics && log.topics.length > 1) {
                  // O segundo tópico (índice 1) geralmente contém o ID em eventos de criação
                  const potentialIdTopic = log.topics[1];
                  if (potentialIdTopic) {
                    // Converter o hex para BigNumber e depois para número
                    const idFromTopic = ethers.BigNumber.from(potentialIdTopic).toNumber();
                    if (idFromTopic > 0) {
                      learn2earnId = idFromTopic;
                      console.log(`Extraído learn2earn ID ${learn2earnId} diretamente do log topic`);
                      break;
                    }
                  }
                }
                
                // Se o ID não estiver nos tópicos, verificar os dados do log
                if (log.data && log.data !== '0x') {
                  // Remover o prefixo '0x'
                  const data = log.data.slice(2);
                  
                  // Em muitos contratos, o ID é armazenado no primeiro slot de 32 bytes
                  if (data.length >= 64) {
                    // Extrair os primeiros 32 bytes (64 caracteres) e converter para número
                    const firstSlot = '0x' + data.slice(0, 64);
                    try {
                      const idFromData = ethers.BigNumber.from(firstSlot).toNumber();
                      if (idFromData > 0 && idFromData < 10000) { // ID razoável
                        learn2earnId = idFromData;
                        console.log(`Extraído learn2earn ID ${learn2earnId} dos dados do log`);
                        break;
                      }
                    } catch (e) {
                      // Ignorar se não for um número válido
                    }
                    
                    // Tente cada campo de 32 bytes nos dados
                    for (let i = 0; i < data.length; i += 64) {
                      if (i + 64 <= data.length) {
                        const slot = '0x' + data.slice(i, i + 64);
                        try {
                          const value = ethers.BigNumber.from(slot);
                          if (!value.isZero() && value.lt(10000)) { // Um ID razoável
                            console.log(`Potencial ID encontrado na posição ${i/64}:`, value.toString());
                            learn2earnId = value.toNumber();
                            break;
                          }
                        } catch (e) {
                          // Ignorar erros de conversão
                        }
                      }
                    }
                  }
                }
              } catch (parseError) {
                console.warn("Erro ao analisar log:", parseError);
              }
            }
          }
          
          // Se não encontramos o ID, vamos tentar usar o ABI do contrato para analisar os logs
          // Isso pode falhar se o evento não corresponder exatamente ao ABI
          if (learn2earnId === 0) {
            try {
              console.log("Tentando analisar logs usando ABI do contrato...");
              for (const log of receipt.logs) {
                if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
                  try {
                    const parsedLog = learn2earnContract.interface.parseLog(log);
                    console.log("Evento encontrado:", parsedLog.name, parsedLog.args);
                    
                    // Verificar diferentes possíveis nomes de evento
                    if (parsedLog.name && 
                       (parsedLog.name.includes("Learn2Earn") || 
                        parsedLog.name.includes("Earn") || 
                        parsedLog.name.includes("Created"))) {
                      
                      // Procurar em todos os argumentos por um que parece ser um ID numérico
                      for (const key in parsedLog.args) {
                        if (parsedLog.args[key] && 
                            ethers.BigNumber.isBigNumber(parsedLog.args[key]) && 
                            !parsedLog.args[key].isZero() && 
                            parsedLog.args[key].lt(10000)) { // Um ID razoável
                          learn2earnId = parsedLog.args[key].toNumber();
                          console.log(`ID Learn2Earn ${learn2earnId} encontrado no argumento ${key}`);
                          break;
                        }
                      }
                      
                      if (learn2earnId > 0) break;
                    }
                  } catch (parseError) {
                    console.warn("Não foi possível analisar log com ABI:", parseError);
                  }
                }
              }
            } catch (error) {
              console.warn("Erro ao tentar usar ABI para analisar logs:", error);
            }
          }
          
          // Se ainda não encontramos o ID, vamos usar uma abordagem alternativa com a função do contrato
          if (learn2earnId === 0) {
            console.log("Tentando abordagens alternativas para encontrar ID...");
            
            // Tentar obter o número total de Learn2Earns como último recurso
            try {
              console.log("Tentando obter learn2earnCount do contrato...");
              const totalCount = await learn2earnContract.learn2earnCount();
              learn2earnId = totalCount.toNumber();
              console.log(`Usando contagem total de learn2earn como ID: ${learn2earnId}`);
            } catch (countError) {
              console.warn("Não foi possível obter learn2earnCount:", countError);
              
              try {
                console.log("Tentando encontrar o ID usando um método alternativo...");
                // Em algumas implementações, o ID está no evento emitido quando um Learn2Earn é criado
                const events = await learn2earnContract.queryFilter(
                  "*", // Qualquer evento 
                  receipt.blockNumber,
                  receipt.blockNumber
                );
                
                console.log(`Encontrados ${events.length} eventos no bloco ${receipt.blockNumber}`);
                
                for (const event of events) {
                  if (event.transactionHash === receipt.transactionHash) {
                    console.log("Evento encontrado da nossa transação:", event);
                    
                    // Tentar encontrar um argumento numérico que poderia ser o ID
                    if (event.args) {
                      for (let i = 0; i < event.args.length; i++) {
                        const arg = event.args[i];
                        if (ethers.BigNumber.isBigNumber(arg) && !arg.isZero() && arg.lt(10000)) {
                          learn2earnId = arg.toNumber();
                          console.log(`ID Learn2Earn ${learn2earnId} encontrado no argumento ${i} do evento`);
                          break;
                        }
                      }
                    }
                    
                    if (learn2earnId > 0) break;
                  }
                }
              } catch (queryError) {
                console.warn("Erro ao consultar eventos:", queryError);
              }
              
              // Último recurso: usar 1 ou tentar o contador do contrato
              if (learn2earnId === 0) {
                try {
                  // Tentar diferentes métodos para obter o contador de Learn2Earns
                  const methods = [
                    "totalLearn2Earns", 
                    "learn2earnCounter", 
                    "getLearn2EarnCount",
                    "getTotalLearn2Earns"
                  ];
                  
                  for (const method of methods) {
                    try {
                      console.log(`Tentando método: ${method}`);
                      if (typeof learn2earnContract[method] === "function") {
                        const count = await learn2earnContract[method]();
                        if (count && ethers.BigNumber.isBigNumber(count) && !count.isZero()) {
                          learn2earnId = count.toNumber();
                          console.log(`ID Learn2Earn ${learn2earnId} obtido usando método ${method}`);
                          break;
                        }
                      }
                    } catch (e) {
                      // Ignorar e tentar o próximo método
                    }
                  }
                } catch (e) {
                  console.warn("Falha em todas as tentativas de encontrar o ID:", e);
                }
              }
              
              // Se tudo falhar, use 1 como padrão
              if (learn2earnId === 0) {
                learn2earnId = 1;
                console.warn("Não foi possível determinar o ID do Learn2Earn. Usando 1 como padrão.");
              }
            }
          }
        } catch (e) {
          console.warn("Erro ao extrair ID do Learn2Earn do evento:", e);
          // Como último recurso, use 1
          learn2earnId = 1;
          console.warn("Usando ID padrão 1 devido a erro na extração.");
        }
        
        return {
          success: true,
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          learn2earnId,
          tokenAddress,
          contractAddress
        };
      } catch (error: any) {
        // Handle specific contract errors
        console.error("Contract error:", error);
        
        // Check for common error patterns
        if (error.data) {
          // Attempt to decode the error data if it exists
          const errorData = error.data;
          
          if (typeof errorData === 'string' && errorData.startsWith('0xe450d38c')) {
            // This appears to be a specific fee-related error
            // Extract fee amount from the error data if possible
            let feeAmount = "0";
            try {
              // The last 32 bytes of the data contains the fee amount
              const feeHex = errorData.slice(-64);
              const feeBN = ethers.BigNumber.from("0x" + feeHex);
              feeAmount = ethers.utils.formatUnits(feeBN, 18);
            } catch (e) {
              console.warn("Failed to parse fee amount from error data");
            }
            
            return {
              success: false,
              message: `Insufficient fee balance. The contract requires a fee payment of ${feeAmount} tokens to create a Learn2Earn campaign.`,
              insufficientFee: true,
              errorCode: 'INSUFFICIENT_FEE',
              feeAmount
            };
          }
        }
        
        // Check for insufficient funds errors
        if (error.message && (
          error.message.includes("insufficient funds") || 
          error.message.includes("exceeds balance")
        )) {
          return {
            success: false,
            message: "You don't have enough tokens in your wallet to create this Learn2Earn campaign.",
            insufficientFunds: true,
            errorCode: 'INSUFFICIENT_FUNDS'
          };
        }
        
        // Check for gas estimation errors
        if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
          // This typically happens when the transaction would revert
          if (error.message.includes("execution reverted")) {
            // Check if the error contains the fee-related error signature in the data
            if (error.error && 
                error.error.data && 
                typeof error.error.data.data === 'string' && 
                error.error.data.data.startsWith('0xe450d38c')) {
                
              try {
                // Try to extract the fee amount from the error data
                const feeHex = error.error.data.data.slice(-64);
                const feeBN = ethers.BigNumber.from("0x" + feeHex);
                const feeAmount = ethers.utils.formatUnits(feeBN, 18);
                
                return {
                  success: false,
                  message: `Platform fee required: ${feeAmount} tokens. You need to have this amount in addition to your campaign tokens.`,
                  insufficientFee: true,
                  errorCode: 'INSUFFICIENT_FEE',
                  feeAmount
                };
              } catch (e) {
                console.warn("Failed to parse fee amount from nested error data");
              }
            }
            
            return {
              success: false,
              message: "Transaction would fail. This could be due to insufficient balance, invalid parameters, or a contract restriction.",
              executionReverted: true,
              errorCode: 'EXECUTION_REVERTED',
              details: error.message
            };
          }
        }
        
        // Generic error fallback
        return {
          success: false,
          message: error.message || "Unknown contract error",
          errorCode: 'CONTRACT_ERROR'
        };
      }
    } catch (error: unknown) {
      console.error("Error creating learn2earn:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        message: errorMessage,
        errorCode: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Allows additional token deposits into an existing learn2earn
   */
  async depositTokens(network: string, learn2earnId: number, amount: number): Promise<any> {
    try {
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const signer = provider.getSigner();
      const learn2earnContractAddress = await this.getContractAddress(network);
      
      // Return informative response if no contract is available
      if (!learn2earnContractAddress) {
        return {
          success: false,
          message: `The selected network (${network}) is not currently supported for learn2earn opportunities.`,
          notSupported: true
        };
      }
      
      // Create learn2earn contract instance
      const learn2earnContract = new ethers.Contract(learn2earnContractAddress, LEARN2EARN_ABI, signer);
      
      // Convert amount to the correct unit (assuming 18 decimals - adjust as needed)
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
      
      // Call the contract to deposit additional tokens
      const tx = await learn2earnContract.depositTokens(learn2earnId, amountInWei);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: unknown) {
      console.error("Error depositing tokens:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: `Failed to deposit tokens: ${errorMessage}`
      };
    }
  }

  /**
   * Forces a service reset, reloading contract addresses
   * Useful for resetting the service after connection issues or network changes
   */
  async resetService(): Promise<void> {
    this.initialized = false;
    this.contractAddresses = {};
    await this.loadContractAddresses();
    console.log("Learn2Earn contract service reset completed");
  }

  // Add or modify the getContractAddresses method to use consistent normalization
  async getContractAddresses(network: string): Promise<NetworkContractAddress> {
    // Check if we need to update contracts from Firebase
    await this.refreshContractAddressesIfNeeded();
    
    const normalizedNetwork = network.trim().toLowerCase();
    
    // If we already have addresses in cache, return them
    if (this.contractAddresses[normalizedNetwork]) {
      console.log(`Using cached contract addresses for ${normalizedNetwork}`);
      const cachedAddress = this.contractAddresses[normalizedNetwork];
      
      // If it's a string (old format), convert to new format
      if (typeof cachedAddress === 'string') {
        return {
          contractAddress: cachedAddress,
          tokenAddress: ""
        };
      }
      return cachedAddress;
    }
    
    // If not in cache, load directly from Firebase
    const addresses = await loadContractAddresses(normalizedNetwork);
    
    if (!addresses) {
      // If nothing was found in Firebase, simply return null
      // This will allow the UI to not show this network as an option
      console.warn(`No contract address found for network: ${network}`);
      return { contractAddress: "", tokenAddress: "" };
    }
    
    // Store in cache for future use
    this.contractAddresses[normalizedNetwork] = addresses;
    console.log(`Cached contract addresses for ${normalizedNetwork}`);
    
    return addresses;
  }

  /**
   * Claims tokens from a learn2earn opportunity
   */
  async claimLearn2Earn(network: string, firebaseId: string): Promise<any> {
    try {
      console.log(`Claiming tokens from learn2earn with Firebase ID ${firebaseId} on network ${network}`);
      
      const provider = await getWeb3Provider();
      if (!provider) throw new Error("Web3 provider not available");
      
      const contractAddress = await this.getContractAddress(network);
      if (!contractAddress) {
        return {
          success: false,
          message: `The selected network (${network}) is not currently supported for learn2earn opportunities.`,
          notSupported: true
        };
      }
      
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Create learn2earn contract instance
      const learn2earnContract = new ethers.Contract(contractAddress, LEARN2EARN_ABI, signer);
      
      // Fetch the Learn2Earn document to get information
      const docRef = doc(db, "learn2earn", firebaseId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return {
          success: false,
          message: "Learn2Earn opportunity not found."
        };
      }
      
      const learn2EarnData = docSnap.data();
      
      // Get the numeric learn2earnId required by the contract
      const numericContractId = Number(learn2EarnData.learn2earnId);
      
      if (isNaN(numericContractId)) {
        return {
          success: false,
          message: "This Learn2Earn opportunity doesn't have a valid numeric ID. Please contact support.",
          invalidId: true
        };
      }
      
      // Calculate token amount per participant
      let tokenAmount;
      try {
        tokenAmount = await learn2earnContract.getTokenPerParticipant(numericContractId);
        console.log(`Token amount per participant: ${tokenAmount.toString()}`);
      } catch (error) {
        console.error("Error getting token amount per participant:", error);
        return {
          success: false,
          message: "Failed to determine token reward amount."
        };
      }
      
      // Check if the user has already claimed
      try {
        const alreadyClaimed = await learn2earnContract.hasClaimed(numericContractId, userAddress);
        if (alreadyClaimed) {
          return {
            success: false,
            message: "You have already claimed tokens for this Learn2Earn opportunity.",
            alreadyClaimed: true
          };
        }
      } catch (claimCheckError) {
        console.error("Error checking if already claimed:", claimCheckError);
        // Continue anyway, contract will revert if already claimed
      }

      // Check blockchain status of the learn2earn to compare with Firebase data
      try {
        // Get learn2earn data from blockchain
        const onChainData = await learn2earnContract.learn2earns(numericContractId);
        
        const blockchainStartTime = onChainData.startTime.toNumber();
        const blockchainEndTime = onChainData.endTime.toNumber();
        const blockchainActive = onChainData.active;
        
        // Get current blockchain time
        const currentBlock = await provider.getBlock("latest");
        const blockchainTime = currentBlock.timestamp;
        
        // Get Firebase times
        const firebaseStartTime = learn2EarnData.startDate?.seconds || 0;
        const firebaseEndTime = learn2EarnData.endDate?.seconds || 0;
        const localTime = Math.floor(Date.now() / 1000);
        
        console.log("Time comparison:", {
          blockchainTime,
          blockchainStartTime,
          blockchainEndTime,
          firebaseStartTime,
          firebaseEndTime,
          localTime,
          timeDiff: blockchainTime - localTime
        });
        
        // Check if the Learn2Earn has not started yet according to blockchain
        if (blockchainTime < blockchainStartTime) {
          const startDate = new Date(blockchainStartTime * 1000);
          
          // Check if there's a significant time discrepancy
          const blockchainFirebaseTimeDiff = Math.abs(blockchainStartTime - firebaseStartTime);
          
          if (blockchainFirebaseTimeDiff > 900) { // More than 15 minutes difference
            console.warn(`Time discrepancy detected: Blockchain start time ${blockchainStartTime} vs Firebase ${firebaseStartTime}`);
            
            return {
              success: false,
              message: `There appears to be a time synchronization issue. According to the blockchain, this campaign starts at ${startDate.toLocaleString()}.`,
              specificError: "timeSync",
              blockchainStartTime,
              firebaseStartTime,
              blockchainTime,
              localTime
            };
          }
          
          return {
            success: false,
            message: `This Learn2Earn campaign has not started yet. It will start on ${startDate.toLocaleString()}.`,
            specificError: "notStarted",
            startTime: blockchainStartTime,
            currentTime: blockchainTime,
            startDate: startDate.toLocaleString()
          };
        }
        
        // Check if the Learn2Earn has ended according to blockchain
        if (blockchainTime > blockchainEndTime) {
          return {
            success: false,
            message: "This Learn2Earn campaign has already ended.",
            specificError: "ended"
          };
        }
        
        // Check if the Learn2Earn is active
        if (!blockchainActive) {
          return {
            success: false,
            message: "This Learn2Earn campaign is currently paused.",
            specificError: "paused"
          };
        }
      } catch (statusCheckError) {
        console.error("Error checking blockchain status:", statusCheckError);
        // Continue anyway, but with a warning
        console.warn("Proceeding with claim despite status check failure");
      }
      
      // Get signature from API endpoint
      let signature;
      try {
        console.log(`Fetching signature with firebaseId=${firebaseId}, address=${userAddress}`);
        console.log(`Document data:`, learn2EarnData);
        
        // Se o documento tem um campo firebaseId explícito, use-o
        const idForSignature = learn2EarnData.firebaseId || firebaseId || numericContractId.toString();
        
        const signatureResponse = await fetch(`/api/learn2earn/claim-signature?firebaseId=${idForSignature}&address=${userAddress}&amount=${tokenAmount.toString()}`);
        
        if (!signatureResponse.ok) {
          const errorData = await signatureResponse.json();
          
          // Se estamos em ambiente de desenvolvimento e não há chave configurada
          if (errorData.devEnvironment) {
            console.warn("Development environment detected with no signature key configured.");
            console.warn("For testing purposes, using a mock signature. This will NOT work on a real blockchain!");
            
            // Mock signature for development only
            signature = "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
            
            // Continue execution for UI testing (but transaction will fail)
          } else {
            return {
              success: false,
              message: errorData.error || "Failed to get claim signature",
              invalidSignature: true
            };
          }
        } else {
          const signatureData = await signatureResponse.json();
          signature = signatureData.signature;
          
          if (!signature) {
            return {
              success: false, 
              message: "No signature returned from API", 
              invalidSignature: true
            };
          }
        }
      } catch (signatureError) {
        console.error("Error getting signature:", signatureError);
        return {
          success: false,
          message: "Failed to get authorization signature for claiming tokens.",
          invalidSignature: true
        };
      }
      
      console.log(`Claiming tokens with contractId: ${numericContractId}, amount: ${tokenAmount}, signature length: ${signature.length}`);
      
      // Call the contract to claim the tokens
      const tx = await learn2earnContract.claimLearn2Earn(
        numericContractId, 
        tokenAmount, 
        signature
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      
      console.log("Claim transaction confirmed:", receipt.transactionHash);
      
      // Update the participation record to mark it as claimed
      try {
        const participantsRef = collection(db, "learn2earnParticipants");
        const q = query(
          participantsRef, 
          where("walletAddress", "==", userAddress.toLowerCase()),
          where("learn2earnId", "==", firebaseId)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docRef = querySnapshot.docs[0].ref;
          await updateDoc(docRef, {
            claimed: true,
            claimedAt: new Date(),
            transactionHash: receipt.transactionHash
          });
        }
      } catch (updateErr) {
        console.error("Error updating participation status:", updateErr);
      }
      
      // Update the Learn2Earn document to ensure participant count is in sync
      try {
        await this.syncLearn2EarnStatus(firebaseId);
      } catch (syncErr) {
        console.warn("Error syncing Learn2Earn status after claiming:", syncErr);
        // Don't block success for this error
      }
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error(`Error claiming tokens for Learn2Earn ${firebaseId}:`, error);
      
      // Check for specific contract error messages
      let errorMessage = error?.message || "Unknown error occurred";
      let specificError = null;
      
      // Parse common blockchain error messages
      if (errorMessage.includes("Learn2Earn has ended")) {
        specificError = "ended";
        errorMessage = "This Learn2Earn opportunity has already ended.";
      } else if (errorMessage.includes("Learn2Earn has not started yet")) {
        // Get the Learn2Earn data to show when it will start
        try {
          const docRef = doc(db, "learn2earn", firebaseId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Get start time from both Firebase and blockchain
            const firebaseStartTime = data.startDate?.seconds || 0;
            
            // Create a non-null provider
            const web3Provider = await getWeb3Provider();
            if (!web3Provider) {
              return {
                success: false,
                message: "Failed to connect to blockchain. Please check your wallet connection.",
                specificError: "providerError"
              };
            }
            
            const blockchainTime = (await web3Provider.getBlock("latest")).timestamp;
            const localTime = Math.floor(Date.now() / 1000);
            
            // Get contract-specific data
            const contractAddress = await this.getContractAddress(network);
            const learn2earnContract = new ethers.Contract(contractAddress, LEARN2EARN_ABI, web3Provider);
            const numericContractId = Number(data.learn2earnId);
            let blockchainStartTime = 0;
            
            try {
              const onChainData = await learn2earnContract.learn2earns(numericContractId);
              blockchainStartTime = onChainData.startTime.toNumber();
            } catch (e) {
              console.error("Failed to get blockchain start time:", e);
            }
            
            // Calculate time difference
            const blockchainFirebaseTimeDiff = Math.abs(blockchainStartTime - firebaseStartTime);
            const blockchainLocalTimeDiff = Math.abs(blockchainTime - localTime);
            
            // If there's a significant time discrepancy
            if (blockchainFirebaseTimeDiff > 900 || blockchainLocalTimeDiff > 300) { // More than 15min/5min difference
              console.warn("Time synchronization issue detected:", {
                firebaseStartTime,
                blockchainStartTime,
                blockchainTime,
                localTime,
                blockchainFirebaseTimeDiff,
                blockchainLocalTimeDiff
              });
              
              return {
                success: false,
                message: "There's a time synchronization issue between the blockchain and our servers.",
                specificError: "timeSync",
                timeData: {
                  firebaseStartTime,
                  blockchainStartTime,
                  blockchainTime,
                  localTime
                }
              };
            }
            
            const startDate = new Date((blockchainStartTime || firebaseStartTime) * 1000);
            
            specificError = "notStarted";
            errorMessage = `This Learn2Earn campaign has not started yet. It will start on ${startDate.toLocaleString()}.`;
            
            return {
              success: false,
              message: errorMessage,
              specificError: specificError,
              notStarted: true,
              startTime: blockchainStartTime || firebaseStartTime,
              currentTime: blockchainTime,
              startDate: startDate.toLocaleString()
            };
          }
        } catch (e) {
          console.error("Error getting campaign start time:", e);
          specificError = "notStarted";
          errorMessage = "This Learn2Earn campaign has not started yet.";
        }
      } else if (errorMessage.includes("Learn2Earn not active")) {
        specificError = "inactive";
        errorMessage = "This Learn2Earn opportunity is not currently active.";
      } else if (errorMessage.includes("already claimed")) {
        specificError = "alreadyClaimed";
        errorMessage = "You have already claimed rewards for this Learn2Earn opportunity.";
      } else if (errorMessage.includes("network") || errorMessage.includes("chain id")) {
        specificError = "wrongNetwork";
        errorMessage = `Please make sure you're connected to the ${network} network.`;
      }
      
      return {
        success: false,
        message: `Failed to claim tokens: ${errorMessage}`,
        specificError: specificError
      };
    }
  }

  /**
   * Sincroniza o status de uma oportunidade Learn2Earn entre o Firestore e a blockchain
   * @param firebaseId ID do documento Learn2Earn no Firestore
   * @returns Resultado da sincronização
   */
  async syncLearn2EarnStatus(firebaseId: string): Promise<any> {
    try {
      console.log(`Sincronizando Learn2Earn ${firebaseId}...`);
      
      // Buscar documento no Firestore
      const docRef = doc(db, "learn2earn", firebaseId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return {
          success: false,
          error: `Learn2Earn com ID ${firebaseId} não encontrado no Firestore`
        };
      }
      
      const learn2EarnData = docSnap.data();
      
      // Verificar se temos um ID numérico para blockchain
      if (!learn2EarnData.learn2earnId) {
        return {
          success: false,
          error: `Learn2Earn não possui um ID de contrato válido`
        };
      }
      
      // Pegar o ID numérico do contrato
      const numericContractId = Number(learn2EarnData.learn2earnId);
      
      // Verificar se a rede é suportada
      if (!learn2EarnData.network) {
        return {
          success: false,
          error: `Learn2Earn não tem uma rede blockchain definida`
        };
      }
      
      // Obter o endereço do contrato para a rede especificada
      const contractAddress = await this.getContractAddress(learn2EarnData.network);
      if (!contractAddress) {
        return {
          success: false, 
          error: `Rede ${learn2EarnData.network} não suportada`
        };
      }
      
      // Conectar ao provider
      const provider = new ethers.providers.JsonRpcProvider(
        getNetworkRPC(learn2EarnData.network)
      );
      
      // Criar uma instância do contrato
      const contract = new ethers.Contract(
        contractAddress,
        LEARN2EARN_ABI,
        provider
      );
      
      // Buscar dados do Learn2Earn na blockchain
      const onChainData = await contract.learn2earns(numericContractId);
      console.log("Dados da blockchain:", onChainData);
      
      // Extrair valores relevantes
      const active = onChainData.active;
      const maxParticipants = onChainData.maxParticipants;
      const participantCount = onChainData.participantCount;
      const startTime = onChainData.startTime;
      const endTime = onChainData.endTime;
      
      console.log("Dados extraídos:", {
        active,
        maxParticipants: maxParticipants.toString(),
        participantCount: participantCount.toString(),
        startTime: startTime.toString(),
        endTime: endTime.toString()
      });
      
      // Determinar o novo status com base nos dados da blockchain
      let newStatus = learn2EarnData.status;
      let needsUpdate = false;
      let updates: Record<string, any> = {};
      
      // IMPORTANTE: Atualizar contagem de participantes para corresponder à blockchain
      // Para garantir consistência, sempre use o número do blockchain como fonte da verdade
      const blockchainParticipantCount = participantCount.toNumber();
      if (learn2EarnData.totalParticipants !== blockchainParticipantCount) {
        updates.totalParticipants = blockchainParticipantCount;
        needsUpdate = true;
        console.log(`Atualizando contagem de participantes: ${learn2EarnData.totalParticipants || 0} -> ${blockchainParticipantCount}`);
      }
      
      // Atualizar maxParticipants se for diferente
      if (maxParticipants.toNumber() > 0 && 
          (!learn2EarnData.maxParticipants || 
           Number(learn2EarnData.maxParticipants) !== maxParticipants.toNumber())) {
        updates.maxParticipants = maxParticipants.toNumber();
        needsUpdate = true;
        console.log(`Atualizando máximo de participantes: ${learn2EarnData.maxParticipants || 0} -> ${maxParticipants.toString()}`);
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Verificar se Learn2Earn expirou pelo tempo
      if (endTime.toNumber() < currentTime) {
        newStatus = "completed";
        if (learn2EarnData.status !== "completed") {
          needsUpdate = true;
          updates.status = newStatus;
          console.log(`Learn2Earn expirou pelo tempo. Novo status: ${newStatus}`);
        }
      } 
      // Verificar se Learn2Earn está cheio
      else if (maxParticipants.toNumber() > 0 && blockchainParticipantCount >= maxParticipants.toNumber()) {
        newStatus = "completed";
        if (learn2EarnData.status !== "completed") {
          needsUpdate = true;
          updates.status = newStatus;
          console.log(`Learn2Earn atingiu o máximo de participantes. Novo status: ${newStatus}`);
        }
      }
      // Verificar se Learn2Earn foi pausado na blockchain
      else if (!active && learn2EarnData.status === "active") {
        newStatus = "paused";
        needsUpdate = true;
        updates.status = newStatus;
        console.log(`Learn2Earn foi pausado na blockchain. Novo status: ${newStatus}`);
      }
      // Verificar se Learn2Earn foi reativado na blockchain
      else if (active && learn2EarnData.status === "paused") {
        newStatus = "active";
        needsUpdate = true;
        updates.status = newStatus;
        console.log(`Learn2Earn foi reativado na blockchain. Novo status: ${newStatus}`);
      }
      
      // Atualizar documento no Firestore se necessário
      if (needsUpdate) {
        await updateDoc(docRef, {
          ...updates,
          lastSynced: new Date()
        });
        
        return {
          success: true,
          message: `Learn2Earn ${firebaseId} sincronizado com sucesso`,
          updates,
          newStatus,
          previousStatus: learn2EarnData.status
        };
      }
      
      return {
        success: true,
        message: "Nenhuma atualização necessária",
        status: learn2EarnData.status
      };
    } catch (error: any) {
      console.error(`Erro ao sincronizar Learn2Earn ${firebaseId}:`, error);
      return {
        success: false,
        error: error.message || "Erro desconhecido durante a sincronização"
      };
    }
  }
  
  /**
   * Sincroniza o status de todas as oportunidades Learn2Earn entre o Firestore e a blockchain
   * @returns Resultado da sincronização em massa
   */
  async syncAllLearn2EarnStatuses(): Promise<any> {
    try {
      console.log("Iniciando sincronização em massa dos Learn2Earns...");
      
      // Buscar todos os Learn2Earns ativos no Firestore
      const learn2earnsRef = collection(db, "learn2earn");
      // Incluímos também "completed" para atualizar participantCount e outros dados
      const q = query(learn2earnsRef, where("status", "in", ["active", "paused", "completed"]));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return {
          success: true,
          total: 0,
          synchronized: 0,
          failed: 0,
          message: "Nenhum Learn2Earn encontrado para sincronizar."
        };
      }
      
      const total = querySnapshot.size;
      let synchronized = 0;
      let failed = 0;
      const results: Record<string, any> = {};
      
      // Sincronizar cada Learn2Earn
      for (const document of querySnapshot.docs) {
        try {
          const result = await this.syncLearn2EarnStatus(document.id);
          
          if (result.success) {
            synchronized++;
          } else {
            failed++;
          }
          
          results[document.id] = result;
        } catch (itemError) {
          failed++;
          results[document.id] = {
            success: false,
            message: "Erro desconhecido durante sincronização"
          };
        }
      }
      
      console.log(`Sincronização em massa concluída: ${synchronized}/${total} com sucesso, ${failed} falhas`);
      
      return {
        success: true,
        total,
        synchronized,
        failed,
        results,
        message: `Sincronização concluída: ${synchronized}/${total} com sucesso, ${failed} falhas`
      };
      
    } catch (error: any) {
      console.error("Erro durante sincronização em massa:", error);
      return {
        success: false,
        message: `Erro durante sincronização em massa: ${error.message || "Erro desconhecido"}`
      };
    }
  }
}

/**
 * Updates the fee configuration on the Learn2Earn smart contract.
 * @param contractAddress The address of the Learn2Earn contract.
 * @param provider The Web3 provider instance.
 * @param feeCollector The address of the fee collector.
 * @param feePercent The percentage of the fee (0-100).
 */
export const updateFeeConfig = async (
  contractAddress: string,
  provider: ethers.providers.Web3Provider,
  feeCollector: string,
  feePercent: number
): Promise<void> => {
  try {
    const signer = provider.getSigner();
    const network = await provider.getNetwork();

    // Buscar o contrato correspondente no Firestore
    const normalizedNetwork = network.name.trim().toLowerCase();
    const contractData = await loadContractAddresses(normalizedNetwork);

    if (!contractData || !contractData.contractAddress) {
      console.error(`No contract found for network: ${normalizedNetwork}`);
      throw new Error(`No contract configuration available for the current network: ${normalizedNetwork}`);
    }

    console.log(`Using contract address: ${contractData.contractAddress} for network: ${normalizedNetwork}`);

    const contract = new ethers.Contract(contractData.contractAddress, LEARN2EARN_ABI, signer);

    const tx = await contract.updateFeeConfig(feeCollector, feePercent);
    await tx.wait();

    console.log("Fee configuration updated successfully.");
  } catch (error) {
    console.error("Error updating fee configuration:", error);
    throw new Error("Failed to update fee configuration. Check console for details.");
  }
};

async function loadContractAddresses(network: string) {
  try {
    if (!db) {
      console.warn("Firebase database not initialized");
      return null;
    }
    
    // Normalizar o nome da rede e criar mapeamento para compatibilidade
    const normalizedNetwork = network.trim().toLowerCase();
    console.log(`Looking for contract config for network: ${normalizedNetwork}`);
    
    // Mapeamento de nomes de rede para compatibilidade
    const networkMappings: Record<string, string[]> = {
      "bnbt": ["bsctestnet", "binance smart chain testnet", "bsc testnet"],
      "bsctestnet": ["bnbt"],
      "matic": ["polygon", "polygon mainnet"],
      "maticmum": ["mumbai", "polygon mumbai"],
      // Adicione mais mapeamentos conforme necessário
    };
    
    // Criar uma lista de nomes possíveis para procurar
    let possibleNetworkNames = [normalizedNetwork];
    
    // Adicionar nomes alternativos baseados no mapeamento
    if (networkMappings[normalizedNetwork]) {
      possibleNetworkNames = [...possibleNetworkNames, ...networkMappings[normalizedNetwork]];
    }
    
    console.log("Searching for network with possible names:", possibleNetworkNames);
    
    // MÉTODO 1: Buscar na coleção contractConfigs
    const configsCollection = collection(db, "contractConfigs");
    
    // Tentar todas as variantes de nome possíveis
    for (const netName of possibleNetworkNames) {
      const q = query(configsCollection, where("network", "==", netName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        console.log(`Found contract config for ${netName} in contractConfigs:`, data);
        
        return {
          contractAddress: data.contractAddress,
          tokenAddress: data.tokenAddress || ""
        };
      }
    }
    
    // MÉTODO 2: Buscar na coleção settings/learn2earn
    console.log(`Searching in settings/learn2earn for possible network names:`, possibleNetworkNames);
    const settingsDoc = doc(db, "settings", "learn2earn");
    const settingsSnapshot = await getDoc(settingsDoc);
    
    if (settingsSnapshot.exists()) {
      const data = settingsSnapshot.data();
      const contracts = data.contracts || [];
      
      // Procurar contrato para qualquer uma das possíveis variantes do nome da rede
      const contractForNetwork = contracts.find(
        (contract: any) => {
          const contractNetwork = contract.network?.trim().toLowerCase();
          return possibleNetworkNames.includes(contractNetwork);
        }
      );
      
      if (contractForNetwork) {
        console.log(`Found contract in settings/learn2earn for network variant:`, contractForNetwork);
        return {
          contractAddress: contractForNetwork.contractAddress,
          tokenAddress: contractForNetwork.tokenAddress || ""
        };
      }
    }
    
    console.warn(`No contract config found for network: ${normalizedNetwork} or any of its variants in any location`);
    return null;
  } catch (error) {
    console.error(`Error loading contract addresses for ${network}:`, error);
    throw error;
  }
}

const learn2earnContractService = new Learn2EarnContractService();
export default learn2earnContractService;