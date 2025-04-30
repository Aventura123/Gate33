"use client";

import React from "react";
import Layout from "../../../components/Layout";
import { useRouter } from 'next/navigation';
import FinancialDashboard from "../../../components/admin/FinancialDashboard";
import { useAdminPermissions } from "../../../hooks/useAdminPermissions";

const FinancialPage: React.FC = () => {
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = useAdminPermissions();

  React.useEffect(() => {
    // Verificar se o usuário tem permissão para acessar a página
    if (!permissionsLoading && !hasPermission('canViewAnalytics')) {
      router.replace('/admin/access-denied');
    }
  }, [permissionsLoading, hasPermission, router]);

  if (permissionsLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex bg-gradient-to-br from-orange-900 to-black text-white min-h-screen justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="ml-4 text-gray-300">Loading permissions...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen flex bg-gradient-to-br from-orange-900 to-black text-white min-h-screen flex-col p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-orange-500">Dashboard Financeiro</h1>
          <p className="text-gray-300 mt-2">
            View all revenue from the Gate33 platform, including commissions from instant jobs, 
            job posting payments, and Learn2Earn revenue. Export the data to Excel or PDF for accounting purposes.
          </p>
        </div>

        <FinancialDashboard />
      </main>
    </Layout>
  );
};

export default FinancialPage;