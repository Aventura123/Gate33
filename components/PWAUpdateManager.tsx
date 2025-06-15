"use client";

import { useEffect, useState } from 'react';

interface PWAUpdateManagerProps {
  onUpdateAvailable?: () => void;
  onUpdateInstalled?: () => void;
}

export default function PWAUpdateManager({ 
  onUpdateAvailable, 
  onUpdateInstalled 
}: PWAUpdateManagerProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar service worker
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registrado:', registration);

          // Verificar atualizações
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nova versão disponível');
                  setUpdateAvailable(true);
                  onUpdateAvailable?.();
                }
              });
            }
          });

          // Verificar se há uma atualização aguardando
          if (registration.waiting) {
            setUpdateAvailable(true);
            onUpdateAvailable?.();
          }

          // Forçar checagem de atualizações
          registration.update();
        })
        .catch((error) => {
          console.error('[PWA] Erro ao registrar Service Worker:', error);
        });

      // Flag para detectar se o beforeinstallprompt foi disparado
      let beforeInstallPromptFired = false;

      // Escutar evento de instalação
      const handleBeforeInstallPrompt = (e: any) => {
        console.log('[PWA] beforeinstallprompt event fired');
        e.preventDefault();
        beforeInstallPromptFired = true;
        setDeferredPrompt(e);
        setIsInstallable(true);
        
        // Aguardar um pouco antes de mostrar o prompt para não ser intrusivo
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Escutar quando o app é instalado
      window.addEventListener('appinstalled', () => {
        console.log('[PWA] App instalado');
        setShowInstallPrompt(false);
        setIsInstallable(false);
        setDeferredPrompt(null);
        onUpdateInstalled?.();
      });

      // Verificar se já está instalado ou em modo standalone
      const checkInstallStatus = () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isInWebAppiOS = (window.navigator as any).standalone === true;
        const isInstalled = isStandalone || isInWebAppiOS;
        
        // Verificar se veio do PWA pela URL
        const urlParams = new URLSearchParams(window.location.search);
        const fromPWA = urlParams.get('source') === 'pwa';
        
        console.log('[PWA] Status de instalação:', {
          isStandalone,
          isInWebAppiOS,
          isInstalled,
          fromPWA,
          userAgent: navigator.userAgent
        });

        if (isInstalled || fromPWA) {
          console.log('[PWA] App está rodando como PWA');
          setShowInstallPrompt(false);
          setIsInstallable(false);
          return;
        }

        // Para dispositivos iOS/Safari que não suportam beforeinstallprompt
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        
        // Aguardar um tempo para ver se o beforeinstallprompt dispara
        setTimeout(() => {
          if (!beforeInstallPromptFired && !isInstalled) {
            console.log('[PWA] beforeinstallprompt não disparou - app pode ser instalável');
            setIsInstallable(true);
            
            if (isIOS && isSafari) {
              console.log('[PWA] Dispositivo iOS detectado - mostrando instruções manuais');
              // Para iOS, mostrar depois de um delay maior para não ser intrusivo
              setTimeout(() => {
                setShowInstallPrompt(true);
              }, 5000);
            } else {
              // Para outros navegadores, assumir que é instalável
              setTimeout(() => {
                setShowInstallPrompt(true);
              }, 8000);
            }
          }
        }, 5000);
      };

      // Verificar status inicial
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', checkInstallStatus);
      } else {
        checkInstallStatus();
      }

      // Cleanup
      return () => {
        window.removeEventListener('DOMContentLoaded', checkInstallStatus);
      };
    }
  }, [onUpdateAvailable, onUpdateInstalled]);
  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          registration.waiting.addEventListener('statechange', () => {
            if (registration.waiting?.state === 'activated') {
              window.location.reload();
            }
          });
        }
      });
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        console.log('[PWA] Escolha do usuário:', choiceResult);
        
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] Usuário aceitou a instalação');
        } else {
          console.log('[PWA] Usuário recusou a instalação');
        }
        
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
        setIsInstallable(false);
      } catch (error) {
        console.error('[PWA] Erro ao instalar:', error);
      }
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Salvar no localStorage para não mostrar novamente por um tempo
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Verificar se foi dismissado recentemente (24 horas)
  const wasRecentlyDismissed = () => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) return false;
    
    const dismissedTime = parseInt(dismissed);
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    return (now - dismissedTime) < dayInMs;
  };
  // Renderizar prompt de instalação diferente para iOS
  const renderInstallPrompt = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari && !deferredPrompt) {
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#ff6b35]/20 text-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2 text-white">Install Gate33</h4>
              <p className="text-sm text-gray-300 mb-6">
                To install: tap <span className="inline-flex items-center justify-center w-6 h-6 bg-[#ff6b35] rounded text-xs font-bold mx-1">⎙</span> then "Add to Home Screen"
              </p>
              <button
                onClick={handleDismiss}
                className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] hover:from-[#ff5722] hover:to-[#ff6b35] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-[#ff6b35]/20 text-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </div>
            <h4 className="text-xl font-bold mb-2 text-white">Install Gate33</h4>
            <p className="text-sm text-gray-300 mb-6">Add to home screen for quick access</p>
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] hover:from-[#ff5722] hover:to-[#ff6b35] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <>      {/* Update notification */}
      {updateAvailable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#ff6b35]/20 text-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2 text-white">New version available!</h4>
              <p className="text-sm text-gray-300 mb-6">Click to update Gate33 to the latest version</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setUpdateAvailable(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
                >
                  Later
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] hover:from-[#ff5722] hover:to-[#ff6b35] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt de instalação */}
      {showInstallPrompt && isInstallable && !wasRecentlyDismissed() && renderInstallPrompt()}
    </>
  );
}
