"use client";

import React, { useState, useEffect } from 'react';
import { web3Service, NetworkType } from '../services/web3Service';

// Helper function to get network color
const getNetworkColor = (network: NetworkType): string => {
  switch (network) {
    case 'ethereum': return 'blue';
    case 'polygon': return 'purple';
    case 'binance': return 'yellow';
    default: return 'gray';
  }
};

// Helper function to get network details
const getNetworkDetails = (network: NetworkType) => {
  switch (network) {
    case 'ethereum':
      return {
        name: 'Ethereum Mainnet',
        nativeCurrency: 'ETH',
        color: 'blue'
      };
    case 'polygon':
      return {
        name: 'Polygon Mainnet',
        nativeCurrency: 'MATIC',
        color: 'purple'
      };
    case 'binance':
      return {
        name: 'Binance Smart Chain',
        nativeCurrency: 'BNB',
        color: 'yellow'
      };
    default:
      return {
        name: network.charAt(0).toUpperCase() + network.slice(1),
        nativeCurrency: '...',
        color: 'gray'
      };
  }
};

// NetworkStatusIndicator component for better visual feedback
const NetworkStatusIndicator: React.FC<{
  isLoading: boolean;
  networkType: NetworkType;
}> = ({ isLoading, networkType }) => {
  const color = getNetworkColor(networkType);
  
  if (!isLoading) return null;
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full border-2 border-orange-400">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mb-4"></div>
          <h3 className="text-lg font-medium mb-2 text-orange-600">Switching Network</h3>
          <p className="text-gray-700 text-center mb-2">
            Connecting to <span className="font-semibold text-orange-600">{networkType.charAt(0).toUpperCase() + networkType.slice(1)}</span> network...
          </p>
          <p className="text-xs bg-orange-50 p-2 rounded-md border border-orange-100 text-gray-600 text-center mt-2 w-full">
            Please approve the request in your wallet if prompted
          </p>
        </div>
      </div>
    </div>
  );
};

// Network Overview component to show after successful network switch
const NetworkOverview: React.FC<{
  networkType: NetworkType;
  showSuccess: boolean;
  onClose: () => void;
}> = ({ networkType, showSuccess, onClose }) => {
  const networkDetails = getNetworkDetails(networkType);
  
  if (!showSuccess) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-xl rounded-lg p-4 max-w-xs w-full z-50 border border-green-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-800">Rede Alterada</h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600"
          aria-label="Fechar notificação"
          title="Fechar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center mb-2">
        <div className={`w-3 h-3 rounded-full bg-${networkDetails.color}-500 mr-2`}></div>
        <span className="text-sm font-medium">{networkDetails.name}</span>
      </div>
      <p className="text-xs text-gray-500">
        Você está agora conectado à rede {networkDetails.name}. Moeda nativa: {networkDetails.nativeCurrency}.
      </p>
        </div>
      );
    };

interface WalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

