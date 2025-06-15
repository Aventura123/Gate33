import "./globals.css";
import { WalletProvider } from '../components/WalletProvider';
import PWAUpdateManager from '../components/PWAUpdateManager';
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
      <body>
        <WalletProvider>
          {children}
          <PWAUpdateManager />
        </WalletProvider>
      </body>
    </html>
  )
}
