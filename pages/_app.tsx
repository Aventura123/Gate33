import '../components/global.css';
import Layout from '../components/Layout';
import React from 'react';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Criando um cliente para o React Query
const queryClient = new QueryClient();

export default function App({ Component, pageProps }: { Component: React.ComponentType; pageProps: any }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </QueryClientProvider>
    </>
  );
}