const WalletButton: React.FC<WalletButtonProps> = ({ 
  onConnect, 
  onDisconnect,
  className = ""
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showNetworkSuccess, setShowNetworkSuccess] = useState(false);  const [availableNetworks, setAvailableNetworks] = useState<NetworkType[]>(["ethereum", "polygon", "binance"]);
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>("ethereum");
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [pendingNetworkSwitch, setPendingNetworkSwitch] = useState<NetworkType | null>(null);

  useEffect(() => {
    // Map or validate networkName to ensure it matches NetworkType
    const checkConnection = async () => {
      if (web3Service.isWalletConnected()) {
        const walletInfo = web3Service.getWalletInfo();
        if (walletInfo) {
          setIsConnected(true);
          setWalletAddress(walletInfo.address);
          const validNetwork = availableNetworks.includes(walletInfo.networkName as NetworkType)
            ? (walletInfo.networkName as NetworkType)
            : "ethereum"; // Default to a valid NetworkType
          setCurrentNetwork(validNetwork);

          if (onConnect) {
            onConnect(walletInfo.address);
          }
        }
      }
    };

    checkConnection();

    // Adicionar evento para detectar mudanças de conta
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // Usuário desconectou a conta
          handleDisconnect();
        } else {
          // Usuário trocou para outra conta
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          
          if (onConnect) {
            onConnect(accounts[0]);
          }
        }
      });

      // Detectar mudança de rede
      window.ethereum.on('chainChanged', () => {
        // Recarregar a página quando a rede mudar
        window.location.reload();
      });
    }

    // Cleanup dos listeners
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [onConnect, onDisconnect]);
  useEffect(() => {
    if (isConnected) {
      const walletInfo = web3Service.getWalletInfo();
      if (walletInfo) {
        const validNetwork = availableNetworks.includes(walletInfo.networkName as NetworkType)
          ? (walletInfo.networkName as NetworkType)
          : "ethereum"; // Default to a valid NetworkType
        setCurrentNetwork(validNetwork);
      }
    }
  }, [isConnected]);
  // Efeito para lidar com a reconexão automática do WalletConnect
  useEffect(() => {
    const handleReconnection = async () => {
      if (needsReconnect && pendingNetworkSwitch) {
        try {
          setError('Sessão expirada. Reconectando a carteira...');
          
          // Fechar modal de redes enquanto reconecta para evitar confusão
          setShowNetworkModal(false);
          
          console.log('Iniciando reconexão automática da carteira WalletConnect...');
          
          // Reconectar WalletConnect
          const walletInfo = await web3Service.connectWalletConnect();
          // LOGAR provider e sessão após reconexão
          console.log('[WalletButton] Após reconexão: wcV2Provider', web3Service.wcV2Provider);
          console.log('[WalletButton] Após reconexão: wcV2Provider.session', web3Service.wcV2Provider?.session);
          if (!web3Service.wcV2Provider || !web3Service.wcV2Provider.session || !web3Service.wcV2Provider.session.accounts || web3Service.wcV2Provider.session.accounts.length === 0) {
            setError('A sessão WalletConnect não está ativa. Abra o app da sua carteira e conecte novamente.');
            setIsLoading(false);
            setNeedsReconnect(false);
            setPendingNetworkSwitch(null);
            return;
          }
          setIsConnected(true);
          setWalletAddress(walletInfo.address);
          
          // Pequeno atraso para garantir que a conexão foi estabelecida
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Tentar novamente a troca de rede após reconexão
          setError('Carteira reconectada. Aplicando troca de rede...');
          await web3Service.attemptProgrammaticNetworkSwitch(pendingNetworkSwitch);
          setCurrentNetwork(pendingNetworkSwitch);
          
          // Limpar estado de reconexão
          setPendingNetworkSwitch(null);
          setNeedsReconnect(false);
          setError(null);
          
          // Notificar outros componentes da aplicação sobre a mudança
          window.dispatchEvent(new CustomEvent('networkChanged', {
            detail: { network: pendingNetworkSwitch, forced: !!web3Service.wcV2Provider }
          }));
          
          console.log(`Reconectado com sucesso e trocado para rede ${pendingNetworkSwitch}`);
        } catch (err: any) {
          console.error('Erro durante reconexão automática:', err);
          
          // Fornecer orientação específica baseada no tipo de erro
          if (err.message?.includes('User closed') || 
              err.message?.includes('User rejected') || 
              err.message?.includes('rejected') ||
              err.message?.includes('cancelou')) {
            setError('A reconexão foi cancelada. Tente conectar sua carteira novamente.');
          } 
          else if (err.message?.includes('timeout') || 
                   err.message?.includes('timed out') || 
                   err.message?.includes('tempo esgotado')) {
            setError('Tempo esgotado na reconexão. Verifique se seu aplicativo de carteira está aberto e tente novamente.');
          }
          else {
            setError(`Falha na reconexão: ${err.message}. Por favor, troque de rede manualmente na sua carteira.`);
          }
          
          setPendingNetworkSwitch(null);
          setNeedsReconnect(false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (needsReconnect && pendingNetworkSwitch) {
      handleReconnection();
    }
    
  // Registrar listener para eventos de troca de rede bem-sucedida
    const handleNetworkSwitched = (event: any) => {
      const { networkType, chainId, name } = event.detail;
      console.log(`Evento de troca de rede detectado: ${name} (${chainId})`);
      setCurrentNetwork(networkType);
      setError(null);
      setIsLoading(false);
      setPendingNetworkSwitch(null);
      setShowNetworkSuccess(true);
      
      // Close the network modal only after successful network switch
      setShowNetworkModal(false);
      
      console.log('[WalletButton] Rede trocada com sucesso, modal fechado');
    };
    
    window.addEventListener('web3NetworkSwitched', handleNetworkSwitched);
    
    return () => {
      window.removeEventListener('web3NetworkSwitched', handleNetworkSwitched);
    };
  }, [needsReconnect, pendingNetworkSwitch]);

  // Ensure networkName is validated or mapped to NetworkType
  const handleConnectMetaMask = async () => {
    setIsLoading(true);
    setError(null);
    setShowWalletOptions(false);
    try {
      const walletInfo = await web3Service.connectWallet();
      setIsConnected(true);
      setWalletAddress(walletInfo.address);

      // Validate or map networkName to NetworkType
      const validNetwork = availableNetworks.find(
        (network) => network === walletInfo.networkName
      ) || "ethereum"; // Default to a valid NetworkType

      setCurrentNetwork(validNetwork as NetworkType);      if (onConnect) {
        onConnect(walletInfo.address);
      }
      
      // Dispatch event to notify other components about wallet connection
      window.dispatchEvent(new CustomEvent('walletConnected', { 
        detail: { address: walletInfo.address, network: validNetwork } 
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Error connecting wallet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWalletConnect = async () => {
    setIsLoading(true);
    setError(null);
    setShowWalletOptions(false);
    try {
      const walletInfo = await web3Service.connectWalletConnect();
      setIsConnected(true);
      setWalletAddress(walletInfo.address);

      // Validate or map networkName to NetworkType
      const validNetwork = availableNetworks.find(
        (network) => network === walletInfo.networkName
      ) || "ethereum"; // Default to a valid NetworkType

      setCurrentNetwork(validNetwork as NetworkType);      if (onConnect) {
        onConnect(walletInfo.address);
      }
      
      // Dispatch event to notify other components about wallet connection
      window.dispatchEvent(new CustomEvent('walletConnected', { 
        detail: { address: walletInfo.address, network: validNetwork } 
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to connect with WalletConnect');
      console.error('Error connecting WalletConnect:', err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleDisconnect = () => {
    web3Service.disconnectWallet();
    setIsConnected(false);
    setWalletAddress('');
    setCurrentNetwork("ethereum"); // Default to a valid NetworkType

    // Dispatch event to notify other components about wallet disconnection
    window.dispatchEvent(new CustomEvent('walletDisconnected'));

    if (onDisconnect) {
      onDisconnect();
    }
  };  const handleSwitchNetwork = async (network: NetworkType) => {
    if (network === currentNetwork) {
      // Se já estamos na rede selecionada, apenas fechar o modal e não fazer nada
      setShowNetworkModal(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
      try {
      // Armazenar a rede pendente para mostrar o indicador de status
      setPendingNetworkSwitch(network);
      
      // Tentar mudar de rede programaticamente (tanto para MetaMask quanto WalletConnect)
      await web3Service.attemptProgrammaticNetworkSwitch(network);
        // Atualizar estado local após mudança bem-sucedida
      setCurrentNetwork(network);
      setPendingNetworkSwitch(null);
      
      // Notificar outros componentes da aplicação sobre a mudança
      window.dispatchEvent(new CustomEvent('networkChanged', {
        detail: { network, forced: !!web3Service.wcV2Provider }
      }));
      
      // Feedback visual de sucesso
      setError(null);
      setShowNetworkSuccess(true);
      
      // Ocultar notificação após 5 segundos
      setTimeout(() => {
        setShowNetworkSuccess(false);
      }, 5000);
      setShowNetworkSuccess(true);
      
      console.log(`Rede alterada para ${network} ${web3Service.wcV2Provider ? '(WalletConnect)' : '(MetaMask)'}`);
    } catch (err: any) {
      console.error('Erro ao trocar de rede:', err);
        console.log('[WalletButton] Erro detalhado na troca de rede:', {
        message: err.message,
        hasWcProvider: !!web3Service.wcV2Provider,
        code: err.code
      });
      
      // Verificar se é um erro de sessão expirada ou conexão do WalletConnect
      const isSessionExpiredError = err.message?.includes('Conecte sua carteira') || 
                                   err.message?.includes('sessão expirou') ||
                                   err.message?.includes('sessão WalletConnect') ||
                                   err.message?.includes('conexão') ||
                                   err.message?.includes('Please call connect') || 
                                   err.message?.includes('connection is not open') ||
                                   err.message?.includes('conexão') ||
                                   err.message?.includes('reconectar');
      
      // Se for WalletConnect e for erro de sessão/conexão, iniciar fluxo de reconexão
      if (isSessionExpiredError && web3Service.wcV2Provider) {
        console.log('[WalletButton] Detectado erro de conexão WalletConnect. Iniciando reconexão automática...');
        setPendingNetworkSwitch(network);
        setNeedsReconnect(true);
        setError('Detectamos um problema na conexão. Iniciando reconexão...');
        return;
      }
      
      // Feedback específico baseado no tipo de erro para melhor UX
      if (err.message?.includes('User rejected') || 
          err.message?.includes('rejeitou') ||
          err.message?.includes('cancelou') ||
          err.code === 4001) {
        setError('Você rejeitou a troca de rede. Tente novamente quando estiver pronto.');
      } 
      else if (err.message?.includes('troque manualmente') || 
               err.message?.includes('not supported') ||
               err.message?.includes('Unrecognized') ||
               err.message?.includes('não suport')) {
        setError(`Sua carteira não suporta troca automática de rede. Por favor, abra o aplicativo da sua carteira e mude para a rede ${network.charAt(0).toUpperCase() + network.slice(1)} manualmente.`);
      }
      else if (err.message?.includes('Tempo esgotado') || 
               err.message?.includes('timeout') ||
               err.message?.includes('timed out')) {
        setError('Tempo esgotado ao aguardar resposta da carteira. Verifique se seu aplicativo está aberto e tente novamente.');
      }
      else {
        setError(err.message || 'Não foi possível trocar de rede. Tente novamente ou mude manualmente no aplicativo da sua carteira.');
      }} finally {
      // Só desativa loading se não estivermos em processo de reconexão
      if (!needsReconnect) {
        setIsLoading(false);
        setPendingNetworkSwitch(null);
      }
    }
  };

  // Formatar endereço para exibição
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="wallet-button-container relative">
      {/* Network Status Indicator - Only show when loading */}
      {isLoading && pendingNetworkSwitch && (
        <NetworkStatusIndicator 
          isLoading={isLoading} 
          networkType={pendingNetworkSwitch} 
        />
      )}
      
      {/* Network Success Notification */}
      <NetworkOverview
        networkType={currentNetwork}
        showSuccess={showNetworkSuccess}
        onClose={() => setShowNetworkSuccess(false)}
      />

      {error && (
        <div className="text-red-500 text-xs mb-1">
          {error}
        </div>
      )}
        {/* Network Status Indicator - Only show when loading */}
      {isLoading && pendingNetworkSwitch && (
        <NetworkStatusIndicator 
          isLoading={isLoading} 
          networkType={pendingNetworkSwitch} 
        />
      )}
      
      {/* Network Success Notification */}      <NetworkOverview
        networkType={currentNetwork}
        showSuccess={showNetworkSuccess}
        onClose={() => setShowNetworkSuccess(false)}
      />

      {!isConnected ? (
        <>
          <button 
            onClick={() => setShowWalletOptions((v) => !v)}
            disabled={isLoading}
            className={`bg-orange-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-orange-400 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {showWalletOptions && !isLoading && (
            <div className="absolute z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 left-0">
              <button
                onClick={handleConnectMetaMask}
                className="w-full text-left px-4 py-2 hover:bg-orange-100 text-gray-800 rounded-t-lg"
              >
                <span role="img" aria-label="MetaMask" className="mr-2">🦊</span>
                MetaMask
              </button>
              <button
                onClick={handleConnectWalletConnect}
                className="w-full text-left px-4 py-2 hover:bg-orange-100 text-gray-800 rounded-b-lg border-t border-gray-100"
              >
                <span role="img" aria-label="WalletConnect" className="mr-2">🔗</span>
                WalletConnect
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Connected
            </span>
            <span className="text-sm">{formatAddress(walletAddress)}</span>
            <button
              onClick={handleDisconnect}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Disconnect
            </button>
          </div>

          <div className="network-selector flex items-center">
            <button 
              onClick={() => setShowNetworkModal(true)} 
              className="flex items-center text-sm border rounded px-2 py-1 hover:bg-gray-50"
            >
              <span className={`inline-block w-3 h-3 rounded-full mr-2 bg-${currentNetwork === 'ethereum' ? 'blue' : currentNetwork === 'polygon' ? 'purple' : 'yellow'}-500`}></span>
              {currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1)}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
              {/* Network Selection Modal */}
            {showNetworkModal && (
              <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-2 border-orange-400">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-orange-600">Select Network</h3>                    
                    <button 
                      onClick={() => setShowNetworkModal(false)} 
                      className="text-orange-400 hover:text-orange-600"
                      aria-label="Close network selection modal"
                      title="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                    <div className="grid gap-3">
                    {availableNetworks.map((network) => {
                      const isCurrentNetwork = currentNetwork === network;
                      const networkColor = network === 'ethereum' ? 'blue' : network === 'polygon' ? 'purple' : network === 'binance' ? 'yellow' : 'gray';
                      
                      return (
                        <button
                          key={network}
                          onClick={() => {
                            handleSwitchNetwork(network);
                            // Não fechar o modal aqui. Ele será fechado após sucesso no handleSwitchNetwork
                          }}
                          className={`flex items-center p-3 rounded-lg transform transition-all duration-200 ${
                            isLoading ? 'opacity-70 cursor-not-allowed' : 
                            isCurrentNetwork ? 
                              `bg-orange-100 border border-orange-300 shadow-md` : 
                              'hover:bg-orange-50 hover:border hover:border-orange-200 hover:shadow-sm'
                          }`}
                          disabled={isLoading}
                        >
                          <span className={`inline-block w-4 h-4 rounded-full mr-3 bg-${networkColor}-${isCurrentNetwork ? '500' : '400'}`}></span>
                          <div className="flex-1 text-left">
                            <p className={`font-medium ${isCurrentNetwork ? 'text-orange-700' : 'text-gray-700'}`}>
                              {network.charAt(0).toUpperCase() + network.slice(1)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {network === 'ethereum' ? 'Ethereum Mainnet' : 
                               network === 'polygon' ? 'Polygon Mainnet' : 
                               network === 'binance' ? 'Binance Smart Chain' : 'Network'}
                            </p>
                          </div>
                          {isCurrentNetwork && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                    <p className="mt-4 text-xs text-gray-600 bg-orange-50 p-2 rounded-md border border-orange-100">
                    {web3Service.wcV2Provider ? 
                      '🔗 Switching networks is now supported with WalletConnect! If you encounter issues, try switching networks manually in your wallet app.' : 
                      '🦊 Network switching is supported directly from this interface.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>      )}
    </div>
  );
};

export default WalletButton;
