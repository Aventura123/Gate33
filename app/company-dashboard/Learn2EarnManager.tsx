import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, serverTimestamp } from "firebase/firestore";
import { Learn2Earn, Learn2EarnTask } from "../../types/learn2earn";
import learn2earnContractService from "../../services/learn2earnContractService";
import { useWallet } from "../../components/WalletProvider";
import { ethers } from "ethers";
import "../../styles/learn2earn.css";

// Utility function to calculate progress percentage
const calculateProgressPercentage = (totalParticipants: number | undefined, tokenPerParticipant: number, tokenAmount: number): number => {
  return Math.min(100, Math.round((totalParticipants || 0) * tokenPerParticipant / tokenAmount * 100));
};

// Utility function to get the appropriate CSS class for progress bar
const getProgressBarClass = (percentage: number): string => {
  if (percentage === 0) return "progress-bar-fill-0"; // Usa classe com largura zero explícita
  if (percentage > 0 && percentage <= 10) return "progress-bar-1-10"; // 1-10%
  if (percentage <= 20) return "progress-bar-11-20";
  if (percentage <= 30) return "progress-bar-21-30";
  if (percentage <= 40) return "progress-bar-31-40";
  if (percentage <= 50) return "progress-bar-41-50";
  if (percentage <= 60) return "progress-bar-51-60";
  if (percentage <= 70) return "progress-bar-61-70";
  if (percentage <= 80) return "progress-bar-71-80";
  if (percentage <= 90) return "progress-bar-81-90";
  return "progress-bar-91-100";
};

interface Learn2EarnManagerProps {
  db: any;
  companyId: string;
  companyProfile: any;
}

