export interface CookieConsentData {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

export class CookieManager {
  private static readonly CONSENT_KEY = 'gate33-cookie-consent';
  private static readonly CONSENT_VERSION = '1.0';

  /**
   * Get current cookie consent status
   */
  static getConsent(): CookieConsentData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const consent = localStorage.getItem(this.CONSENT_KEY);
      return consent ? JSON.parse(consent) : null;
    } catch (error) {
      console.error('Error reading cookie consent:', error);
      return null;
    }
  }

  /**
   * Set cookie consent preferences
   */
  static setConsent(preferences: Omit<CookieConsentData, 'timestamp' | 'version'>): void {
    if (typeof window === 'undefined') return;

    const consentData: CookieConsentData = {
      ...preferences,
      timestamp: new Date().toISOString(),
      version: this.CONSENT_VERSION
    };

    try {
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(consentData));
      this.applyCookiePreferences(consentData);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  }

  /**
   * Check if user has given consent for a specific cookie category
   */
  static hasConsent(category: keyof Omit<CookieConsentData, 'timestamp' | 'version'>): boolean {
    const consent = this.getConsent();
    return consent ? consent[category] : false;
  }

  /**
   * Check if user has made a consent choice
   */
  static hasConsentChoice(): boolean {
    return this.getConsent() !== null;
  }

  /**
   * Clear all consent data (for testing or reset purposes)
   */
  static clearConsent(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.CONSENT_KEY);
  }

  /**
   * Apply cookie preferences by enabling/disabling tracking scripts
   */
  private static applyCookiePreferences(consent: CookieConsentData): void {
    // Analytics cookies
    if (consent.analytics) {
      this.enableAnalytics();
    } else {
      this.disableAnalytics();
    }

    // Marketing cookies
    if (consent.marketing) {
      this.enableMarketing();
    } else {
      this.disableMarketing();
    }

    // Functional cookies
    if (consent.functional) {
      this.enableFunctional();
    } else {
      this.disableFunctional();
    }
  }

  /**
   * Enable analytics tracking
   */
  private static enableAnalytics(): void {
    // Google Analytics 4 example
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }

    // You can add other analytics services here
    console.log('Analytics cookies enabled');
  }

  /**
   * Disable analytics tracking
   */
  private static disableAnalytics(): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }

    // Clear existing analytics cookies
    this.clearCookiesByPattern(/^(_ga|_gid|_gat)/);
    console.log('Analytics cookies disabled');
  }

  /**
   * Enable marketing cookies
   */
  private static enableMarketing(): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    }

    console.log('Marketing cookies enabled');
  }

  /**
   * Disable marketing cookies
   */
  private static disableMarketing(): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }

    // Clear existing marketing cookies
    this.clearCookiesByPattern(/^(_fbp|_fbc|fbclid)/);
    console.log('Marketing cookies disabled');
  }

  /**
   * Enable functional cookies
   */
  private static enableFunctional(): void {
    console.log('Functional cookies enabled');
    // Add functional cookie logic here
  }

  /**
   * Disable functional cookies
   */
  private static disableFunctional(): void {
    console.log('Functional cookies disabled');
    // Clear functional cookies if needed
  }

  /**
   * Clear cookies by pattern
   */
  private static clearCookiesByPattern(pattern: RegExp): void {
    if (typeof document === 'undefined') return;

    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      if (pattern.test(name)) {
        // Clear cookie for current domain
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        // Clear cookie for parent domain
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${location.hostname}`;
        // Clear cookie for all parent domains
        const domainParts = location.hostname.split('.');
        for (let i = 1; i < domainParts.length; i++) {
          const domain = '.' + domainParts.slice(i).join('.');
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
        }
      }
    });
  }

  /**
   * Set a cookie with consent check
   */
  static setCookie(
    name: string, 
    value: string, 
    days: number = 30, 
    category: keyof Omit<CookieConsentData, 'timestamp' | 'version'> = 'necessary'
  ): boolean {
    if (typeof document === 'undefined') return false;

    // Always allow necessary cookies
    if (category !== 'necessary' && !this.hasConsent(category)) {
      console.warn(`Cookie ${name} not set - no consent for ${category} cookies`);
      return false;
    }

    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
    return true;
  }

  /**
   * Get a cookie value
   */
  static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    
    return null;
  }

  /**
   * Delete a cookie
   */
  static deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  /**
   * Initialize cookie manager on page load
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;

    const consent = this.getConsent();
    if (consent) {
      this.applyCookiePreferences(consent);
    }

    // Listen for consent changes
    window.addEventListener('storage', (e) => {
      if (e.key === this.CONSENT_KEY && e.newValue) {
        try {
          const newConsent = JSON.parse(e.newValue);
          this.applyCookiePreferences(newConsent);
        } catch (error) {
          console.error('Error parsing consent from storage event:', error);
        }
      }
    });
  }
}

// Auto-initialize on import (browser only)
if (typeof window !== 'undefined') {
  CookieManager.initialize();
}
