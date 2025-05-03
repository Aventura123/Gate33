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
  "function depositTokens(uint256 learn2earnId, uint256 amount) returns (bool)",
  "function getAllowance(address tokenAddress) view returns (uint256)",
  "function claimTokens(string memory learn2earnId) returns (bool)",
  "function updateFeeConfig(address feeCollector, uint256 feePercent) external",
  "function learn2earns(uint256) external view returns (string memory id, address tokenAddress, uint256 tokenAmount, uint256 startTime, uint256 endTime, uint256 maxParticipants, uint256 participantCount, bool active)",
  "function hasClaimed(uint256 _learn2earnId, address _user) view returns (bool)",
  "function getTokenPerParticipant(uint256 _learn2earnId) external view returns (uint256)",
  "function learn2earnCount() external view returns (uint256)",
  "function endLearn2Earn(uint256 _learn2earnId) external",
  "function reactivateLearn2Earn(uint256 _learn2earnId) external"
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
      
      // Fetch the Learn2Earn document to get the firebaseId
      const docRef = doc(db, "learn2earn", learn2earnId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return {
          success: false,
          message: "Learn2Earn opportunity not found."
        };
      }
      
      const learn2EarnData = docSnap.data();
      
      // Use o campo firebaseId do documento
      const firebaseId = learn2EarnData.firebaseId;
      
      if (!firebaseId) {
        return {
          success: false,
          message: "This Learn2Earn opportunity doesn't have a valid Firebase ID. Please contact support.",
          invalidId: true
        };
      }
      
      console.log(`Using Firebase ID for contract call: ${firebaseId}`);
      
      // Call the contract to claim the tokens using the firebaseId
      const tx = await learn2earnContract.claimTokens(firebaseId);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      
      console.log("Claim transaction confirmed:", receipt.transactionHash);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: unknown) {
      console.error("Error claiming tokens:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: `Failed to claim tokens: ${errorMessage}`
      };
    }
  }

  /**
   * Sincroniza o status de uma oportunidade de Learn2Earn específica entre o Firestore e a blockchain
   * @param learn2earnId ID do documento Learn2Earn no Firestore
   * @returns Resultado da sincronização
   */
  async syncLearn2EarnStatus(learn2earnId: string): Promise<any> {
    try {
      console.log(`Sincronizando Learn2Earn ID: ${learn2earnId}`);
      
      // Buscar o documento Learn2Earn no Firestore
      const docRef = doc(db, "learn2earn", learn2earnId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return {
          success: false,
          message: `Learn2Earn com ID ${learn2earnId} não encontrado no Firestore.`
        };
      }
      
      const learn2EarnData = docSnap.data();
      const previousStatus = learn2EarnData.status;
      let newStatus = previousStatus;
      
      // Se não tiver informações de rede ou firebaseId ou contractId, não podemos sincronizar
      if (!learn2EarnData.network || !learn2EarnData.firebaseId || learn2EarnData.learn2earnId === undefined) {
        return {
          success: false,
          previousStatus,
          newStatus,
          message: `Não foi possível sincronizar: informações de rede, ID interno ou contractId ausentes.`
        };
      }
      
      // Verificar status na blockchain
      try {
        // Usar provider somente leitura para não precisar de assinatura
        const provider = ethers.getDefaultProvider(learn2EarnData.network);
        if (!provider) throw new Error("Web3 provider não disponível");
        
        const contractAddress = await this.getContractAddress(learn2EarnData.network);
        if (!contractAddress) {
          return {
            success: false,
            previousStatus,
            newStatus,
            message: `Rede ${learn2EarnData.network} não suportada.`
          };
        }
        
        // Obter informações do contrato na blockchain
        // Usar o ABI completo e chamar o método learn2earns() 
        const contract = new ethers.Contract(contractAddress, LEARN2EARN_ABI, provider);
        
        // Converter o contractId para número
        const numericLearn2EarnId = Number(learn2EarnData.learn2earnId);
        
        // Chamar o contrato para obter informações reais da oportunidade
        const [
          id, 
          tokenAddress, 
          tokenAmount, 
          startTime, 
          endTime, 
          maxParticipants,
          participantCount,
          active
        ] = await contract.learn2earns(numericLearn2EarnId);
        
        console.log("Dados do blockchain:", {
          id,
          tokenAddress,
          tokenAmount: tokenAmount.toString(),
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          maxParticipants: maxParticipants.toString(),
          participantCount: participantCount.toString(),
          active
        });
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Verificar se Learn2Earn expirou pelo tempo
        if (endTime.toNumber() < currentTime) {
          newStatus = "completed";
        } 
        // Verificar se Learn2Earn está cheio
        else if (maxParticipants.toNumber() > 0 && participantCount.toNumber() >= maxParticipants.toNumber()) {
          newStatus = "completed";
        }
        // Verificar se Learn2Earn foi pausado na blockchain
        else if (!active) {
          newStatus = "paused";
        }
        // Caso contrário, mantém-se ativo
        else {
          newStatus = "active";
        }
        
        // Atualizar o documento no Firestore
        const updateData: Record<string, any> = {
          lastSyncedAt: new Date(),
          participantCount: participantCount.toNumber(),
          active,
          tokenAddress,
          tokenAmount: ethers.utils.formatUnits(tokenAmount, 18) // Assumindo token com 18 casas decimais
        };
        
        // Atualizar status apenas se mudou
        if (newStatus !== previousStatus) {
          updateData.status = newStatus;
          updateData.statusChangedAt = new Date();
        }
        
        // Sempre atualizamos o documento para manter os valores sincronizados
        await updateDoc(docRef, updateData);
        
        console.log(`Learn2Earn ${learn2earnId} sincronizado: ${previousStatus} -> ${newStatus}`);
        
        return {
          success: true,
          previousStatus,
          newStatus,
          participantCount: participantCount.toNumber(),
          active,
          message: newStatus !== previousStatus 
            ? `Status atualizado: ${previousStatus} -> ${newStatus}` 
            : `Status não mudou (${newStatus})`
        };
        
      } catch (blockchainError: any) {
        console.error(`Erro ao verificar Learn2Earn na blockchain:`, blockchainError);
        return {
          success: false,
          previousStatus,
          newStatus,
          message: `Erro ao verificar na blockchain: ${blockchainError.message || "Erro desconhecido"}`
        };
      }
      
    } catch (error: any) {
      console.error(`Erro ao sincronizar Learn2Earn ${learn2earnId}:`, error);
      return {
        success: false,
        message: `Erro ao sincronizar: ${error.message || "Erro desconhecido"}`
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