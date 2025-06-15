import "./globals.css";
import { WalletProvider } from '../components/WalletProvider';
import PWAUpdateManager from '../components/PWAUpdateManager';

// Contract monitoring initialization has been moved to the server-init.ts file
// This prevents multiple conflicting initializations during Next.js renderings

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Gate33" />
      </head>
      <body>
        <WalletProvider>
          {children}
          <PWAUpdateManager />
        </WalletProvider>
      </body>
    </html>
  )
}
