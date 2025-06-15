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
        <div className="fixed bottom-4 left-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">Instalar Gate33</h4>
              <p className="text-sm opacity-90 mt-1">
                Para instalar: toque em <span className="font-bold">⎙</span> e depois em "Adicionar à Tela de Início"
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white text-lg leading-none ml-2"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Instalar Gate33</h4>
            <p className="text-sm opacity-90">Adicione à tela inicial para acesso rápido</p>
          </div>
          <div className="ml-4 flex gap-2">
            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white text-sm"
            >
              Não
            </button>
            <button
              onClick={handleInstall}
              className="bg-white text-green-600 px-3 py-1 rounded text-sm font-medium"
            >
              Instalar
            </button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <>
      {/* Notificação de atualização */}
      {updateAvailable && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Nova versão disponível!</h4>
              <p className="text-sm opacity-90">Clique para atualizar o Gate33</p>
            </div>
            <div className="ml-4 flex gap-2">
              <button
                onClick={() => setUpdateAvailable(false)}
                className="text-white/70 hover:text-white text-sm"
              >
                Depois
              </button>
              <button
                onClick={handleUpdate}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt de instalação */}
      {showInstallPrompt && isInstallable && !wasRecentlyDismissed() && renderInstallPrompt()}
    </>
  );
}
