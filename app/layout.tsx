import "./globals.css";
import { WalletProvider } from '../components/WalletProvider';
import { AuthProvider } from '../components/AuthProvider';
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
}) {  return (
    <html lang="pt-BR">
      <head></head>
      <body>
        <GoogleAnalytics />
        <AuthProvider>
          <WalletProvider>
            {children}
            <PWAUpdateManager />
            <CookieConsent />
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
