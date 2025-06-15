"use client";

import { useEffect, useState } from 'react';

export default function PWATestPage() {
  const [pwaStatus, setPwaStatus] = useState({
    serviceWorkerRegistered: false,
    manifestLoaded: false,
    isInstallable: false,
    isInstalled: false,
    supportedFeatures: {
      serviceWorker: false,
      beforeInstallPrompt: false,
      standalone: false
    }
  });

  useEffect(() => {
    const checkPWAStatus = async () => {
      const status = {
        serviceWorkerRegistered: false,
        manifestLoaded: false,
        isInstallable: false,
        isInstalled: false,
        supportedFeatures: {
          serviceWorker: 'serviceWorker' in navigator,
          beforeInstallPrompt: 'onbeforeinstallprompt' in window,
          standalone: window.matchMedia('(display-mode: standalone)').matches
        }
      };

      // Verificar Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          status.serviceWorkerRegistered = !!registration;
        } catch (error) {
          console.error('Erro ao verificar Service Worker:', error);
        }
      }

      // Verificar manifest
      try {
        const response = await fetch('/manifest.json');
        status.manifestLoaded = response.ok;
      } catch (error) {
        console.error('Erro ao carregar manifest:', error);
      }

      // Verificar se está instalado
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      status.isInstalled = isStandalone || isInWebAppiOS;

      setPwaStatus(status);
    };

    checkPWAStatus();

    // Escutar eventos PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      setPwaStatus(prev => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      console.log('App installed');
      setPwaStatus(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const forceInstallPrompt = () => {
    // Simular evento para teste
    console.log('Tentando forçar prompt de instalação...');
    
    // No Chrome, você pode usar chrome://flags/#bypass-app-banner-engagement-checks
    // para facilitar o teste
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        console.log('Apps relacionados instalados:', apps);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Status PWA - Gate33</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Geral */}
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Status Geral</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Service Worker:</span>
                <span className={pwaStatus.serviceWorkerRegistered ? 'text-green-400' : 'text-red-400'}>
                  {pwaStatus.serviceWorkerRegistered ? '✅ Registrado' : '❌ Não registrado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Manifest:</span>
                <span className={pwaStatus.manifestLoaded ? 'text-green-400' : 'text-red-400'}>
                  {pwaStatus.manifestLoaded ? '✅ Carregado' : '❌ Erro ao carregar'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Instalável:</span>
                <span className={pwaStatus.isInstallable ? 'text-green-400' : 'text-yellow-400'}>
                  {pwaStatus.isInstallable ? '✅ Sim' : '⚠️ Aguardando'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Instalado:</span>
                <span className={pwaStatus.isInstalled ? 'text-green-400' : 'text-gray-400'}>
                  {pwaStatus.isInstalled ? '✅ Sim' : '➖ Não'}
                </span>
              </div>
            </div>
          </div>

          {/* Suporte do Navegador */}
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Suporte do Navegador</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Service Worker:</span>
                <span className={pwaStatus.supportedFeatures.serviceWorker ? 'text-green-400' : 'text-red-400'}>
                  {pwaStatus.supportedFeatures.serviceWorker ? '✅ Suportado' : '❌ Não suportado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Install Prompt:</span>
                <span className={pwaStatus.supportedFeatures.beforeInstallPrompt ? 'text-green-400' : 'text-yellow-400'}>
                  {pwaStatus.supportedFeatures.beforeInstallPrompt ? '✅ Suportado' : '⚠️ Limitado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Standalone Mode:</span>
                <span className={pwaStatus.supportedFeatures.standalone ? 'text-green-400' : 'text-gray-400'}>
                  {pwaStatus.supportedFeatures.standalone ? '✅ Ativo' : '➖ Não ativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Informações do Navegador */}
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Navegador</h2>
            <div className="space-y-2 text-sm">
              <div><strong>User Agent:</strong></div>
              <div className="text-gray-300 break-all">{navigator.userAgent}</div>
              <div className="mt-3">
                <strong>Plataforma:</strong> {navigator.platform}
              </div>
              <div>
                <strong>Idioma:</strong> {navigator.language}
              </div>
            </div>
          </div>

          {/* Ações de Teste */}
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Ações de Teste</h2>
            <div className="space-y-3">
              <button
                onClick={forceInstallPrompt}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                Testar Prompt de Instalação
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
              >
                Recarregar Página
              </button>
              <a
                href="/"
                className="block w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors text-center"
              >
                Voltar ao App
              </a>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="mt-8 bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instruções para Instalação</h2>
          <div className="space-y-4 text-sm">
            <div>
              <strong>Chrome/Edge (Desktop):</strong>
              <p className="text-gray-300">Procure pelo ícone de instalação na barra de endereços ou use o menu "Instalar Gate33"</p>
            </div>
            <div>
              <strong>Chrome/Edge (Mobile):</strong>
              <p className="text-gray-300">Toque no menu (3 pontos) e selecione "Instalar aplicativo" ou "Adicionar à tela inicial"</p>
            </div>
            <div>
              <strong>Safari (iOS):</strong>
              <p className="text-gray-300">Toque no botão compartilhar (⎙) e selecione "Adicionar à Tela de Início"</p>
            </div>
            <div>
              <strong>Firefox:</strong>
              <p className="text-gray-300">Use o menu e selecione "Instalar" (se disponível) ou adicione aos favoritos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
