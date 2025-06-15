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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar service worker
      navigator.serviceWorker.register('/sw.js')
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
        })
        .catch((error) => {
          console.error('[PWA] Erro ao registrar Service Worker:', error);
        });

      // Escutar evento de instalação
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallPrompt(true);
      });

      // Escutar quando o app é instalado
      window.addEventListener('appinstalled', () => {
        console.log('[PWA] App instalado');
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
        onUpdateInstalled?.();
      });

      // Verificar se já está instalado
      window.addEventListener('DOMContentLoaded', () => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
          console.log('[PWA] App está rodando como PWA');
        }
      });
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
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      console.log('[PWA] Escolha do usuário:', choiceResult);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
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
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Instalar Gate33</h4>
              <p className="text-sm opacity-90">Adicione à tela inicial para acesso rápido</p>
            </div>
            <div className="ml-4 flex gap-2">
              <button
                onClick={() => setShowInstallPrompt(false)}
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
      )}
    </>
  );
}
