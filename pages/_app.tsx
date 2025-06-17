import '../components/global.css';
import Layout from '../components/Layout';
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Criando um cliente para o React Query
const queryClient = new QueryClient();

// Configuração centralizada de metadados para todas as páginas
const pageMetadata = {
  // Homepage
  '/': {
    title: 'Gate33 - Your Gateway to Trusted Web3 Opportunities',
    description: 'Your trusted platform for secure work, real opportunities, and user protection in the Web3 job market.'
  },
  // Jobs
  '/jobs': {
    title: 'Gate33 - Jobs',
    description: 'Browse and apply for verified Web3 jobs on Gate33 platform.'
  },
  '/instant-jobs': {
    title: 'Gate33 - Instant Jobs',
    description: 'Quick micro-tasks and instant jobs with immediate payments.'
  },
  // Tools
  '/crypto-tools': {
    title: 'Gate33 - Crypto Tools',
    description: 'Professional cryptocurrency analysis and trading tools.'
  },
  '/nft': {
    title: 'Gate33 - NFT',
    description: 'NFT marketplace and tools for digital assets.'
  },
  // Learn
  '/learn2earn': {
    title: 'Gate33 - Learn2Earn',
    description: 'Learn new skills and earn rewards in the Web3 ecosystem.'
  },
  // Auth
  '/login': {
    title: 'Gate33 - Login',
    description: 'Access your Gate33 account securely.'
  },
  '/seeker-signup': {
    title: 'Gate33 - Job Seeker Signup',
    description: 'Join Gate33 as a job seeker and find your next opportunity.'
  },
  '/company-register': {
    title: 'Gate33 - Company Registration',
    description: 'Register your company and start hiring on Gate33.'
  },
  // Dashboards
  '/seeker-dashboard': {
    title: 'Gate33 - Seeker Dashboard',
    description: 'Manage your job applications and profile.'
  },
  '/company-dashboard': {
    title: 'Gate33 - Company Dashboard',
    description: 'Manage your job postings and company profile.'
  },
  '/admin': {
    title: 'Gate33 - Admin Dashboard',
    description: 'Administrative control panel for Gate33 platform.'
  },
  '/support-dashboard': {
    title: 'Gate33 - Support Dashboard',
    description: 'Customer support and ticket management.'
  },
  // Other pages
  '/donate': {
    title: 'Gate33 - Donate',
    description: 'Support the Gate33 platform development.'
  },
  '/contact': {
    title: 'Gate33 - Contact',
    description: 'Get in touch with the Gate33 team.'
  },
  '/forgot-password': {
    title: 'Gate33 - Forgot Password',
    description: 'Reset your Gate33 account password.'
  },
  '/reset-password': {
    title: 'Gate33 - Reset Password',
    description: 'Create a new password for your Gate33 account.'
  }
};

// Função para obter metadados da página
const getPageMetadata = (pathname: string) => {
  // Primeiro, tenta encontrar uma correspondência exata
  if (pageMetadata[pathname]) {
    return pageMetadata[pathname];
  }
  
  // Se não encontrar, tenta encontrar por segmento base
  const basePath = '/' + pathname.split('/')[1];
  if (pageMetadata[basePath]) {
    return pageMetadata[basePath];
  }
  
  // Default para páginas não mapeadas
  return {
    title: 'Gate33 - Your Gateway to Trusted Web3 Opportunities',
    description: 'Your trusted platform for secure work, real opportunities, and user protection in the Web3 job market.'
  };
};

export default function App({ Component, pageProps }: { Component: React.ComponentType; pageProps: any }) {
  const router = useRouter();
  const metadata = getPageMetadata(router.pathname);

  return (
    <>
      <Head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon-32x32.png" type="image/png" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </QueryClientProvider>
    </>
  );
}