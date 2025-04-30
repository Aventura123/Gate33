import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, where, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { connectWallet, getCurrentAddress } from "../../services/crypto";
import { Button } from "./button";
import { web3Service } from "../../services/web3Service";
import smartContractService from "../../services/smartContractService";
import InstantJobsManager from "../admin/InstantJobsManager";
import { NETWORK_CONFIG, CONTRACT_ADDRESSES } from "../../config/paymentConfig";

interface PaymentConfigProps {
  hasPermission: boolean;
}

// Estado para armazenar as configurações carregadas do Firestore
interface FirestorePaymentConfig {
  receiverAddress: string;
  serviceFee: number;
  transactionTimeout: number;
  contracts: {
    ethereum: string;
    polygon: string;
    binance: string;
  };
  updatedAt?: Date;
}

const PaymentSettings: React.FC<PaymentConfigProps> = ({ hasPermission }) => {
  // Estados para armazenar os valores de configuração
  const [walletAddress, setWalletAddress] = useState("");
  const [serviceFee, setServiceFee] = useState(0);
  const [transactionTimeout, setTransactionTimeout] = useState(0);
  
  // Estados para contratos em diferentes redes
  const [ethContract, setEthContract] = useState("");
  const [polygonContract, setPolygonContract] = useState("");
  const [binanceContract, setBinanceContract] = useState("");

  // Novo estado para o contrato da Binance Testnet
  const [binanceTestnetContract, setBinanceTestnetContract] = useState("");
  const [binanceTestnetSaveStatus, setBinanceTestnetSaveStatus] = useState<string | null>(null);

  // Função para salvar apenas o contrato da Binance Testnet no Firestore
  const handleSaveBinanceTestnetContract = async () => {
    setBinanceTestnetSaveStatus(null);
    try {
      if (!validateEthereumAddress(binanceTestnetContract)) {
        setBinanceTestnetSaveStatus("Endereço inválido. Deve começar com '0x' e ter 40 caracteres hexadecimais.");
        return;
      }
      // Atualiza apenas o campo binanceTestnet em contracts
      const configRef = doc(db, "settings", "paymentConfig");
      await setDoc(configRef, { contracts: { binanceTestnet: binanceTestnetContract } }, { merge: true });
      setBinanceTestnetSaveStatus("Endereço salvo com sucesso!");
    } catch (err: any) {
      setBinanceTestnetSaveStatus("Erro ao salvar: " + (err.message || "Erro desconhecido"));
    }
  };

  // Estado para armazenar a configuração atual do sistema (Firestore ou config)
  const [currentSystemConfig, setCurrentSystemConfig] = useState<any>(null);

  // Estados para carteiras adicionais
  const [feeCollectorAddress, setFeeCollectorAddress] = useState("");
  const [currentFeeCollector, setCurrentFeeCollector] = useState("");
  const [developmentWalletAddress, setDevelopmentWalletAddress] = useState("");
  const [charityWalletAddress, setCharityWalletAddress] = useState("");
  const [evolutionWalletAddress, setEvolutionWalletAddress] = useState("");
  
  // Estados para percentuais de distribuição
  const [feePercentage, setFeePercentage] = useState(0);
  const [developmentPercentage, setDevelopmentPercentage] = useState(0);
  const [charityPercentage, setCharityPercentage] = useState(0);
  const [evolutionPercentage, setEvolutionPercentage] = useState(0);
  const [totalPercentage, setTotalPercentage] = useState(0);
  
  // Estados para atualização das carteiras
  const [updatingWallets, setUpdatingWallets] = useState(false);
  const [walletUpdateSuccess, setWalletUpdateSuccess] = useState(false);
  const [walletUpdateError, setWalletUpdateError] = useState<string | null>(null);
  
  const [walletConnected, setWalletConnected] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adicionar estado para armazenar o endereço do proprietário do contrato
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);

  // Função para converter percentuais (interface para usuário)
  // Converte o percentual do contrato (base 1000) para valor de exibição (0-100)
  const contractToDisplayPercentage = (value: number): number => {
    return value / 10; // Converte base 1000 para percentual real (ex: 950 -> 95)
  };

  // Converte o percentual de exibição (0-100) para valor do contrato (base 1000)
  const displayToContractPercentage = (value: number): number => {
    return Math.round(value * 10); // Converte percentual para base 1000 (ex: 95 -> 950)
  };

  // Carregar configurações do Firestore
  const fetchCurrentSettings = useCallback(async () => {
    try {
      // Verifica se existe um documento de configurações
      const configDoc = await getDocs(collection(db, "settings"));
      if (!configDoc.empty) {
        configDoc.forEach((doc) => {
          const data = doc.data() as FirestorePaymentConfig;
          // Atualizar os estados do componente
          if (data.receiverAddress) setWalletAddress(data.receiverAddress);
          if (data.serviceFee) setServiceFee(data.serviceFee);
          if (data.transactionTimeout) setTransactionTimeout(data.transactionTimeout);
          
          // Configuração de contratos
          if (data.contracts) {
            if (data.contracts.ethereum) setEthContract(data.contracts.ethereum);
            if (data.contracts.polygon) setPolygonContract(data.contracts.polygon);
            if (data.contracts.binance) setBinanceContract(data.contracts.binance);
          }
          
          // Atualizar a configuração atual do sistema para mostrar os valores do Firestore
          setCurrentSystemConfig({
            receiverAddress: data.receiverAddress || "",
            contracts: {
              ethereum: data.contracts?.ethereum || "",
              polygon: data.contracts?.polygon || "",
              binance: data.contracts?.binance || ""
            },
            serviceFee: (data.serviceFee || 0) + "%",
            transactionTimeout: (data.transactionTimeout || 0) + " segundos",
            updatedAt: data.updatedAt ? (
              // Ensure Firestore timestamp compatibility
              typeof data.updatedAt === 'object' && 'seconds' in data.updatedAt
                ? new Date((data.updatedAt as { seconds: number }).seconds * 1000).toLocaleString()
                : new Date(data.updatedAt).toLocaleString()
            ) : "Não disponível"
          });
          
          console.log("Configurações carregadas do Firestore:", data);
        });
      } else {
        // Se não existir, cria um novo documento com os valores padrão
        await updatePaymentConfig();
        console.log("Configurações padrão salvas no Firestore");
      }
    } catch (err) {
      console.error("Erro ao carregar configurações de pagamento:", err);
      setError("Não foi possível carregar as configurações de pagamento.");
    }
  }, []);

  useEffect(() => {
    if (hasPermission) {
      fetchCurrentSettings();
      checkWalletConnection();
    }
  }, [hasPermission, fetchCurrentSettings]);

  // Verificar conexão da carteira
  const checkWalletConnection = () => {
    try {
      const connected = web3Service.isWalletConnected();
      setWalletConnected(connected);
      if (connected) {
        fetchContractData();
      }
    } catch (err) {
      console.error("Erro ao verificar conexão da carteira:", err);
    }
  };

  // Buscar dados do contrato (endereços e percentuais) com tratamento de erros mais robusto
  const fetchContractData = async () => {
    try {
      setWalletUpdateError(null);

      // Verificar se estamos na rede BSC Testnet
      const walletInfo = web3Service.getWalletInfo(); // Get wallet info which includes network details
      if (!walletInfo) {
        setWalletUpdateError("Informações da carteira não disponíveis. Conecte a carteira primeiro.");
        return;
      }
      
      const isBscTestnet = walletInfo.chainId === 97; // 97 é o chainId da BSC Testnet
      
      if (!isBscTestnet) {
        setWalletUpdateError("Por favor, conecte-se à rede BSC Testnet (ChainID: 97) para interagir com o contrato");
        
        // Tentar mudar para a BSC Testnet
        try {
          // Assuming 'binance' corresponds to BSC Testnet in your NETWORK_CONFIG
          await web3Service.switchNetwork('binance'); 
          console.log("Rede alterada para BSC Testnet");
          // Re-fetch wallet info after switching network
          const updatedWalletInfo = web3Service.getWalletInfo();
          if (!updatedWalletInfo || updatedWalletInfo.chainId !== 97) {
             console.error("Falha ao confirmar a mudança para BSC Testnet.");
             setWalletUpdateError("Falha ao mudar para BSC Testnet. Verifique sua carteira.");
             return;
          }
        } catch (switchError: any) {
          console.error("Erro ao tentar mudar para BSC Testnet:", switchError);
          setWalletUpdateError(`Erro ao mudar para BSC Testnet: ${switchError.message}. Por favor, mude manualmente.`);
          return; // Stop execution if switching fails
        }
      }

      // Verificar se o contrato está inicializado antes de fazer chamadas
      if (!smartContractService.isContractInitialized()) {
        try {
          // Passar explicitamente a rede BSC Testnet para inicialização
          await smartContractService.initializeContract();
        } catch (initError: any) {
          console.error("Erro ao inicializar contrato na BSC Testnet:", initError);
          setWalletUpdateError(`Não foi possível inicializar o contrato na BSC Testnet: ${initError.message || "verifique sua conexão de rede"}`);
          return;
        }
      }
      
      if (smartContractService.isContractInitialized()) {
        // Criar um array para armazenar todos os erros encontrados durante as chamadas
        const errors: string[] = [];
        
        // 1. Fee Collector Address
        try {
          const feeCollector = await smartContractService.getFeeCollector();
          setCurrentFeeCollector(feeCollector);
          setFeeCollectorAddress(feeCollector);
        } catch (e: any) {
          console.warn("Erro ao obter feeCollector:", e);
          errors.push(`Erro ao obter endereço do coletor de taxas: ${e.message || e}`);
          // Não falhar completamente, apenas registrar o erro e continuar
        }
        
        // 2. Development Wallet
        try {
          const developmentWallet = await smartContractService.getDevelopmentWallet();
          setDevelopmentWalletAddress(developmentWallet);
        } catch (e: any) {
          console.warn("Erro ao obter developmentWallet:", e);
          errors.push(`Erro ao obter carteira de desenvolvimento: ${e.message || e}`);
        }
        
        // 3. Charity Wallet
        try {
          const charityWallet = await smartContractService.getCharityWallet();
          setCharityWalletAddress(charityWallet);
        } catch (e: any) {
          console.warn("Erro ao obter charityWallet:", e);
          errors.push(`Erro ao obter carteira de caridade: ${e.message || e}`);
        }
        
        // 4. Evolution Wallet
        try {
          const evolutionWallet = await smartContractService.getEvolutionWallet();
          setEvolutionWalletAddress(evolutionWallet);
        } catch (e: any) {
          console.warn("Erro ao obter evolutionWallet:", e);
          errors.push(`Erro ao obter carteira de evolução: ${e.message || e}`);
        }
        
        // 5. Distribution Percentages
        try {
          const percentages = await smartContractService.getDistributionPercentages();
          setFeePercentage(contractToDisplayPercentage(percentages.feePercentage));
          setDevelopmentPercentage(contractToDisplayPercentage(percentages.developmentPercentage));
          setCharityPercentage(contractToDisplayPercentage(percentages.charityPercentage));
          setEvolutionPercentage(contractToDisplayPercentage(percentages.evolutionPercentage));
          setTotalPercentage(contractToDisplayPercentage(percentages.totalPercentage));
        } catch (e: any) {
          console.warn("Erro ao obter percentuais:", e);
          errors.push(`Erro ao obter percentuais de distribuição: ${e.message || e}`);
          // Se não conseguir obter os percentuais, pelo menos tentar calcular o total com base nos valores atuais
          const tempTotal = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
          setTotalPercentage(tempTotal);
        }
        
        // Se houver erros, exibir apenas o primeiro para não sobrecarregar a interface
        if (errors.length > 0) {
          setWalletUpdateError(`Alguns dados não puderam ser carregados: ${errors[0]} ${errors.length > 1 ? `(+${errors.length - 1} erros)` : ''}`);
        }
      }

      // Tentar obter o proprietário do contrato
      try {
        const ownerAddress = await smartContractService.getContractOwner();
        setContractOwner(ownerAddress);
      } catch (e: any) {
        console.warn("Erro ao obter proprietário do contrato:", e);
      }
    } catch (err: any) {
      console.error("Erro ao obter dados do contrato:", err);
      setWalletUpdateError(`Erro ao obter dados do contrato na BSC Testnet: ${err.message || "verifique sua conexão"}`);
    }
  };

  // Conectar carteira
  const connectWallet = async () => {
    try {
      setWalletUpdateError(null);
      
      await web3Service.connectWallet();
      setWalletConnected(true);
      
      // Verificar se está na rede BSC Testnet após conectar
      const walletInfo = web3Service.getWalletInfo(); // Get wallet info after connection
      if (!walletInfo) {
         setWalletUpdateError("Não foi possível obter informações da carteira após conectar.");
         return;
      }

      if (walletInfo.chainId !== 97) { // 97 é o chainId da BSC Testnet
        try {
          // Assuming 'binance' corresponds to BSC Testnet in your NETWORK_CONFIG
          await web3Service.switchNetwork('binance');
          console.log("Rede alterada para BSC Testnet");
          // Re-check network after switching
          const updatedWalletInfo = web3Service.getWalletInfo();
          if (!updatedWalletInfo || updatedWalletInfo.chainId !== 97) {
             console.error("Falha ao confirmar a mudança para BSC Testnet após switch.");
             setWalletUpdateError("Falha ao mudar para BSC Testnet. Verifique sua carteira.");
             // Don't necessarily return here, maybe let initialization proceed but show error
          }
        } catch (switchError: any) {
          console.error("Erro ao tentar mudar para BSC Testnet:", switchError);
          setWalletUpdateError(`Por favor, mude manualmente para a rede BSC Testnet (ChainID: 97). Erro: ${switchError.message}`);
          // Potentially stop further contract interaction if network switch failed critically
          // return; 
        }
      }
      
      // Tentar inicializar o contrato depois da conexão
      try {
        // Ensure initialization uses the correct network context if needed
        await smartContractService.initializeContract(); 
        await fetchContractData(); // Fetch data after ensuring correct network and initialization
      } catch (contractError: any) {
        console.error("Erro ao inicializar contrato após conexão:", contractError);
        setWalletUpdateError(`Erro ao inicializar contrato na BSC Testnet: ${contractError.message || "Verifique se você está na rede correta"}`);
      }
    } catch (err: any) {
      console.error("Erro ao conectar carteira:", err);
      setWalletUpdateError(err.message || "Erro ao conectar carteira. Verifique se o MetaMask está instalado.");
      setWalletConnected(false); // Ensure state reflects connection failure
    }
  };

  const updatePaymentConfig = async () => {
    try {
        const configData = {
            receiverAddress: walletAddress,
            serviceFee: serviceFee,
            transactionTimeout: transactionTimeout * 1000, // Convertido para milissegundos
            contracts: {
                ethereum: ethContract,
                polygon: polygonContract,
                binance: binanceContract
            },
            updatedAt: new Date(),
        };

        // Save to Firestore
        await setDoc(doc(db, "settings", "paymentConfig"), configData, { merge: true });

        // Update CONTRACT_ADDRESSES dynamically
        CONTRACT_ADDRESSES.ethereum = ethContract;
        CONTRACT_ADDRESSES.polygon = polygonContract;
        CONTRACT_ADDRESSES.binance = binanceContract;

        // Update the current system configuration
        setCurrentSystemConfig({
            receiverAddress: walletAddress,
            contracts: {
                ethereum: ethContract,
                polygon: polygonContract,
                binance: binanceContract
            },
            serviceFee: serviceFee + "%",
            transactionTimeout: transactionTimeout + " segundos",
            networks: Object.keys(NETWORK_CONFIG).map(net => ({
                name: NETWORK_CONFIG[net as keyof typeof NETWORK_CONFIG].name,
                chainId: NETWORK_CONFIG[net as keyof typeof NETWORK_CONFIG].chainId,
            })),
            updatedAt: new Date().toLocaleString()
        });

        console.log("Configurações de pagamento atualizadas no Firestore e na configuração local:", configData);
        return true;
    } catch (err) {
        console.error("Erro ao atualizar configurações de pagamento:", err);
        throw err;
    }
};

  const validateEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/g.test(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setUpdateSuccess(false);
    
    try {
      if (!validateEthereumAddress(walletAddress)) {
        throw new Error("Endereço da carteira é inválido. Deve começar com '0x' seguido por 40 caracteres hexadecimais.");
      }
      
      // Validar contratos (se fornecidos)
      if (ethContract && !validateEthereumAddress(ethContract)) {
        throw new Error("Endereço do contrato Ethereum é inválido.");
      }
      
      if (polygonContract && !validateEthereumAddress(polygonContract)) {
        throw new Error("Endereço do contrato Polygon é inválido.");
      }
      
      if (binanceContract && !validateEthereumAddress(binanceContract)) {
        throw new Error("Endereço do contrato Binance é inválido.");
      }
      
      // Validar taxa de serviço
      if (serviceFee < 0 || serviceFee > 100) {
        throw new Error("Taxa de serviço deve estar entre 0 e 100%.");
      }
      
      // Validar timeout de transação
      if (transactionTimeout < 10) {
        throw new Error("Timeout de transação não pode ser menor que 10 segundos.");
      }
      
      await updatePaymentConfig();
      setUpdateSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar configurações de pagamento.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Função para atualizar as carteiras adicionais e percentuais
  const handleUpdateAdditionalWallets = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingWallets(true);
    setWalletUpdateError(null);
    setWalletUpdateSuccess(false);
    
    try {
      if (!walletConnected) {
        throw new Error("Conecte sua carteira primeiro");
      }
      
      // Validar endereços
      if (feeCollectorAddress && !validateEthereumAddress(feeCollectorAddress)) {
        throw new Error("Endereço do coletor principal (FeeCollector) é inválido");
      }
      
      if (developmentWalletAddress && !validateEthereumAddress(developmentWalletAddress)) {
        throw new Error("Endereço da carteira de desenvolvimento é inválido");
      }
      
      if (charityWalletAddress && !validateEthereumAddress(charityWalletAddress)) {
        throw new Error("Endereço da carteira de caridade é inválido");
      }
      
      if (evolutionWalletAddress && !validateEthereumAddress(evolutionWalletAddress)) {
        throw new Error("Endereço da carteira de evolução é inválido");
      }
      
      // Validar percentuais (a base no contrato é 1000, ou seja, 25 = 2.5%)
      if (feePercentage < 0 || feePercentage > 100) {
        throw new Error("Percentual da taxa principal deve estar entre 0 e 100 (0% e 10%)");
      }
      
      if (developmentPercentage < 0 || developmentPercentage > 100) {
        throw new Error("Percentual da carteira de desenvolvimento deve estar entre 0 e 100 (0% e 10%)");
      }
      
      if (charityPercentage < 0 || charityPercentage > 100) {
        throw new Error("Percentual da carteira de caridade deve estar entre 0 e 100 (0% e 10%)");
      }
      
      if (evolutionPercentage < 0 || evolutionPercentage > 100) {
        throw new Error("Percentual da carteira de evolução deve estar entre 0 e 100 (0% e 10%)");
      }
      
      // Verificar se o total não ultrapassa 30% (300 na base 1000)
      const total = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
      if (total > 30) {
        throw new Error("A soma total de todos os percentuais não pode ultrapassar 30%");
      }
      
      // Verificar se o contrato está inicializado
      if (!smartContractService.isContractInitialized()) {
        await smartContractService.initializeContract();
      }

      // Verificar se o usuário atual é o owner do contrato com tratamento de erro aprimorado
      try {
        const isOwner = await smartContractService.checkOwnership();
        
        if (!isOwner) {
          // Melhorar a mensagem de erro para incluir instruções úteis
          const walletInfo = web3Service.getWalletInfo();
          const currentWallet = walletInfo?.address || "desconhecido";
          const currentNetwork = walletInfo?.networkName || "desconhecida";
          const currentChainId = walletInfo?.chainId || "desconhecido";
          
          throw new Error(
            `Você não tem permissão para atualizar as carteiras (endereço ${currentWallet} na rede ${currentNetwork}, ChainID: ${currentChainId}). ` +
            `Apenas o proprietário do contrato pode fazer isso. ` +
            `Verifique se você está conectado com a carteira correta e na rede BSC Testnet (ChainID: 97).`
          );
        }
      } catch (ownerError: any) {
        console.error("Erro ao verificar propriedade do contrato:", ownerError);
        
        // Se o erro for do método checkOwnership, mostrar informações adicionais
        if (ownerError.message.includes("não tem permissão")) {
          throw ownerError; // Use a mensagem melhorada que já criamos
        } else {
          // Obter informações da carteira para diagnóstico
          const walletInfo = web3Service.getWalletInfo();
          throw new Error(
            `Não foi possível verificar se você é o proprietário do contrato: ${ownerError.message}. ` +
            `Isso pode acontecer por várias razões: o contrato pode não estar acessível, ` +
            `você pode estar na rede errada (atual: ${walletInfo?.networkName || 'desconhecida'}, ChainID: ${walletInfo?.chainId || 'desconhecido'}), ` +
            `ou o método de verificação de propriedade não está disponível no contrato. ` +
            `Verifique se está conectado à rede BSC Testnet e tente novamente.`
          );
        }
      }
      
      // Adicionar verificação do gas limit nas transações
      const gasOptions = { 
        gasLimit: 300000  // Adicionando um gas limit manual para prevenir erro de estimativa
      };
      
      // Atualizar endereços no contrato com um mecanismo de retry
      const updateWithRetry = async (updateFunction: Function, ...params: any[]) => {
        try {
          return await updateFunction(...params, gasOptions);
        } catch (error: any) {
          console.error(`Erro na transação: ${error.message}`);
          
          // Se for um erro de gas limit, tentar aumentar o gas
          if (error.message.includes("UNPREDICTABLE_GAS_LIMIT")) {
            console.log("Tentando novamente com um gas limit maior...");
            const higherGasOptions = { gasLimit: 500000 };
            return await updateFunction(...params, higherGasOptions);
          } else {
            throw error;
          }
        }
      };

      // Atualizar endereços no contrato
      const updatePromises = [];
      
      // Atualizar endereço do feeCollector, se necessário
      if (feeCollectorAddress !== currentFeeCollector) {
        updatePromises.push(updateWithRetry(smartContractService.updateFeeCollector, feeCollectorAddress));
      }
      
      // Obter percentuais atuais para comparação
      const currentPercentages = await smartContractService.getDistributionPercentages();
      
      // Atualizar percentual da taxa principal, se necessário
      const contractFeePercentage = displayToContractPercentage(feePercentage);
      if (contractFeePercentage !== currentPercentages.feePercentage) {
        updatePromises.push(updateWithRetry(smartContractService.updateFeePercentage, contractFeePercentage));
      }
      
      // Atualizações de carteiras com tratamento específico para cada erro
      // Atualizar carteira de desenvolvimento
      try {
        await updateWithRetry(smartContractService.updateDevelopmentWallet, developmentWalletAddress);
      } catch (err: any) {
        console.error("Erro ao atualizar carteira de desenvolvimento:", err);
        setWalletUpdateError(`Erro ao atualizar carteira de desenvolvimento: ${err.message || "Verifique permissões e contrato"}`);
        // Continuamos com as outras operações mesmo se uma falhar
      }
      
      // Atualizar carteira de caridade
      try {
        await updateWithRetry(smartContractService.updateCharityWallet, charityWalletAddress);
      } catch (err: any) {
        console.error("Erro ao atualizar carteira de caridade:", err);
        setWalletUpdateError((prev) => 
          prev ? `${prev}, Erro na carteira de caridade` : `Erro ao atualizar carteira de caridade: ${err.message}`);
      }
      
      // Atualizar carteira de evolução
      try {
        await updateWithRetry(smartContractService.updateEvolutionWallet, evolutionWalletAddress);
      } catch (err: any) {
        console.error("Erro ao atualizar carteira de evolução:", err);
        setWalletUpdateError((prev) => 
          prev ? `${prev}, Erro na carteira de evolução` : `Erro ao atualizar carteira de evolução: ${err.message}`);
      }
      
      // Atualizar percentuais com tratamento de erro individual
      try {
        await updateWithRetry(smartContractService.updateDevelopmentPercentage, displayToContractPercentage(developmentPercentage));
        await updateWithRetry(smartContractService.updateCharityPercentage, displayToContractPercentage(charityPercentage));
        await updateWithRetry(smartContractService.updateEvolutionPercentage, displayToContractPercentage(evolutionPercentage));
      } catch (err: any) {
        console.error("Erro ao atualizar percentuais:", err);
        setWalletUpdateError((prev) => 
          prev ? `${prev}, Erro nos percentuais` : `Erro ao atualizar percentuais: ${err.message}`);
      }
      
      // Se não tivemos erros fatais, considerar como sucesso mesmo com avisos
      if (!walletUpdateError) {
        setWalletUpdateSuccess(true);
      }
      
      // Atualizar dados locais
      await fetchContractData();
      
      // Atualizar também o endereço da carteira principal no Firestore para manter consistência
      if (walletAddress !== feeCollectorAddress) {
        setWalletAddress(feeCollectorAddress);
        await updatePaymentConfig();
      }
    } catch (err: any) {
      console.error("Erro ao atualizar carteiras adicionais:", err);
      
      // Mensagens específicas para erros comuns
      if (err.message.includes("UNPREDICTABLE_GAS_LIMIT")) {
        setWalletUpdateError(
          "Erro ao estimar gas para a transação. Isso pode acontecer por várias razões: " +
          "1. Você não tem permissões para executar esta função no contrato; " +
          "2. Os parâmetros fornecidos são inválidos ou fora dos limites permitidos; " +
          "3. O contrato tem restrições adicionais (como pausas ou limites de tempo). " +
          "Verifique se você é o proprietário do contrato."
        );
      } else {
        setWalletUpdateError(err.message || "Erro ao atualizar carteiras e percentuais no contrato.");
      }
    } finally {
      setUpdatingWallets(false);
    }
  };

  // Função para verificar quem é o proprietário atual do contrato
  const checkContractOwner = async () => {
    try {
      setIsCheckingOwner(true);
      setWalletUpdateError(null);
      
      if (!walletConnected) {
        throw new Error("Conecte sua carteira primeiro para verificar o proprietário do contrato");
      }
      
      // Verificar se estamos na rede BSC Testnet
      const walletInfo = web3Service.getWalletInfo();
      if (!walletInfo || walletInfo.chainId !== 97) {
        throw new Error("Por favor, conecte-se à rede BSC Testnet (ChainID: 97) para verificar o proprietário do contrato");
      }
      
      // Inicializar contrato se necessário
      if (!smartContractService.isContractInitialized()) {
        await smartContractService.initializeContract();
      }
      
      // Obter endereço do proprietário diretamente do contrato
      const ownerAddress = await smartContractService.getContractOwner();
      setContractOwner(ownerAddress);
      
      // Verificar se o usuário atual é o proprietário
      const isOwner = await smartContractService.checkOwnership();
      
      if (isOwner) {
        setWalletUpdateSuccess(true);
        setWalletUpdateError(null);
      } else {
        setWalletUpdateError(
          `Você não é o proprietário do contrato. O proprietário atual é: ${ownerAddress}`
        );
      }
    } catch (err: any) {
      console.error("Erro ao verificar proprietário do contrato:", err);
      setWalletUpdateError(`Não foi possível verificar o proprietário do contrato: ${err.message}`);
    } finally {
      setIsCheckingOwner(false);
    }
  };

  // Verificar a soma total dos percentuais sempre que eles mudarem
  useEffect(() => {
    const total = feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
    setTotalPercentage(total);
    
    // Verificar e alertar se ultrapassar 30%
    if (total > 30) {
      setWalletUpdateError("Aviso: A soma total dos percentuais não deve ultrapassar 30%");
    } else if (walletUpdateError === "Aviso: A soma total dos percentuais não deve ultrapassar 30%") {
      setWalletUpdateError(null);
    }
  }, [feePercentage, developmentPercentage, charityPercentage, evolutionPercentage]);

  if (!hasPermission) {
    return (
      <div className="bg-red-800 border border-red-900 text-white px-4 py-3 rounded">
        <p>Você não tem permissão para acessar esta seção.</p>
      </div>
    );
  }

  return (
    <div className="bg-black/30 shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-orange-400">Web3 Payment Settings</h2>
      
      {error && (
        <div className="bg-red-800 border border-red-900 text-white px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {updateSuccess && (
        <div className="bg-green-800 border border-green-900 text-white px-4 py-3 rounded mb-4">
          <p>Payment settings updated successfully!</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Receiving Wallet */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="walletAddress">
            Receiving Wallet Address
          </label>
          <input
            id="walletAddress"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="0x..."
          />
          <p className="text-gray-400 text-xs mt-1">
            This address will receive all payments on the platform.
          </p>
        </div>
        
        {/* Service Fee */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="serviceFee">
            Service Fee (%)
          </label>
          <input
            id="serviceFee"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={serviceFee}
            onChange={(e) => setServiceFee(parseFloat(e.target.value))}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-gray-400 text-xs mt-1">
            Percentage charged as service fee on each transaction.
          </p>
        </div>
        
        {/* Transaction Timeout */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="transactionTimeout">
            Transaction Timeout (seconds)
          </label>
          <input
            id="transactionTimeout"
            type="number"
            min="10"
            value={transactionTimeout}
            onChange={(e) => setTransactionTimeout(parseInt(e.target.value))}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-gray-400 text-xs mt-1">
            Maximum time to wait for transaction confirmation.
          </p>
        </div>
        
        {/* Multiple Wallets Payment Distribution Section */}
        <div className="border-t border-gray-700 pt-6 mt-6">
          <h3 className="text-xl font-semibold mb-4 text-orange-400">Multi-Wallet Payment Distribution</h3>
          
          {walletUpdateError && (
            <div className="bg-red-800 border border-red-900 text-white px-4 py-3 rounded mb-4">
              <p>{walletUpdateError}</p>
            </div>
          )}
          
          {walletUpdateSuccess && (
            <div className="bg-green-800 border border-green-900 text-white px-4 py-3 rounded mb-4">
              <p>Wallet and percentage settings successfully updated in the contract!</p>
            </div>
          )}
          
          {contractOwner && (
            <div className="bg-blue-800 border border-blue-900 text-white px-4 py-3 rounded mb-4">
              <p>
                <strong>Contract owner:</strong> {contractOwner}
                {web3Service.getWalletInfo()?.address === contractOwner && (
                  <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    You are the owner!
                  </span>
                )}
              </p>
            </div>
          )}
          
          <p className="text-gray-400 mb-4">
            Configure up to four wallets to automatically distribute payments: 
            main fee collector (FeeCollector), development, charity, and evolution.
            The total sum of percentages cannot exceed 30%.
          </p>

          {/* Explanation about the remaining 70% */}
          <div className="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded mb-4">
            <h4 className="font-semibold mb-1">How fees work:</h4>
            <p className="text-sm text-gray-300">
              Of the total value of each transaction, a maximum of 30% is distributed among the wallets configured above.
              The remaining 70% always goes directly to the main recipient of the payment (for example,
              the seller of a product, the service provider, or the content creator).
            </p>
            <p className="text-sm text-gray-300 mt-2">
              This 30% limitation is implemented in the smart contract to protect users and ensure
              that most of the value always reaches the intended recipient.
            </p>
          </div>
          
          <div className="mb-4">
            {!walletConnected ? (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={connectWallet}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Connect Wallet to Manage Contracts
                </button>
                <p className="text-gray-400 text-xs mt-2">
                  You need to connect your wallet to interact with the smart contract.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-green-400 text-sm">
                    <span className="inline-block bg-green-900 rounded-full px-2 py-1 text-xs mr-2">Connected</span>
                    Wallet connected - you can configure payment distribution
                  </p>
                  
                  <button
                    type="button"
                    onClick={checkContractOwner}
                    disabled={isCheckingOwner}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
                  >
                    {isCheckingOwner ? 'Checking...' : 'Verify Contract Owner'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Main Fee Collector */}
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="feeCollectorAddress">
                      Main Fee Collector
                    </label>
                    <input
                      id="feeCollectorAddress"
                      type="text"
                      value={feeCollectorAddress}
                      onChange={(e) => setFeeCollectorAddress(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                    {currentFeeCollector && (
                      <p className="text-gray-400 text-xs mt-1">
                        Current address: <span className="font-mono">{currentFeeCollector}</span>
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="feePercentage">
                      Main Fee (%)
                    </label>
                    <input
                      id="feePercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={feePercentage}
                      onChange={(e) => setFeePercentage(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Base 1000: {feePercentage} = {(feePercentage / 10).toFixed(1)}%
                    </p>
                  </div>
                  
                  {/* Development Wallet */}
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="developmentWalletAddress">
                      Development Wallet
                    </label>
                    <input
                      id="developmentWalletAddress"
                      type="text"
                      value={developmentWalletAddress}
                      onChange={(e) => setDevelopmentWalletAddress(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="developmentPercentage">
                      Development Percentage (%)
                    </label>
                    <input
                      id="developmentPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={developmentPercentage}
                      onChange={(e) => setDevelopmentPercentage(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Base 1000: {developmentPercentage} = {(developmentPercentage / 10).toFixed(1)}%
                    </p>
                  </div>
                  
                  {/* Charity Wallet */}
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="charityWalletAddress">
                      Charity Wallet
                    </label>
                    <input
                      id="charityWalletAddress"
                      type="text"
                      value={charityWalletAddress}
                      onChange={(e) => setCharityWalletAddress(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="charityPercentage">
                      Charity Percentage (%)
                    </label>
                    <input
                      id="charityPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={charityPercentage}
                      onChange={(e) => setCharityPercentage(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Base 1000: {charityPercentage} = {(charityPercentage / 10).toFixed(1)}%
                    </p>
                  </div>
                  
                  {/* Evolution Wallet */}
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="evolutionWalletAddress">
                      Evolution Wallet
                    </label>
                    <input
                      id="evolutionWalletAddress"
                      type="text"
                      value={evolutionWalletAddress}
                      onChange={(e) => setEvolutionWalletAddress(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="evolutionPercentage">
                      Evolution Percentage (%)
                    </label>
                    <input
                      id="evolutionPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={evolutionPercentage}
                      onChange={(e) => setEvolutionPercentage(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Base 1000: {evolutionPercentage} = {(evolutionPercentage / 10).toFixed(1)}%
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-800 rounded">
                  <p className="text-white font-semibold">Total fees: {(totalPercentage / 10).toFixed(1)}%</p>
                  <div className="w-full bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${totalPercentage > 300 ? 'bg-red-500' : 'bg-green-500'} progress-bar dynamic-width`} 
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    The total sum must not exceed 300 (30%)
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleUpdateAdditionalWallets(e as any);
                  }}
                  disabled={updatingWallets}
                  className={`mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                    updatingWallets ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {updatingWallets ? 'Updating...' : 'Update Wallets and Percentages'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Seção de contratos */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-xl font-semibold mb-4 text-orange-400">Contract Addresses</h3>
          
          {/* Contrato Ethereum */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="ethContract">
              Ethereum Contract
            </label>
            <input
              id="ethContract"
              type="text"
              value={ethContract}
              onChange={(e) => setEthContract(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="0x..."
            />
          </div>
          
          {/* Contrato Polygon */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="polygonContract">
              Polygon Contract
            </label>
            <input
              id="polygonContract"
              type="text"
              value={polygonContract}
              onChange={(e) => setPolygonContract(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="0x..."
            />
          </div>
          
          {/* Contrato BSC */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="binanceContract">
              Binance Smart Chain Contract
            </label>
            <div className="flex gap-2">
              <input
                id="binanceContract"
                type="text"
                value={binanceContract}
                onChange={(e) => setBinanceContract(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0x..."
              />
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                onClick={() => setBinanceContract("0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B")}
                title="Preencher com endereço de teste BSC Testnet (Chain 97)"
              >
                Usar Testnet
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Use o botão para preencher automaticamente com um endereço de teste da BSC Testnet (Chain 97).
            </p>
          </div>

          {/* Contrato BSC Testnet */}
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="binanceTestnetContract">
              Binance Testnet Contract (Chain 97)
            </label>
            <div className="flex gap-2">
              <input
                id="binanceTestnetContract"
                type="text"
                value={binanceTestnetContract}
                onChange={(e) => setBinanceTestnetContract(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0x..."
              />
              <button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                onClick={handleSaveBinanceTestnetContract}
              >
                Salvar
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Endereço salvo em <code>contracts.binanceTestnet</code> no Firestore. Use para testes na BSC Testnet (Chain 97).
            </p>
            {binanceTestnetSaveStatus && (
              <div className={`mt-1 text-xs ${binanceTestnetSaveStatus.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{binanceTestnetSaveStatus}</div>
            )}
          </div>
        </div>
        
        {/* Informações das configurações atuais */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-300">Current System Configuration</h3>
          <div className="bg-black p-3 rounded overflow-auto">
            <pre className="text-sm text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(currentSystemConfig, null, 2)}
            </pre>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            These are the current system settings. Values saved in Firestore take precedence over values defined in the paymentConfig.ts file.
            {currentSystemConfig && currentSystemConfig.updatedAt && (
              <span> Last update: {currentSystemConfig.updatedAt}</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <button
            type="submit"
            disabled={isUpdating}
            className={`bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUpdating ? 'Updating...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentSettings;