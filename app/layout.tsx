import "./globals.css";
import { metadata } from "./metadata";
import { WalletProvider } from '../components/WalletProvider';

// Contract monitoring initialization has been moved to the server-init.ts file
// This prevents multiple conflicting initializations during Next.js renderings

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">      <head>
        <title>Gate33</title>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="preload" href="/logo2.png" as="image" />
      </head>
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
