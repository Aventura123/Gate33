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
    // Função simples para atualizar consentimento
    const updateConsent = (analyticsGranted: boolean) => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: analyticsGranted ? 'granted' : 'denied',
          ad_storage: analyticsGranted ? 'granted' : 'denied'
        });
      }
    };    const checkConsentAndInitGA = () => {
      const consent = localStorage.getItem('gate33-cookie-consent');
      if (consent) {
        const consentData = JSON.parse(consent);
        updateConsent(consentData.analytics);
      }
    };

    // Verificar consentimento quando o componente monta
    checkConsentAndInitGA();

    // Escutar mudanças no consentimento de cookies
    const handleCookieConsentChanged = (e: CustomEvent) => {
      updateConsent(e.detail.analytics);
    };

    window.addEventListener('cookieConsentChanged', handleCookieConsentChanged as EventListener);
    
    return () => {
      window.removeEventListener('cookieConsentChanged', handleCookieConsentChanged as EventListener);
    };
  }, []);
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          
          // Configurar modo de consentimento para GDPR
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied'
          });
          
          gtag('config', '${GA_TRACKING_ID}');
        `}
      </Script>
    </>
  );
}
