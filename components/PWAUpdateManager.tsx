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
  
  // Função para detectar dispositivos móveis
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    
    return isMobileUserAgent || (isTouchDevice && isSmallScreen);
  };  useEffect(() => {
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
      let beforeInstallPromptFired = false;      // Escutar evento de instalação
      const handleBeforeInstallPrompt = (e: any) => {
        console.log('[PWA] beforeinstallprompt event fired');
        e.preventDefault();
        beforeInstallPromptFired = true;
        setDeferredPrompt(e);
        setIsInstallable(true);
        
        // Só mostrar o prompt em dispositivos móveis
        if (isMobileDevice()) {
          // Aguardar um pouco antes de mostrar o prompt para não ser intrusivo
          setTimeout(() => {
            setShowInstallPrompt(true);
          }, 3000);
        } else {
          console.log('[PWA] Install prompt não mostrado - não é dispositivo móvel');
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);      // Escutar quando o app é instalado
      window.addEventListener('appinstalled', (e) => {
        console.log('[PWA] App instalado - evento appinstalled disparado', e);
        setShowInstallPrompt(false);
        setIsInstallable(false);
        setDeferredPrompt(null);
        // Salvar no localStorage que foi instalado
        localStorage.setItem('pwa-installed', 'true');
        // Limpar dismissal para permitir futuras verificações
        localStorage.removeItem('pwa-install-dismissed');
        onUpdateInstalled?.();
      });// Verificar se já está instalado ou em modo standalone
      const checkInstallStatus = () => {
        // Usar a nova função de verificação mais robusta
        const isInstalled = isPWAInstalled();
        
        console.log('[PWA] Verificação inicial de status:', {
          isInstalled,
          isMobile: isMobileDevice(),
          userAgent: navigator.userAgent
        });

        if (isInstalled) {
          console.log('[PWA] App está rodando como PWA - não mostrar prompt');
          setShowInstallPrompt(false);
          setIsInstallable(false);
          // Marcar como instalado no localStorage para futuras verificações
          localStorage.setItem('pwa-installed', 'true');
          return;
        }

        // Verificar se foi dismissado recentemente
        if (wasRecentlyDismissed()) {
          console.log('[PWA] Prompt foi dismissado recentemente - não mostrar');
          setShowInstallPrompt(false);
          setIsInstallable(false);
          return;
        }

        // Só continuar se for dispositivo móvel
        if (!isMobileDevice()) {
          console.log('[PWA] Não é dispositivo móvel - não mostrar prompt');
          setShowInstallPrompt(false);
          setIsInstallable(false);
          return;
        }

        // Para dispositivos iOS/Safari que não suportam beforeinstallprompt
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        
        // Aguardar um tempo para ver se o beforeinstallprompt dispara
        setTimeout(() => {
          // Verificar novamente se não foi instalado durante esse tempo
          if (isPWAInstalled()) {
            console.log('[PWA] App foi instalado durante a espera');
            setShowInstallPrompt(false);
            setIsInstallable(false);
            localStorage.setItem('pwa-installed', 'true');
            return;
          }

          if (!beforeInstallPromptFired && !isInstalled && isMobileDevice()) {
            console.log('[PWA] beforeinstallprompt não disparou - verificando se app é instalável');
            setIsInstallable(true);
            
            if (isIOS && isSafari) {
              console.log('[PWA] Dispositivo iOS Safari detectado - mostrando instruções manuais');
              // Para iOS, mostrar depois de um delay maior para não ser intrusivo
              setTimeout(() => {
                if (!isPWAInstalled() && !wasRecentlyDismissed() && isMobileDevice()) {
                  setShowInstallPrompt(true);
                }
              }, 5000);
            } else {
              // Para outros navegadores móveis, assumir que é instalável
              setTimeout(() => {
                if (!isPWAInstalled() && !wasRecentlyDismissed() && isMobileDevice()) {
                  setShowInstallPrompt(true);
                }
              }, 8000);
            }
          }
        }, 3000); // Reduzido de 5000 para 3000ms
      };// Verificar status inicial
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', checkInstallStatus);
      } else {
        checkInstallStatus();
      }      // Verificação periódica para detectar mudanças no status de instalação
      const statusCheckInterval = setInterval(() => {
        const currentlyInstalled = isPWAInstalled();
        
        if (currentlyInstalled && (showInstallPrompt || isInstallable)) {
          console.log('[PWA] App foi instalado (detectado na verificação periódica) - escondendo prompt');
          setShowInstallPrompt(false);
          setIsInstallable(false);
          localStorage.setItem('pwa-installed', 'true');
        }
      }, 3000); // Verificar a cada 3 segundos (mais frequente)      // Cleanup
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('DOMContentLoaded', checkInstallStatus);
        clearInterval(statusCheckInterval);
      };
    }
  }, [onUpdateAvailable, onUpdateInstalled]);  const handleUpdate = () => {
    console.log('[PWA] Update button clicked');
    setUpdateAvailable(false);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          console.log('[PWA] Found waiting service worker, sending skip waiting message');
          
          // Listen for controller change first
          const handleControllerChange = () => {
            console.log('[PWA] Controller changed, reloading page');
            window.location.reload();
          };
          
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true });
          
          // Send message to waiting service worker to skip waiting
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          console.log('[PWA] No waiting service worker found, just reloading');
          window.location.reload();
        }
      });
    }
  };
  const handleInstall = async () => {
    console.log('[PWA] Tentando instalar app');
    
    if (deferredPrompt) {
      try {
        console.log('[PWA] Usando deferredPrompt para instalação');
        const result = await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        console.log('[PWA] Resultado da instalação:', {
          prompt: result,
          choice: choiceResult
        });
        
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] Usuário aceitou a instalação');
          // O evento 'appinstalled' será disparado automaticamente
        } else {
          console.log('[PWA] Usuário recusou a instalação');
          handleDismiss();
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('[PWA] Erro ao instalar:', error);
        // Se der erro, fechar o prompt
        handleDismiss();
      }
    } else {
      console.log('[PWA] Sem deferredPrompt disponível - fechando prompt');
      // Se não há deferredPrompt (iOS Safari), apenas fechar o prompt
      handleDismiss();
    }
  };  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setIsInstallable(false);
    // Salvar no localStorage para não mostrar novamente por um tempo
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    console.log('[PWA] Prompt dismissado pelo usuário');
  };
  // Verificar se foi dismissado recentemente (7 dias)
  const wasRecentlyDismissed = () => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) return false;
    
    const dismissedTime = parseInt(dismissed);
    const now = Date.now();
    const weekInMs = 7 * 24 * 60 * 60 * 1000; // 7 dias em vez de 1 dia
    
    return (now - dismissedTime) < weekInMs;
  };  // Verificar se PWA já foi instalado
  const isPWAInstalled = () => {
    try {      // Verificação 1: Histórico de instalação (principal para desenvolvimento)
      const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
      
      // Verificação 2: Modo standalone (principal indicador)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // Verificação 2: iOS Safari Web App
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      
      // Verificação 3: Outros modos de display do PWA
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
        // Verificação 5: Se está rodando em ambiente similar ao app nativo
      const isPWAMode = isStandalone || isInWebAppiOS || isMinimalUI || isFullscreen;
      // Verificação 6: Detectar se está em um contexto de app instalado
      const urlParams = new URLSearchParams(window.location.search);
      const fromPWA = urlParams.get('pwa') === 'true';
      const hasAppContext = fromPWA || (document.referrer === '' && isPWAMode);
      // Log para debug
      console.log('[PWA] Status de instalação:', {
        isStandalone,
        isInWebAppiOS,
        isMinimalUI,
        isFullscreen,
        isPWAMode,
        wasInstalled,
        hasAppContext,
        fromPWA,
        userAgent: navigator.userAgent,
        displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
        url: window.location.href
      });
      
      // Se detectou que veio do PWA, marcar como instalado
      if (fromPWA || isPWAMode) {
        localStorage.setItem('pwa-installed', 'true');
      }
        // Se qualquer verificação principal indicar que é PWA, considerar como instalado
      // PRIORIZAR o localStorage para desenvolvimento, depois verificar modos PWA
      return wasInstalled || isPWAMode || hasAppContext;
      
    } catch (error) {
      console.error('[PWA] Erro ao verificar status de instalação:', error);
      return false;
    }
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
      )}      {/* Prompt de instalação - apenas em dispositivos móveis */}
      {showInstallPrompt && isInstallable && !wasRecentlyDismissed() && isMobileDevice() && renderInstallPrompt()}
    </>
  );
}
