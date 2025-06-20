import "./globals.css";
import "../components/index-page.css";
import "../styles/job-indicators.css";
import { WalletProvider } from '../components/WalletProvider';
import PWAUpdateManager from '../components/PWAUpdateManager';
import CookieConsent from '../components/CookieConsent';
import GoogleAnalytics from '../components/GoogleAnalytics';
import { metadata } from './metadata';
import { viewport } from './viewport';

// Contract monitoring initialization has been moved to the server-init.ts file
// This prevents multiple conflicting initializations during Next.js renderings

export { metadata, viewport };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* <GoogleAnalytics /> REMOVIDO DO HEAD */}
      </head>
      <body>
        <GoogleAnalytics />
        <WalletProvider>
          {children}
          <PWAUpdateManager />
          <CookieConsent />
        </WalletProvider>
      </body>
    </html>
  )
}