const Learn2EarnManager: React.FC<Learn2EarnManagerProps> = ({
  db,
  companyId,
  companyProfile,
}) => {
  // --- Estados principais ---
  const [learn2earn, setLearn2Earn] = useState<Learn2Earn[]>([]);
  const [isLoadingLearn2Earn, setIsLoadingLearn2Earn] = useState(false);
  const [feePercent, setFeePercent] = useState<number>(5);
  const [learn2EarnSubTab, setLearn2EarnSubTab] = useState<'new' | 'my'>('my');
  const [learn2EarnStep, setLearn2EarnStep] = useState<'info' | 'tasks' | 'confirmation'>('info');
  // Estados de sincronização
  const [syncing, setSyncing] = useState(false);
  const [syncWarnings, setSyncWarnings] = useState<{id: string; msg: string}[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [nextSyncTime, setNextSyncTime] = useState<Date | null>(null);
  const [learn2earnData, setLearn2EarnData] = useState<Omit<Learn2Earn, 'id' | 'companyId'>>({
    title: "",
    description: "",
    tokenSymbol: "",
    tokenAmount: 0,
    tokenAddress: "",
    tokenPerParticipant: 0,
    totalParticipants: 0,
    maxParticipants: undefined,
    startDate: null,
    endDate: null,
    tasks: [],
    status: 'draft',
    contractAddress: "",
    transactionHash: "",
    socialLinks: { discord: "", telegram: "", twitter: "", website: "" },
    network: '',
  });
  const [currentTask, setCurrentTask] = useState<Omit<Learn2EarnTask, 'id'>>({
    type: 'content',
    title: "",
    description: "",
    contentText: "",
  });
  const [currentQuestionOptions, setCurrentQuestionOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [isDepositConfirmed, setIsDepositConfirmed] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);  const [availableNetworks, setAvailableNetworks] = useState<string[]>([]);
  const [isLoadingNetworks, setIsLoadingNetworks] = useState(false);
  // Acesse o contexto da carteira usando o hook useWallet
  const wallet = useWallet();

  const walletAddress = wallet.walletAddress;
  const handleConnectWallet = wallet.connectWallet;
  const currentNetwork = wallet.currentNetwork;
  // Se precisar de provider/signer para contratos, crie um utilitário no provider ou use um hook específico, igual aos outros componentes

  // --- Funções e useEffects principais (fetch, create, toggle, etc) ---

  // Função para alternar status (ativar/desativar) Learn2Earn
  const toggle = async (learn2earn: Learn2Earn, newStatus: 'active' | 'completed' | 'draft') => {
    try {
      const learn2EarnRef = doc(db,"learn2earn", learn2earn.id);
      await updateDoc(learn2EarnRef, { status: newStatus });
      fetchLearn2Earn(); // Refresh list
    }catch (error) {
      console.error("Error updating learn2earn status:", error);
      alert("Failed to update learn2earn status");
    }
  };

  // Função para buscar oportunidades Learn2Earn
  const fetchLearn2Earn = useCallback(async () => {
    if (!db || !companyId) return;
    setIsLoadingLearn2Earn(true);
    try {
      const learn2earnCollection = collection(db, "learn2earn");
      const q = query(learn2earnCollection, where("companyId", "==", companyId));
      const learn2earnSnapshot = await getDocs(q);
      const fetchedLearn2Earn: Learn2Earn[] = learn2earnSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Learn2Earn));
      setLearn2Earn(fetchedLearn2Earn);
    } catch (error) {
      console.error("Error fetching learn2earn:", error);
    } finally {
      setIsLoadingLearn2Earn(false);
    }
  }, [db, companyId]);

  // Efeito para buscar Learn2Earn ao ativar a aba
  useEffect(() => {
    fetchLearn2Earn();
  }, [fetchLearn2Earn]);

  // Função para buscar redes disponíveis
  const fetchAvailableNetworks = useCallback(async () => {
    setIsLoadingNetworks(true);
    try {
      const networks = await learn2earnContractService.getSupportedNetworks();
      setAvailableNetworks(networks);
    } catch (error) {
      setAvailableNetworks([]);
    } finally {
      setIsLoadingNetworks(false);
    }
  }, [learn2earnContractService]);  // Buscar redes ao ativar aba  
  useEffect(() => {
    fetchAvailableNetworks();
  }, [fetchAvailableNetworks]);
  
  // Função dummy para detalhes (placeholder)
  const fetchL2LStats = (l2lId: string) => {};
  // Função para sincronizar status
  const syncStatuses = useCallback(async () => {
    if (!learn2earn || learn2earn.length === 0) return;
    setSyncing(true);
    const warnings: {id:string; msg:string}[] = [];
    console.log(`Iniciando sincronização de Learn2Earn - ${new Date().toISOString()}`);
    for (const l2l of learn2earn) {
      try {
        let newStatus = l2l.status;
        const now = new Date();

        // Robust date parsing
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        try {
          if (l2l.startDate) {
            if (l2l.startDate instanceof Date && !isNaN(l2l.startDate.getTime())) {
              startDate = l2l.startDate;
            } else if (
              typeof l2l.startDate === "object" &&
              typeof (l2l.startDate as any).toDate === "function"
            ) {
              const d = (l2l.startDate as any).toDate();
              if (d instanceof Date && !isNaN(d.getTime())) startDate = d;
            } else if (typeof l2l.startDate === "string" || typeof l2l.startDate === "number") {
              const d = new Date(l2l.startDate);
              if (d instanceof Date && !isNaN(d.getTime())) startDate = d;
            }
          }
          if (l2l.endDate) {
            if (l2l.endDate instanceof Date && !isNaN(l2l.endDate.getTime())) {
              endDate = l2l.endDate;
            } else if (
              typeof l2l.endDate === "object" &&
              typeof (l2l.endDate as any).toDate === "function"
            ) {
              const d = (l2l.endDate as any).toDate();
              if (d instanceof Date && !isNaN(d.getTime())) endDate = d;
            } else if (typeof l2l.endDate === "string" || typeof l2l.endDate === "number") {
              const d = new Date(l2l.endDate);
              if (d instanceof Date && !isNaN(d.getTime())) endDate = d;
            }
          }
        } catch (dateErr) {
          warnings.push({id: l2l.id, msg: `Invalid date format for Learn2Earn: ${l2l.title}`});
          console.error("Date parse error for L2L", l2l, dateErr);
          continue;
        }

        // Defensive checks for participants
        const maxParticipants = typeof l2l.maxParticipants === "number" && !isNaN(l2l.maxParticipants) ? l2l.maxParticipants : undefined;
        const totalParticipants = typeof l2l.totalParticipants === "number" && !isNaN(l2l.totalParticipants) ? l2l.totalParticipants : 0;

        // Regra 1: Se ainda não começou
        if (startDate && now < startDate) {
          newStatus = "draft";
        }
        // Regra 2: Se já terminou (data ou participantes)
        else if (
          (endDate && now > endDate) ||
          (maxParticipants !== undefined && totalParticipants >= maxParticipants)
        ) {
          newStatus = "completed";
        }
        // Regra 3: Se está ativo (começou mas não terminou)
        else if (
          startDate && now >= startDate &&
          (!endDate || now <= endDate) &&
          (maxParticipants === undefined || totalParticipants < maxParticipants)
        ) {
          newStatus = "active";
        } else {
          // fallback defensivo
          newStatus = "draft";
        }

        if (l2l.status !== newStatus) {
          await updateDoc(doc(db, "learn2earn", l2l.id), { status: newStatus });
          warnings.push({id: l2l.id, msg: `Status updated: ${l2l.status} → ${newStatus}`});
          l2l.status = newStatus;
        }
      } catch (err) {
        warnings.push({id: l2l.id, msg: `Error synchronizing Learn2Earn status: ${l2l.title} (${err instanceof Error ? err.message : String(err)})`});
        console.error("Error in syncStatuses for L2L", l2l, err);
      }
    }
    setSyncWarnings(warnings);
    setSyncing(false);
    setLastSyncTime(new Date());
    return warnings;
  }, [learn2earn, db]);  // Efeito para executar sincronização ao carregar o componente
  useEffect(() => {
    syncStatuses();
  }, [syncStatuses]);
  
  // Sincronização automática à meia-noite
  useEffect(() => {
    // Função para calcular quando será a próxima meia-noite
    const getNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    };
    
    // Função para agendar a próxima sincronização
    const scheduleNextSync = () => {
      const nextMidnight = getNextMidnight();
      const timeUntilMidnight = nextMidnight.getTime() - Date.now();
      
      console.log(`Agendando próxima sincronização para ${nextMidnight.toLocaleString()}`);
      setNextSyncTime(nextMidnight);
      
      // Configura o timer para a próxima meia-noite
      const timer = setTimeout(() => {
        console.log("Executando sincronização automática à meia-noite");
        syncStatuses().then(() => {
          setLastSyncTime(new Date());
          scheduleNextSync(); // Agendar a próxima sincronização
        });
      }, timeUntilMidnight);
      
      return timer;
    };
    
    // Inicia o agendamento quando o componente é montado
    const timer = scheduleNextSync();
    
    // Limpa o timer quando o componente é desmontado
    return () => clearTimeout(timer);
  }, [syncStatuses]);
  
  // Sincronização automática à meia-noite
  useEffect(() => {
    // Função para calcular quando será a próxima meia-noite
    const getNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    };
    
    // Função para agendar a próxima sincronização
    const scheduleNextSync = () => {
      const nextMidnight = getNextMidnight();
      const timeUntilMidnight = nextMidnight.getTime() - Date.now();
      
      console.log(`Agendando próxima sincronização para ${nextMidnight.toLocaleString()}`);
      setNextSyncTime(nextMidnight);
      
      // Configura o timer para a próxima meia-noite
      const timer = setTimeout(() => {
        console.log("Executando sincronização automática à meia-noite");
        syncStatuses().then(() => {
          setLastSyncTime(new Date());
          scheduleNextSync(); // Agendar a próxima sincronização
        });
      }, timeUntilMidnight);
      
      return timer;
    };
    
    // Inicia o agendamento quando o componente é montado
    const timer = scheduleNextSync();
    
    // Limpa o timer quando o componente é desmontado
    return () => clearTimeout(timer);
  }, [syncStatuses]);
  // Handler para mudanças no formulário Learn2Earn
  const handleLearn2EarnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'tokenAmount' || name === 'totalParticipants' || name === 'tokenPerParticipant') {
      const numValue = value ? Number(value) : 0;
      const updatedData = {...learn2earnData, [name]: numValue};
      if ((name === 'tokenAmount' || name === 'tokenPerParticipant') && 
          updatedData.tokenAmount > 0 && updatedData.tokenPerParticipant > 0) {
        const calculatedMaxParticipants = Math.floor(updatedData.tokenAmount / updatedData.tokenPerParticipant);
        updatedData.maxParticipants = calculatedMaxParticipants;
      }
      setLearn2EarnData(updatedData);
    } else if (name === 'maxParticipants') {
      setLearn2EarnData({...learn2earnData, [name]: value ? Number(value) : undefined});
    } else {
      setLearn2EarnData({...learn2earnData, [name]: value ?? ""});
    }
  };

  // Handler para datas
  const handleDateChange = (name: 'startDate' | 'endDate', date: Date) => {
    setLearn2EarnData({...learn2earnData, [name]: date});
  };

  // Handler para adicionar tarefa
  const addTask = () => {
    if (!currentTask.title || !currentTask.description) {
      alert("Please fill in all task fields");
      return;
    }
    let newTask: Learn2EarnTask;
    if (currentTask.type === 'content') {
      newTask = {
        ...currentTask,
        id: Date.now().toString()
      };
    } else {
      newTask = {
        ...currentTask,
        id: Date.now().toString(),
        options: currentQuestionOptions,
        correctOption: correctOptionIndex // <-- deve ser number
      };
    }
    setLearn2EarnData({
      ...learn2earnData,
      tasks: [...learn2earnData.tasks, newTask]
    });
    setCurrentTask({
      type: 'content',
      description: "",
      contentText: "",
      title: ""
    });
    setCurrentQuestionOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
  };

  // Handler para remover tarefa
  const removeTask = (taskId: string) => {
    setLearn2EarnData({
      ...learn2earnData,
      tasks: learn2earnData.tasks.filter(task => task.id !== taskId)
    });
  };

  // Handler para mudanças no formulário de tarefa
  const handleTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentTask({ ...currentTask, [name]: value });
  };

  // Função para criar Learn2Earn
  const createLearn2Earn = async () => {
    if (!db || !companyId) {
      alert("Not authenticated. Please login again.");
      return;
    }
    if (!learn2earnData.title || !learn2earnData.description || 
        !learn2earnData.tokenSymbol || !learn2earnData.tokenAddress ||
        learn2earnData.tokenAmount <= 0 || learn2earnData.tokenPerParticipant <= 0 ||
        !learn2earnData.startDate || !learn2earnData.endDate || 
        learn2earnData.tasks.length === 0) {
      alert("Please fill in all required fields and add at least one task");
      return;
    }
    if (!learn2earnData.network) {
      alert("Please select a blockchain network");
      return;
    }
    if (learn2earnData.tokenPerParticipant > learn2earnData.tokenAmount) {
      alert("Tokens per participant cannot exceed total token amount");
      return;
    }
    setIsProcessingDeposit(true);
    setDepositError(null);
    try {
      if (!walletAddress) {
        await handleConnectWallet();
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!walletAddress) {
          throw new Error("Wallet connection is required to create a learn2earn opportunity");
        }
      }
      const normalizedNetwork = learn2earnData.network.trim().toLowerCase();
      const isApproved = await learn2earnContractService.checkTokenApproval(
        normalizedNetwork,
        learn2earnData.tokenAddress
      );
      if (!isApproved) {
        alert("You need to approve the token first. Please confirm the approval transaction in your wallet.");
        await learn2earnContractService.approveToken(
          normalizedNetwork,
          learn2earnData.tokenAddress
        );
      }
      const learn2earnFirebaseId = `learn2earn_${Date.now()}`;
      let startDate: Date, endDate: Date;
      if (learn2earnData.startDate) {
        if (typeof learn2earnData.startDate === 'object') {
          if ('toDate' in learn2earnData.startDate && typeof learn2earnData.startDate.toDate === 'function') {
            startDate = learn2earnData.startDate.toDate();
          } else if (learn2earnData.startDate instanceof Date) {
            startDate = learn2earnData.startDate;
          } else {
            startDate = new Date(Date.now() + 5 * 60 * 1000);
          }
        } else if (typeof learn2earnData.startDate === 'string') {
          startDate = new Date(learn2earnData.startDate);
        } else {
          startDate = new Date(Date.now() + 5 * 60 * 1000);
        }
      } else {
        startDate = new Date(Date.now() + 5 * 60 * 1000);
      }
      if (learn2earnData.endDate) {
        if (typeof learn2earnData.endDate === 'object') {
          if ('toDate' in learn2earnData.endDate && typeof learn2earnData.endDate.toDate === 'function') {
            endDate = learn2earnData.endDate.toDate();
          } else if (learn2earnData.endDate instanceof Date) {
            endDate = learn2earnData.endDate;
          } else {
            endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
          }
        } else if (typeof learn2earnData.endDate === 'string') {
          endDate = new Date(learn2earnData.endDate);
        } else {
          endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);
        }
      } else {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
      }
      const now = new Date();
      const minStartTime = new Date(now.getTime() + 5 * 60 * 1000);
      if (startDate < now) {
        startDate = minStartTime;
      }
      const endBuffer = 1 * 60 * 60 * 1000;
      const adjustedEndDate = new Date(endDate.getTime() + endBuffer);
      const depositResult = await learn2earnContractService.createLearn2Earn(
        normalizedNetwork,
        learn2earnFirebaseId,
        learn2earnData.tokenAddress,
        learn2earnData.tokenAmount,
        startDate,
        endDate,
        learn2earnData.maxParticipants || 0
      );
      if (!depositResult.success) {
        if (depositResult.notSupported) {
          throw new Error(`The selected network (${normalizedNetwork}) is not currently supported for learn2earn opportunities.`);
        }
        else if (depositResult.insufficientBalance) {
          throw new Error(`You don't have enough tokens. You have ${depositResult.currentBalance} but need ${depositResult.requiredAmount} ${learn2earnData.tokenSymbol}.`);
        }
        else if (depositResult.insufficientAllowance) {
          throw new Error(`The contract doesn't have permission to use your tokens. Please try approving the tokens again.`);
        }
        else if (depositResult.insufficientFee) {
          const feeAmount = depositResult.feeAmount ? depositResult.feeAmount : (learn2earnData.tokenAmount * feePercent / 100);
          throw new Error(`You need additional ${feeAmount} ${learn2earnData.tokenSymbol} to cover the platform fee.`);
        }
        else if (depositResult.executionReverted) {
          throw new Error(`Transaction would fail: ${depositResult.message || "Unknown contract error"}. Please check your wallet and try again.`);
        }
        throw new Error(depositResult.message || "Failed to create learn2earn opportunity. Please check your wallet and try again.");
      }
      const learn2earnCollection = collection(db, "learn2earn");
      const newLearn2Earn = {
        ...learn2earnData,
        companyId,
        status: 'active',
        transactionHash: depositResult.transactionHash,
        learn2earnId: depositResult.learn2earnId,
        contractAddress: depositResult.contractAddress || learn2earnData.tokenAddress,
        blockNumber: depositResult.blockNumber,
        firebaseId: learn2earnFirebaseId,
        network: normalizedNetwork,
        createdAt: new Date()
      };
      await addDoc(learn2earnCollection, newLearn2Earn);
      const notificationsCollection = collection(db, "adminNotifications");
      await addDoc(notificationsCollection, {
        type: "learn2earn",
        message: `New learn2earn opportunity created by ${companyProfile.name}: ${learn2earnData.title}`,
        companyId,
        learn2earnId: depositResult.learn2earnId,
        tokenAmount: learn2earnData.tokenAmount,
        tokenSymbol: learn2earnData.tokenSymbol,
        transactionHash: depositResult.transactionHash,
        read: false,
        createdAt: new Date()
      });
      resetLearn2EarnForm();
      fetchLearn2Earn();
      setLearn2EarnStep('confirmation');
    } catch (error: any) {
      console.error("Error creating learn2earn:",error);
      setDepositError(error.message || "Failed to create learn2earn opportunity. Please check your wallet and try again.");
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  // Função para resetar o formulário
  const resetLearn2EarnForm = () => {
    // Pode ser implementado conforme necessário
  };

  // Helper to format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (timestamp instanceof Date) return timestamp.toLocaleDateString();
    if (typeof timestamp === "object" && typeof timestamp.toDate === "function") {
      const d = timestamp.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d.toLocaleDateString();
    }
    if (typeof timestamp === "string" || typeof timestamp === "number") {
      const d = new Date(timestamp);
      if (d instanceof Date && !isNaN(d.getTime())) return d.toLocaleDateString();
    }
    return 'N/A';
  };

  // --- Renderização principal ---
  return (
    <div>
      {/* Tabs to switch between "My L2L" and "New L2L" */}
      <div className="flex mb-6">
        <button
          onClick={() => setLearn2EarnSubTab('my')}
          className={`py-2 px-6 font-medium ${
            learn2EarnSubTab === 'my'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-orange-300'
          }`}
        >
          My Learn2Earn
        </button>
        <button
          onClick={() => setLearn2EarnSubTab('new')}
          className={`py-2 px-6 font-medium ${
            learn2EarnSubTab === 'new'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-orange-300'
          }`}
        >
          New Learn2Earn
        </button>
      </div>
      {/* Render the appropriate subcomponent based on the selected subtab */}
      {learn2EarnSubTab === 'new' ? (
        // --- renderNewLearn2Earn migrated JSX ---
        isLoadingLearn2Earn ? (
          <p className="text-gray-300 py-4">Loading...</p>
        ) : learn2EarnStep === 'info' ? (
          <div className="bg-black/50 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold text-orange-500 mb-4">Create New Learn2Earn</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              setLearn2EarnStep('tasks');
            }}>
              {/* Blockchain Network */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Blockchain Network</label>
                <select
                  name="network"
                  value={learn2earnData.network}
                  onChange={handleLearn2EarnChange}
                  className="w-full bg-black/50 border border-orange-500 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                  disabled={isLoadingNetworks}
                >
                  <option value="">Select Network</option>
                  {isLoadingNetworks ? (
                    <option value="" disabled>Loading networks...</option>
                  ) : availableNetworks.length > 0 ? (
                    availableNetworks.map((network) => (
                      <option key={network} value={network}>
                        {network.charAt(0).toUpperCase() + network.slice(1)}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No networks available</option>
                  )}
                </select>
                {availableNetworks.length === 0 && !isLoadingNetworks && (
                  <div className="text-red-500 text-sm mt-1">
                    <p>No blockchain networks with configured contracts available.</p>
                    <button
                      onClick={() => {
                        setIsLoadingNetworks(true);
                        learn2earnContractService.resetService().then(() => {
                          fetchAvailableNetworks();
                        }).catch((error: Error) => {
                          console.error("Error resetting service:", error);
                        }).finally(() => {
                          setIsLoadingNetworks(false);
                        });
                      }}
                      className="mt-2 text-white bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded text-xs"
                      disabled={isLoadingNetworks}
                    >
                      {isLoadingNetworks ? 'Loading...' : 'Reload Networks'}
                    </button>
                  </div>
                )}
              </div>
              {/* Title */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Learn2Earn Title</label>
                <input
                  type="text"
                  name="title"
                  value={learn2earnData.title}
                  onChange={handleLearn2EarnChange}
                  placeholder="e.g., Community Token Distribution"
                  className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  required
                />
              </div>
              {/* Description */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Description</label>
                <textarea
                  name="description"
                  value={learn2earnData.description}
                  onChange={handleLearn2EarnChange}
                  placeholder="Describe your learn2earn opportunity and what users can get"
                  className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white h-32"
                  required
                ></textarea>
              </div>
              {/* Token Symbol & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-300 mb-2">Token Symbol</label>
                  <input
                    type="text"
                    name="tokenSymbol"
                    value={learn2earnData.tokenSymbol}
                    onChange={handleLearn2EarnChange}
                    placeholder="e.g., ETH, USDT"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Token Contract Address</label>
                  <input
                    type="text"
                    name="tokenAddress"
                    value={learn2earnData.tokenAddress}
                    onChange={handleLearn2EarnChange}
                    placeholder="e.g., 0x1234..."
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                    required
                  />
                </div>
              </div>
              {/* Token Amount & Per Participant */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-300 mb-2">Total Token Amount</label>
                  <input
                    type="number"
                    name="tokenAmount"
                    value={learn2earnData.tokenAmount || ''}
                    onChange={handleLearn2EarnChange}
                    placeholder="Total amount of tokens to distribute"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                    required
                    min="0"
                    step="0.000001"
                  />
                  <p className="text-xs text-gray-400 mt-1">Fee: {feePercent}% of total tokens</p>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Tokens Per Participant</label>
                  <input
                    type="number"
                    name="tokenPerParticipant"
                    value={learn2earnData.tokenPerParticipant || ''}
                    onChange={handleLearn2EarnChange}
                    placeholder="Amount each participant will receive"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                    required
                    min="0"
                    step="0.000001"
                  />
                </div>
              </div>
              {/* Start Date */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={learn2earnData.startDate ?
                    (learn2earnData.startDate instanceof Date ?
                      learn2earnData.startDate.toISOString().split('T')[0] :
                      new Date(learn2earnData.startDate as any).toISOString().split('T')[0])
                    : ''}
                  onChange={(e) => handleDateChange('startDate', new Date(e.target.value))}
                  className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  required
                />
              </div>
              {/* End Date */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={learn2earnData.endDate ?
                    (learn2earnData.endDate instanceof Date ?
                      learn2earnData.endDate.toISOString().split('T')[0] :
                      new Date(learn2earnData.endDate as any).toISOString().split('T')[0])
                    : ''}
                  onChange={(e) => handleDateChange('endDate', new Date(e.target.value))}
                  className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  required
                />
              </div>
              {/* Max Participants (readonly, calculated) */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Max Participants (calculated automatically)</label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={learn2earnData.maxParticipants || ''}
                  onChange={handleLearn2EarnChange}
                  placeholder="Leave empty for unlimited"
                  className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  min="1"
                  readOnly
                />
                {learn2earnData.tokenAmount > 0 && learn2earnData.tokenPerParticipant > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Maximum of {Math.floor(learn2earnData.tokenAmount / learn2earnData.tokenPerParticipant)} participants based on token distribution
                  </p>
                )}
              </div>
              {/* Social Links */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Social Links (optional)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="url"
                    name="website"
                    value={learn2earnData.socialLinks?.website || ''}
                    onChange={e => setLearn2EarnData({
                      ...learn2earnData,
                      socialLinks: { ...learn2earnData.socialLinks, website: e.target.value }
                    })}
                    placeholder="Website"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                  <input
                    type="text"
                    name="twitter"
                    value={learn2earnData.socialLinks?.twitter || ''}
                    onChange={e => setLearn2EarnData({
                      ...learn2earnData,
                      socialLinks: { ...learn2earnData.socialLinks, twitter: e.target.value }
                    })}
                    placeholder="Twitter"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                  <input
                    type="text"
                    name="telegram"
                    value={learn2earnData.socialLinks?.telegram || ''}
                    onChange={e => setLearn2EarnData({
                      ...learn2earnData,
                      socialLinks: { ...learn2earnData.socialLinks, telegram: e.target.value }
                    })}
                    placeholder="Telegram"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                  <input
                    type="text"
                    name="discord"
                    value={learn2earnData.socialLinks?.discord || ''}
                    onChange={e => setLearn2EarnData({
                      ...learn2earnData,
                      socialLinks: { ...learn2earnData.socialLinks, discord: e.target.value }
                    })}
                    placeholder="Discord"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                </div>
              </div>
              {/* Next Button */}
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 transition-colors"
                >
                  Next: Add Tasks
                </button>
              </div>
            </form>
          </div>
        ) : learn2EarnStep === 'tasks' ? (
          <div className="bg-black/50 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold text-orange-500 mb-4">Add Learning Tasks</h3>
            {learn2earnData.tasks.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xl font-medium text-white mb-2">Current Tasks</h4>
                <ul className="space-y-2">
                  {learn2earnData.tasks.map((task, index) => (
                    <li key={index} className="bg-black/30 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium">{task.title}</p>
                        <p className="text-sm text-gray-400">{task.type === 'content' ? 'Educational Content' : 'Quiz Question'}</p>
                      </div>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Task Type</label>
              <select
                value={currentTask.type}
                onChange={(e) => setCurrentTask({...currentTask, type: e.target.value as 'content' | 'question'})}
                className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              >
                <option value="content">Educational Content</option>
                <option value="question">Quiz Question</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Task Title</label>
              <input
                type="text"
                name="title"
                value={currentTask.title}
                onChange={handleTaskChange}
                placeholder="e.g., Learn About Blockchain"
                className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Task Description</label>
              <input
                type="text"
                name="description"
                value={currentTask.description}
                onChange={handleTaskChange}
                placeholder="Brief description of what the user will learn"
                className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
              />
            </div>

            {currentTask.type === 'content' ? (
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">Educational Content</label>
                <textarea
                  name="contentText"
                  value={currentTask.contentText}
                  onChange={handleTaskChange}
                  placeholder="Enter educational content or paste a video URL"
                  className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white h-32"
                ></textarea>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Question</label>
                  <input
                    type="text"
                    name="question"
                    value={currentTask.question || ''}
                    onChange={handleTaskChange}
                    placeholder="Enter your quiz question"
                    className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-300 mb-2">Options</label>
                  {currentQuestionOptions.map((option, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <input
                        type="radio"
                        id={`option-${index}`}
                        name="correctOption"
                        checked={correctOptionIndex === index}
                        onChange={() => setCorrectOptionIndex(index)}
                        className="mr-2"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...currentQuestionOptions];
                          newOptions[index] = e.target.value;
                          setCurrentQuestionOptions(newOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 bg-black/50 border border-gray-700 rounded p-2 text-white"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Deposit Information */}
            <div className="mb-4 bg-black/30 border border-orange-500/30 p-3 rounded-lg">
              <h4 className="text-lg font-medium text-white mb-2">Deposit Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400">Token</div>
                  <div className="text-sm font-medium text-white">
                    {learn2earnData.tokenAmount} {learn2earnData.tokenSymbol}
                  </div>
                  <div className="text-xs text-gray-500 break-all">
                    {learn2earnData.tokenAddress?.substring(0, 8)}...{learn2earnData.tokenAddress?.substring(learn2earnData.tokenAddress.length - 6)}
                  </div>
                </div>
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400">Participants</div>
                  <div className="text-sm font-medium text-white">
                    {learn2earnData.maxParticipants || 'Unlimited'}
                    <span className="text-xs text-gray-400 ml-1">({learn2earnData.tokenPerParticipant} {learn2earnData.tokenSymbol}/user)</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400">Start</div>
                  <div className="text-sm font-medium text-white">
                    {learn2earnData.startDate ? new Date(learn2earnData.startDate as any).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400">End</div>
                  <div className="text-sm font-medium text-white">
                    {learn2earnData.endDate ? new Date(learn2earnData.endDate as any).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400">Fee ({feePercent}%)</div>
                  <div className="text-sm font-medium text-white">
                    {(learn2earnData.tokenAmount * feePercent / 100).toFixed(6)}
                  </div>
                </div>
                <div className="bg-black/50 p-2 rounded-md">
                  <div className="text-xs text-gray-400 font-bold">Total Deposit</div>
                  <div className="text-sm font-medium text-orange-400">
                    {(learn2earnData.tokenAmount + (learn2earnData.tokenAmount * feePercent / 100)).toFixed(6)}
                  </div>
                </div>
              </div>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="deposit-confirmation"
                  className="mr-2 h-4 w-4"
                  checked={isDepositConfirmed}
                  onChange={(e) => setIsDepositConfirmed(e.target.checked)}
                />
                <label htmlFor="deposit-confirmation" className="text-white text-xs">
                  I confirm the deposit information and understand that tokens will be transferred from my wallet
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={addTask}
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
              >
                Add Task
              </button>
              <div>
                <button
                  onClick={() => setLearn2EarnStep('info')}
                  className="bg-gray-700 text-white py-2 px-4 mr-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={createLearn2Earn}
                  disabled={learn2earnData.tasks.length === 0 || !isDepositConfirmed}
                  className={`bg-orange-500 text-white py-2 px-6 rounded transition-colors ${
                    learn2earnData.tasks.length === 0 || !isDepositConfirmed
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-orange-600'
                  }`}
                >
                  Create Learn2Earn
                </button>
              </div>
            </div>
          </div>
        ) : learn2EarnStep === 'confirmation' ? (
          <div className="bg-black/50 p-6 rounded-lg text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-2xl font-semibold text-white mb-2">Learn2Earn Created Successfully!</h3>
            <p className="text-gray-300 mb-6">Your Learn2Earn opportunity is now live and ready for participants.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setLearn2EarnStep('info');
                  setLearn2EarnSubTab('my');
                  fetchLearn2Earn();
                }}
                className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 transition-colors"
              >
                View My Learn2Earn
              </button>
              <button
                onClick={() => {
                  setLearn2EarnStep('info');
                  fetchLearn2Earn();
                }}
                className="bg-gray-700 text-white py-2 px-6 rounded hover:bg-gray-600 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        ) : null
      ) : (
        // --- renderMyLearn2Earn migrated JSX ---
        isLoadingLearn2Earn || syncing ? (
          <p className="text-gray-300 py-4">Loading & synchronizing Learn2Earn opportunities...</p>
        ) : (          <div>
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-orange-500">Your Learn2Earn Opportunities</h3>
                <button
                  onClick={() => {
                    setLearn2EarnSubTab('new');
                    setLearn2EarnStep('info');
                  }}
                  className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600"
                >
                  Create New Learn2Earn
                </button>
              </div>
              {learn2earn.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300">You haven't created any Learn2Earn opportunities yet.</p>
                  <button
                    onClick={() => {
                      setLearn2EarnSubTab('new');
                      setLearn2EarnStep('info');
                    }}
                    className="mt-4 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
                  >
                    Create Your First Learn2Earn
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {learn2earn.map((item) => (
                    <div key={item.id} className="bg-black/30 p-6 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xl font-medium text-orange-300">{item.title}</h4>
                          <div className="mt-2">
                            <p className="text-gray-300">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            item.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            item.status === 'completed' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black/20 p-3 rounded-md">
                          <div className="text-sm text-gray-400">Token</div>
                          <div className="text-lg font-medium text-white">
                            {item.tokenAmount} {item.tokenSymbol}
                          </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-md">
                          <div className="text-sm text-gray-400">Reward Per User</div>
                          <div className="text-lg font-medium text-white">
                            {item.tokenPerParticipant} {item.tokenSymbol}
                          </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-md">
                          <div className="text-sm text-gray-400">Participants</div>
                          <div className="text-lg font-medium text-white">
                            {item.totalParticipants || 0} / {item.maxParticipants || '∞'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/20 p-3 rounded-md">
                          <div className="text-sm text-gray-400">Start Date</div>
                          <div className="text-white">
                            {formatDate(item.startDate)}
                          </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-md">
                          <div className="text-sm text-gray-400">End Date</div>
                          <div className="text-white">
                            {formatDate(item.endDate)}
                          </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-md col-span-1 md:col-span-2">
                          <div className="text-sm text-gray-400">Network</div>
                          <div className="flex items-center">
                            <span className="bg-gray-700 text-xs px-2 py-1 rounded mr-2">
                              {(item.network ?? "N/A").toUpperCase()}
                            </span>
                            {item.contractAddress && (
                              <span className="text-xs text-gray-400 truncate">
                                Contract: {item.contractAddress.substring(0, 8)}...{item.contractAddress.substring(item.contractAddress.length - 6)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex space-x-2 justify-end">
                        {item.status === 'draft' ? (
                          <button 
                            onClick={() => toggle(item, 'active')}
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
                          >
                            Activate
                          </button>
                        ) : item.status === 'active' ? (
                          <button 
                            onClick={() => toggle(item, 'completed')}
                            className="bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700"
                          >
                            End Campaign
                          </button>
                        ) : null}
                        <button
                          onClick={() => fetchL2LStats(item.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                        >
                          View Details
                        </button>                      </div>                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Token Distribution Progress</span>
                          <span>
                            {calculateProgressPercentage(item.totalParticipants, item.tokenPerParticipant, item.tokenAmount)}%
                          </span>
                        </div>                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          {/* Use classes CSS específicas baseadas na porcentagem */}
                          {(() => {
                            const percentage = calculateProgressPercentage(item.totalParticipants, item.tokenPerParticipant, item.tokenAmount);
                            let widthClass = 'progress-bar-fill-0';
                            
                            if (percentage > 0) {
                              if (percentage <= 25) widthClass = 'progress-bar-fill-25';
                              else if (percentage <= 50) widthClass = 'progress-bar-fill-50';
                              else if (percentage <= 75) widthClass = 'progress-bar-fill-75';
                              else widthClass = 'progress-bar-fill-100';
                            }
                            
                            return (                              <div 
                                className={`bg-orange-500 h-2.5 rounded-full ${widthClass}`}
                                aria-label={`Progress: ${percentage}%`}
                              ></div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Learn2EarnManager;
