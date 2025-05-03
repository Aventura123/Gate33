import "./globals.css";
import { metadata } from "./metadata";

// Importar apenas no lado do servidor
import { initializeContractMonitoring } from '../utils/contractMonitor';

// Inicializar monitoramento apenas quando estiver executando no servidor e não for desenvolvimento
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  initializeContractMonitoring();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Gate33</title>
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
