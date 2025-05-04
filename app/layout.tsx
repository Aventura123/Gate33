import "./globals.css";
import { metadata } from "./metadata";

// A inicialização do monitoramento de contratos foi movida para o arquivo server-init.ts
// Isso evita múltiplas inicializações conflitantes durante as renderizações do Next.js

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
