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
    // Check if user has consented to analytics cookies
    const updateGAConsent = (analyticsConsent: boolean) => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: analyticsConsent ? 'granted' : 'denied'
        });
      }
    };

    const checkConsentAndInitGA = () => {
      const consent = localStorage.getItem('gate33-cookie-consent');
      if (consent) {
        const consentData = JSON.parse(consent);
        updateGAConsent(consentData.analytics);
      } else {
        // No consent yet, set default to denied
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('consent', 'default', {
            analytics_storage: 'denied'
          });
        }
      }
    };

    // Check consent when component mounts
    checkConsentAndInitGA();

    // Listen for storage changes (when user accepts/declines cookies)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gate33-cookie-consent') {
        checkConsentAndInitGA();
      }
    };

    // Listen for custom cookie consent events (immediate updates)
    const handleCookieConsentChanged = (e: CustomEvent) => {
      updateGAConsent(e.detail.analytics);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cookieConsentChanged', handleCookieConsentChanged as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
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
          
          // Set default consent to denied
          gtag('consent', 'default', {
            analytics_storage: 'denied'
          });
          
          gtag('config', '${GA_TRACKING_ID}');
        `}
      </Script>
    </>
  );
}
