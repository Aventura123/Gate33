"use client";

import React from 'react';

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  walletAddress: string | null;
  currentNetwork: string | null;
  isUsingWalletConnect: boolean;
  availableNetworks: string[];
  onDisconnect: () => void;
  onSwitchNetwork: (network: string) => void;
}

// Modal backdrop component
export const ModalBackdrop: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const WalletModal: React.FC<WalletModalProps> = ({ 
  open, 
  onClose, 
  walletAddress, 
  currentNetwork, 
  isUsingWalletConnect, 
  availableNetworks, 
  onDisconnect, 
  onSwitchNetwork 
}) => {  
  // Show loading if currentNetwork is not ready
  if (!currentNetwork) {
    return (
      <ModalBackdrop open={open} onClose={onClose}>
        <div className="p-8 text-center text-orange-400">Loading network info...</div>
      </ModalBackdrop>
    );
  }

  // Helper for network details  
  const getNetworkDetails = (network: string) => {
    switch (network) {
      case 'ethereum': return { name: 'Ethereum Mainnet', color: 'bg-blue-500' };
      case 'polygon': return { name: 'Polygon Mainnet', color: 'bg-purple-500' };
      case 'binance': return { name: 'Binance Smart Chain', color: 'bg-yellow-500' };
      case 'binanceTestnet': return { name: 'BSC Testnet', color: 'bg-orange-500' };
      case 'optimism': return { name: 'Optimism', color: 'bg-pink-500' };
      case 'avalanche': return { name: 'Avalanche C-Chain', color: 'bg-red-500' };
      default: return { name: network, color: 'bg-gray-500' };
    }
  };
  
  // Organize networks in rows of 3
  const rows: string[][] = [];
  for (let i = 0; i < availableNetworks.length; i += 3) {
    rows.push(availableNetworks.slice(i, i + 3));
  }
  
  return (
    <ModalBackdrop open={open} onClose={onClose}>
      <div className="rounded-2xl border border-orange-400 bg-black/80 backdrop-blur-xl p-6 min-w-[320px] max-w-[95vw] mx-auto relative wallet-modal-shadow">
        <button className="absolute top-3 right-3 text-orange-500 hover:text-orange-400 transition" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h2 className="text-lg font-semibold mb-4 text-orange-500 text-center">Manage Wallet</h2>
        <div className="mb-6">
          <div className="flex flex-col gap-3">
            {rows.map((row: string[], idx: number) => (
              <div key={idx} className="flex flex-row gap-3 justify-center">
                {row.map((n: string) => {
                  const d = getNetworkDetails(n);
                  const isActive = n === currentNetwork;
                  return (
                    <button
                      key={n}
                      onClick={() => !isActive && onSwitchNetwork(n)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border transition-all ${isActive ? 'border-orange-500 text-white shadow pointer-events-none bg-orange-400' : 'border-transparent text-gray-800 dark:text-gray-200 opacity-80 hover:opacity-100 hover:border-orange-400 hover:scale-105 pointer-events-auto bg-white/60 dark:bg-black/60'} min-w-90`}
                      type="button"
                    >
                      <span className={`w-3 h-3 rounded-full mr-2 ${d.color}`} />
                      <span className="flex flex-col items-start">
                        <span>{d.name}</span>
                        <span className="text-[10px] text-gray-400 lowercase">{n}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            {isUsingWalletConnect ? (
              <span role="img" aria-label="WalletConnect" className="w-5 h-5">🔗</span>
            ) : (
              <span role="img" aria-label="MetaMask" className="w-5 h-5">🦊</span>
            )}
            <span className="text-xs text-gray-300 font-mono select-all">{walletAddress ? walletAddress.slice(0,6) + '...' + walletAddress.slice(-6) : ''}</span>
          </div>
        </div>
        <button
          className="w-full py-2 rounded-lg bg-orange-500 text-white font-semibold text-sm shadow hover:bg-orange-400 transition mb-2"
          onClick={onDisconnect}
        >
          Disconnect your Wallet
        </button>
        <div className="text-xs text-gray-400 text-center mt-2">
          If you have any questions – please contact <a href="/support" className="text-orange-500 underline">Support</a>
          <div className="flex justify-center gap-2 mt-3">
            <a href="https://t.me/gate33_tg_channel" target="_blank" rel="noopener" aria-label="Telegram">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9.04 13.47l-.37 4.13c.53 0 .76-.23 1.04-.5l2.5-2.38 5.18 3.78c.95.53 1.63.25 1.87-.88l3.4-15.88c.34-1.56-.56-2.17-1.57-1.8L1.6 9.13c-1.53.6-1.5 1.47-.26 1.85l4.13 1.29 9.6-6.06c.45-.28.87-.13.53.18l-7.8 7.08z" fill="#FB923C"/></svg>
            </a>
            <a href="https://x.com/x_Gate33" target="_blank" rel="noopener" aria-label="X (Twitter)">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M22.46 5.92c-.8.36-1.67.6-2.58.71a4.48 4.48 0 0 0 1.97-2.48 8.94 8.94 0 0 1-2.83 1.08A4.48 4.48 0 0 0 16.1 4c-2.48 0-4.5 2.02-4.5 4.5 0 .35.04.7.11 1.03C7.69 9.4 4.07 7.7 1.64 5.15c-.38.65-.6 1.4-.6 2.2 0 1.52.77 2.86 1.95 3.65-.72-.02-1.4-.22-1.99-.55v.06c0 2.13 1.52 3.9 3.54 4.3-.37.1-.76.16-1.16.16-.28 0-.55-.03-.81-.08.55 1.7 2.16 2.94 4.07 2.97A9.01 9.01 0 0 1 2 20.29c-.29 0-.57-.02-.85-.05A12.77 12.77 0 0 0 8.29 22c7.55 0 11.68-6.26 11.68-11.68 0-.18-.01-.36-.02-.54.8-.58 1.5-1.3 2.05-2.12z" fill="#FB923C"/></svg>
            </a>
            <a href="https://www.linkedin.com/company/gate33" target="_blank" rel="noopener" aria-label="LinkedIn">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.28c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm15.5 10.28h-3v-4.5c0-1.08-.02-2.47-1.5-2.47-1.5 0-1.73 1.17-1.73 2.39v4.58h-3v-9h2.88v1.23h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.59v4.72z" fill="#FB923C"/></svg>
            </a>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
};

export default WalletModal;
