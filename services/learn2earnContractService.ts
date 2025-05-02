import { ethers } from "ethers";
import { getDoc, doc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getWeb3Provider } from "./crypto";

// Minimum ABI for ERC20 token operations
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Learn2Earn contract ABI (atualizado para corresponder exatamente à função no contrato)
const LEARN2EARN_ABI = [
  "function createLearn2Earn(string memory _firebaseId, address _tokenAddress, uint256 _tokenAmount, uint256 _startTime, uint256 _endTime, uint256 _maxParticipants) external",
  "function claimLearn2Earn(uint256 _learn2earnId, uint256 _amount, bytes memory _signature) external", 
  "function hasClaimed(uint256 _learn2earnId, address _user) view returns (bool)",
  "function getTokenPerParticipant(uint256 _learn2earnId) external view returns (uint256)",
  "function learn2earns(uint256 _learn2earnId) external view returns (string memory id, address tokenAddress, uint256 tokenAmount, uint256 startTime, uint256 endTime, uint256 maxParticipants, uint256 participantCount, bool active)",
  "function updateFeeConfig(address _feeCollector, uint256 _feePercent) external"
];

// Define network contract address interface
interface NetworkContractAddress {
  contractAddress: string;
  tokenAddress: string;
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
      
      // Convert dates to UNIX timestamps (seconds)
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);
      
      console.log("Creating learn2earn with params:", {
        id,
        tokenAddress,
        amountInWei: amountInWei.toString(),
        startTimestamp,
        endTimestamp,
        maxParticipants
      });
      
      // Call the contract to create the learn2earn
      const tx = await learn2earnContract.createLearn2Earn(
        id,
        tokenAddress,
        amountInWei,
        startTimestamp,
        endTimestamp,
        maxParticipants
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      
      // Extract learn2earn ID from event (adjust based on your contract's event)
      let learn2earnId = 0;
      try {
        // Try to extract ID from event (this logic may vary depending on your contract)
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === learn2earnContract.toLowerCase()) {
            const parsedLog = learn2earnContract.interface.parseLog(log);
            if (parsedLog.name === "Learn2EarnCreated") {
              learn2earnId = parsedLog.args.learn2earnId.toNumber();
              break;
            }
          }
        }
      } catch (e) {
        console.warn("Could not extract learn2earn ID from event:", e);
      }
      
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        learn2earnId,
        tokenAddress
      };
    } catch (error: unknown) {
      console.error("Error creating learn2earn:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to create learn2earn: ${errorMessage}`);
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
  async claimLearn2Earn(network: string, learn2earnId: string): Promise<any> {
    try {
      console.log(`Claiming tokens from learn2earn ${learn2earnId} on network ${network}`);
      
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
      
      console.log(`Calling claimLearn2Earn with learn2earnId: ${learn2earnId}`);
      
      try {
        // Buscar os dados do Learn2Earn no Firebase
        const docRef = doc(db, "learn2earn", learn2earnId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          return {
            success: false,
            message: "Learn2Earn opportunity not found."
          };
        }
        
        const learn2EarnData = docSnap.data();
        
        // Obter o ID numérico do contrato
        // IMPORTANTE: Este ID deve ser configurado corretamente no Firebase
        const numericLearn2EarnId = learn2EarnData.contractId 
          ? Number(learn2EarnData.contractId) 
          : 0;
        
        console.log(`Using numeric contract ID: ${numericLearn2EarnId}`);
        
        // Obter a quantidade de tokens por participante
        let tokenPerParticipant;
        try {
          // Tenta obter do contrato primeiro
          tokenPerParticipant = await learn2earnContract.getTokenPerParticipant(numericLearn2EarnId);
          console.log("Token per participant from contract:", tokenPerParticipant.toString());
        } catch (error) {
          // Se falhar, usa o valor do Firebase
          tokenPerParticipant = learn2EarnData.tokenPerParticipant || "0.01";
          console.log("Using token per participant from Firebase:", tokenPerParticipant);
        }
        
        // Converter o valor para Wei (unidade do blockchain)
        const amount = ethers.utils.parseUnits(tokenPerParticipant.toString(), 18);
        console.log("Amount in Wei:", amount.toString());
        
        // Verificar se o usuário já reivindicou
        try {
          const alreadyClaimed = await learn2earnContract.hasClaimed(numericLearn2EarnId, userAddress);
          
          if (alreadyClaimed) {
            console.log("User has already claimed tokens for this learn2earn");
            return {
              success: false,
              alreadyClaimed: true,
              message: "You have already claimed tokens for this Learn2Earn opportunity."
            };
          }
        } catch (checkError) {
          console.log("Could not check if user has already claimed:", checkError);
          // Continuar mesmo se não conseguir verificar
        }
        
        // Obter uma assinatura válida do backend
        console.log("Requesting signature from backend API...");
        
        try {
          const apiResponse = await fetch('/api/learn2earn/claim-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractId: numericLearn2EarnId,
              userAddress,
              amount: amount.toString(),
              network
            })
          });
          
          const signatureData = await apiResponse.json();
          
          if (!apiResponse.ok) {
            console.error("API returned an error:", signatureData);
            
            // Verificar se é erro de não ter completado as tarefas
            if (apiResponse.status === 403 || (signatureData.error && signatureData.error.includes("not completed"))) {
              return {
                success: false,
                notEligible: true,
                message: "You have not completed the required tasks for this Learn2Earn opportunity."
              };
            }
            
            // Verificar se já foi recompensado
            if (signatureData.error && signatureData.error.includes("already been rewarded")) {
              return {
                success: false,
                alreadyClaimed: true,
                message: "You have already claimed tokens for this Learn2Earn opportunity."
              };
            }
            
            // Erro de servidor não configurado para gerar assinaturas (comum em ambiente de desenvolvimento)
            if (signatureData.devEnvironment) {
              return {
                success: false,
                invalidSignature: true,
                devEnvironment: true,
                message: "Signature generation is not configured on this server. In production, you need a properly configured server with admin private key."
              };
            }
            
            throw new Error(signatureData.error || "Failed to get signature from API");
          }
          
          const { signature } = signatureData;
          
          if (!signature) {
            throw new Error("Invalid signature returned from API");
          }
          
          console.log("Received valid signature from API");
          
          // Set manual gas limit to avoid estimation errors
          const options = {
            gasLimit: 800000, // Increased gas limit 
          };
          
          console.log(`Calling contract with parameters:`, {
            contractId: numericLearn2EarnId,
            amount: amount.toString(),
            signatureLength: signature.length
          });
          
          // Call the contract's claimLearn2Earn function with the valid signature
          const tx = await learn2earnContract.claimLearn2Earn(
            numericLearn2EarnId,
            amount, 
            signature,
            options
          );
          
          console.log("Transaction sent:", tx.hash);
          
          // Wait for transaction confirmation
          const receipt = await tx.wait(1);
          
          console.log("Claim transaction confirmed:", receipt.transactionHash);
          
          return {
            success: true,
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber
          };
        } catch (apiError: any) {
          console.error("Error getting signature from API:", apiError);
          throw new Error(`Failed to get signature: ${apiError.message}`);
        }
      } catch (txError: any) {
        console.error("Transaction error details:", txError);
        
        // Check if it's a known contract error
        const errorMessage = txError.message || "";
        
        // Verificações específicas de erros comuns
        if (errorMessage.includes("invalid BigNumber") || errorMessage.includes("INVALID_ARGUMENT")) {
          return {
            success: false,
            message: "O ID do Learn2Earn não está no formato correto. Por favor, contate o suporte.",
            invalidId: true
          };
        }
        
        if (errorMessage.includes("CALL_EXCEPTION")) {
          // Verifica as mensagens de erro mais comuns
          if (errorMessage.toLowerCase().includes("already claimed") || txError.reason?.toLowerCase().includes("already claimed")) {
            return {
              success: false,
              alreadyClaimed: true,
              message: "You have already claimed tokens for this Learn2Earn opportunity."
            };
          }
          
          if (errorMessage.toLowerCase().includes("signature") || txError.reason?.toLowerCase().includes("signature") || 
              errorMessage.toLowerCase().includes("invalid") || txError.reason?.toLowerCase().includes("invalid")) {
            return {
              success: false,
              invalidSignature: true,
              message: "Invalid signature. The backend needs to generate a valid signature for this claim. Please contact support."
            };
          }
          
          if (errorMessage.toLowerCase().includes("learn2earn does not exist")) {
            return {
              success: false,
              invalidId: true,
              message: "This Learn2Earn opportunity doesn't exist on the blockchain. The contractId may be incorrect."
            };
          }
          
          if (errorMessage.toLowerCase().includes("not started")) {
            return {
              success: false,
              message: "This Learn2Earn opportunity has not started yet."
            };
          }
          
          if (errorMessage.toLowerCase().includes("ended")) {
            return {
              success: false,
              message: "This Learn2Earn opportunity has already ended."
            };
          }
          
          // Se temos um hash da transação, incluímos para depuração
          if (txError.transactionHash) {
            return {
              success: false,
              message: "Transaction was rejected by the contract. Please contact support if you believe this is an error.",
              transactionHash: txError.transactionHash
            };
          }
          
          // Erro genérico de contrato
          return {
            success: false,
            message: "Transaction was rejected by the contract. Please make sure you meet all requirements for claiming tokens."
          };
        }
        
        // Re-throw other errors
        throw txError;
      }
    } catch (error: unknown) {
      console.error("Error claiming tokens:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Verificar casos específicos de erro
      if (errorMessage.includes("Failed to get signature")) {
        return {
          success: false,
          message: "Could not obtain a valid signature. You may not have completed all required tasks.",
          signatureError: true
        };
      }
      
      // Verificar se é um erro relacionado a número inválido
      if (errorMessage.includes("invalid BigNumber") || errorMessage.includes("INVALID_ARGUMENT")) {
        return {
          success: false,
          message: "O ID do Learn2Earn não está no formato correto. Por favor, contate o suporte.",
          invalidId: true
        };
      }
      
      // Mensagem mais detalhada para ajudar no diagnóstico
      return {
        success: false,
        message: `Failed to claim tokens: ${errorMessage}`
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