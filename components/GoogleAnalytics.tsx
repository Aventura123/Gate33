"use client";

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_TRACKING_ID = 'G-V6ZLMK2WR3';

export default function GoogleAnalytics() {
  useEffect(() => {
    // Função para verificar se o gtag está disponível
    const isGtagReady = () => {
      return typeof window !== 'undefined' && window.gtag && typeof window.gtag === 'function';
    };    // Função simples para atualizar consentimento
    const updateConsent = (analyticsGranted: boolean) => {
      if (isGtagReady()) {
        window.gtag('consent', 'update', {
          analytics_storage: analyticsGranted ? 'granted' : 'denied',
          ad_storage: analyticsGranted ? 'granted' : 'denied',
          ad_user_data: analyticsGranted ? 'granted' : 'denied',
          ad_personalization: analyticsGranted ? 'granted' : 'denied'
        });
        
        // Enviar evento quando o consentimento for concedido
        if (analyticsGranted) {
          window.gtag('event', 'consent_granted', {
            event_category: 'engagement',
            event_label: 'analytics_consent'
          });
        }
      }
    };    const checkConsentAndInitGA = () => {
      const consent = localStorage.getItem('gate33-cookie-consent');
      if (consent) {
        try {
          const consentData = JSON.parse(consent);
          updateConsent(consentData.analytics);
        } catch (error) {
          console.error('Erro ao parsear dados de consentimento:', error);
        }
      }
    };

    // Aguardar o GA estar pronto antes de verificar consentimento
    const initializeGA = () => {
      if (isGtagReady()) {
        checkConsentAndInitGA();
      } else {
        // Tentar novamente após um breve delay
        setTimeout(initializeGA, 100);
      }
    };

    // Inicializar com delay para garantir que scripts carregaram
    const timer = setTimeout(initializeGA, 500);    // Escutar mudanças no consentimento de cookies
    const handleCookieConsentChanged = (e: CustomEvent) => {
      updateConsent(e.detail.analytics);
    };

    window.addEventListener('cookieConsentChanged', handleCookieConsentChanged as EventListener);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('cookieConsentChanged', handleCookieConsentChanged as EventListener);
    };
  }, []);
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          
          // Configurar modo de consentimento v2 para GDPR
          gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied'
          });
          
          gtag('config', '${GA_TRACKING_ID}');
        `}
      </Script>
    </>
  );
}
