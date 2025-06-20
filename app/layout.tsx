import "./globals.css";
import "../components/index-page.css";
import "../styles/job-indicators.css";
import { WalletProvider } from '../components/WalletProvider';
import PWAUpdateManager from '../components/PWAUpdateManager';
import CookieConsent from '../components/CookieConsent';
import { metadata } from './metadata';
import { viewport } from './viewport';
import Script from 'next/script';

// Contract monitoring initialization has been moved to the server-init.ts file
// This prevents multiple conflicting initializations during Next.js renderings

export { metadata, viewport };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {  return (
    <html lang="pt-BR">
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-V6ZLMK2WR3`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-V6ZLMK2WR3');
          `}
        </Script>
        <WalletProvider>
          {children}
          <PWAUpdateManager />
          <CookieConsent />
        </WalletProvider>
      </body>
    </html>
  )
}
