"use client";

import React, { useState, useEffect, Fragment } from "react";
import { collection, getDocs, query, where, Timestamp, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Dialog, Transition } from "@headlessui/react";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Interface para os dados financeiros
interface RevenueItem {
  id: string;
  amount: number;
  currency: string;
  timestamp: Timestamp | Date;
  type: string;
  jobId?: string;
  transactionHash?: string;
  companyId?: string;
  workerId?: string;
  planId?: string;
  jobType?: string;
  status?: string;
  distribution?: {
    feeCollector?: { address: string; amount: number };
    development?: { address: string; amount: number };
    charity?: { address: string; amount: number };
    evolution?: { address: string; amount: number };
    totalDistributed?: number;
    mainRecipient?: { amount: number };
  };
  distributionPercentages?: any;
  distributionAddresses?: any;
}

// Interface para estatísticas
interface RevenueSummary {
  totalRevenue: number;
  instantJobsRevenue: number;
  jobPostingsRevenue: number;
  learn2earnRevenue: number;
  otherRevenue: number;
}

const FinancialDashboard: React.FC = () => {
  const [revenue, setRevenue] = useState<RevenueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'month' | 'quarter' | 'year'>('month');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [summary, setSummary] = useState<RevenueSummary>({
    totalRevenue: 0,
    instantJobsRevenue: 0,
    jobPostingsRevenue: 0,
    learn2earnRevenue: 0,
    otherRevenue: 0
  });
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<RevenueItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Novos estados para filtros avançados e abas
  const [filterJobId, setFilterJobId] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterWallet, setFilterWallet] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'confirmed'|'pending'|'failed'>('confirmed');
  const [activeTab, setActiveTab] = useState<'confirmed'|'pending_failed'>('confirmed');
  const [walletSummary, setWalletSummary] = useState<any>({});
  // Config summary states for each payment system
  const [configJobs, setConfigJobs] = useState<any>(null);
  const [configInstantJobs, setConfigInstantJobs] = useState<any>(null);
  const [configL2L, setConfigL2L] = useState<any>(null);
  // Chart state
  const [chartType, setChartType] = useState<'jobs'|'instantjobs'|'l2l'|'all'>('all');

  // Função para buscar os dados financeiros
  const fetchRevenueData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!db) throw new Error("Firestore não está inicializado");

      // Coleção de comissões de InstantJobs
      const instantJobsCommissionsQuery = query(collection(db, "commissions"));
      const instantJobsCommissionsSnapshot = await getDocs(instantJobsCommissionsQuery);

      // Coleção de pagamentos de JobPosts
      const jobPaymentsQuery = query(collection(db, "payments"));
      const jobPaymentsSnapshot = await getDocs(jobPaymentsQuery);

      // Coleção de participações em Learn2Earn
      const learn2earnPaymentsQuery = query(collection(db, "learn2earnPayments"));
      const learn2earnPaymentsSnapshot = await getDocs(learn2earnPaymentsQuery);

      // Combinando todos os dados
      const allRevenue: RevenueItem[] = [];

      // Processando comissões de InstantJobs
      instantJobsCommissionsSnapshot.forEach((doc) => {
        const data = doc.data();
        allRevenue.push({
          id: doc.id,
          amount: data.amount || 0,
          currency: data.currency || "UNKNOWN",
          timestamp: data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate() 
            : new Date(data.timestamp),
          type: "instantJob",
          jobId: data.jobId,
          transactionHash: data.transactionHash,
          companyId: data.companyId,
          workerId: data.workerId,
          jobType: data.jobType
        });
      });

      // Processando pagamentos de JobPosts
      jobPaymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Adiciona se status for 'confirmed' ou 'completed'
        if (data.status === 'confirmed' || data.status === 'completed') {
          allRevenue.push({
            id: doc.id,
            amount: data.amount || 0,
            currency: data.currency || "UNKNOWN",
            timestamp: data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate() 
              : new Date(data.createdAt),
            type: "jobPost",
            jobId: data.jobId,
            transactionHash: data.transactionHash,
            planId: data.planId,
            status: data.status,
            distribution: data.distribution,
            distributionPercentages: data.distributionPercentages,
            distributionAddresses: data.distributionAddresses,
            companyId: data.companyId
          });
        }
      });

      // Processando pagamentos de Learn2Earn
      learn2earnPaymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        allRevenue.push({
          id: doc.id,
          amount: data.amount || 0,
          currency: data.currency || "UNKNOWN",
          timestamp: data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate() 
            : new Date(data.timestamp),
          type: "learn2earn",
          transactionHash: data.transactionHash
        });
      });

      // Sort by date, newest first
      allRevenue.sort((a, b) => {
        const dateA = getDate(a.timestamp);
        const dateB = getDate(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      // Obtendo a lista de moedas únicas
      const uniqueCurrencies = [...new Set(allRevenue.map(item => item.currency))];
      setCurrencies(uniqueCurrencies);

      // Filtrando com base no período selecionado
      const filteredRevenue = filterRevenueByPeriod(allRevenue, filterPeriod, startDate, endDate);
      setRevenue(filteredRevenue);

      // Calculando o resumo
      calculateSummary(filteredRevenue);

    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
      setError("Falha ao carregar dados financeiros. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get a Date from Date or Timestamp
  function getDate(ts: Date | Timestamp): Date {
    // @ts-ignore
    return ts instanceof Date ? ts : (typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts));
  }

  // Função para filtrar os dados por período
  const filterRevenueByPeriod = (data: RevenueItem[], period: string, start?: string, end?: string): RevenueItem[] => {
    if (period === 'all') return data;
    const now = new Date();
    let startDateFilter: Date;
    if (period === 'month') {
      // Último mês
      startDateFilter = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (period === 'quarter') {
      // Últimos 3 meses
      startDateFilter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (period === 'year') {
      // Último ano
      startDateFilter = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else if (start && end) {
      // Período personalizado
      return data.filter(item => {
        const itemDate = getDate(item.timestamp);
        const startDateTime = new Date(start).getTime();
        const endDateTime = new Date(end).getTime();
        return itemDate.getTime() >= startDateTime && itemDate.getTime() <= endDateTime;
      });
    } else {
      return data;
    }

    return data.filter(item => {
      const itemDate = getDate(item.timestamp);
      return itemDate.getTime() >= startDateFilter.getTime();
    });
  };

  // Função para calcular o resumo financeiro
  const calculateSummary = (filteredData: RevenueItem[]) => {
    const summary = {
      totalRevenue: 0,
      instantJobsRevenue: 0,
      jobPostingsRevenue: 0,
      learn2earnRevenue: 0,
      otherRevenue: 0
    };

    // Verificar se há filtragem por moeda
    const dataToCalculate = filterCurrency === 'all' 
      ? filteredData 
      : filteredData.filter(item => item.currency === filterCurrency);

    dataToCalculate.forEach(item => {
      summary.totalRevenue += item.amount;

      if (item.type === "instantJob") {
        summary.instantJobsRevenue += item.amount;
      } else if (item.type === "jobPost") {
        summary.jobPostingsRevenue += item.amount;
      } else if (item.type === "learn2earn") {
        summary.learn2earnRevenue += item.amount;
      } else {
        summary.otherRevenue += item.amount;
      }
    });

    setSummary(summary);
  };

  // Função para calcular resumo por carteira
  const calculateWalletSummary = (data: RevenueItem[]) => {
    const summary: any = {
      feeCollector: 0,
      development: 0,
      charity: 0,
      evolution: 0
    };
    data.forEach(item => {
      if (item.distribution) {
        if (item.distribution.feeCollector) summary.feeCollector += item.distribution.feeCollector.amount || 0;
        if (item.distribution.development) summary.development += item.distribution.development.amount || 0;
        if (item.distribution.charity) summary.charity += item.distribution.charity.amount || 0;
        if (item.distribution.evolution) summary.evolution += item.distribution.evolution.amount || 0;
      }
    });
    setWalletSummary(summary);
  };

  // Efeito para buscar dados quando o componente é montado
  useEffect(() => {
    fetchRevenueData();
  }, []);

  // Efeito para recalcular quando os filtros mudam
  useEffect(() => {
    if (revenue.length > 0) {
      const filteredData = filterRevenueByPeriod(revenue, filterPeriod, startDate, endDate);
      calculateSummary(filteredData);
    }
  }, [filterPeriod, filterCurrency, startDate, endDate]);

  // Atualizar walletSummary sempre que revenue ou filtros mudarem
  useEffect(() => {
    const filtered = revenue.filter(item =>
      (filterJobId ? item.jobId === filterJobId : true) &&
      (filterCompanyId ? item.companyId === filterCompanyId : true) &&
      (filterWallet ? [item.distribution?.feeCollector?.address, item.distribution?.development?.address, item.distribution?.charity?.address, item.distribution?.evolution?.address].includes(filterWallet) : true)
    );
    calculateWalletSummary(filtered);
  }, [revenue, filterJobId, filterCompanyId, filterWallet]);

  // Fetch config summaries for each payment system
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const jobsDoc = await getDoc(doc(db, "settings", "paymentConfig_jobs"));
        if (jobsDoc.exists()) setConfigJobs(jobsDoc.data());
        const instantJobsDoc = await getDoc(doc(db, "settings", "paymentConfig_instantjobs"));
        if (instantJobsDoc.exists()) setConfigInstantJobs(instantJobsDoc.data());
        const l2lDoc = await getDoc(doc(db, "settings", "paymentConfig_l2l"));
        if (l2lDoc.exists()) setConfigL2L(l2lDoc.data());
      } catch (err) {
        setConfigJobs(null);
        setConfigInstantJobs(null);
        setConfigL2L(null);
      }
    };
    fetchConfigs();
  }, []);

  // Handler para mudar o período de filtro
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterPeriod(e.target.value as 'all' | 'month' | 'quarter' | 'year');
  };

  // Handler para mudar a moeda
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCurrency(e.target.value);
  };

  // Formatar data para exibição
  const formatDate = (date: Date | Timestamp) => {
    const d = getDate(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  // Exportar para Excel
  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const dataToExport = revenue
        .filter(item => filterCurrency === 'all' || item.currency === filterCurrency)
        .map(item => ({
          ID: item.id,
          Type: getTypeDescription(item.type),
          Amount: item.amount,
          Currency: item.currency,
          Date: formatDate(item.timestamp),
          Status: item.status || 'N/A',
          'Transaction Hash': item.transactionHash || 'N/A',
          'Job ID': item.jobId || 'N/A',
          'Company ID': item.companyId || 'N/A',
          'Worker ID': item.workerId || 'N/A',
          'FeeCollector Amount': item.distribution?.feeCollector?.amount ?? '',
          'FeeCollector Address': item.distribution?.feeCollector?.address ?? '',
          'Development Amount': item.distribution?.development?.amount ?? '',
          'Development Address': item.distribution?.development?.address ?? '',
          'Charity Amount': item.distribution?.charity?.amount ?? '',
          'Charity Address': item.distribution?.charity?.address ?? '',
          'Evolution Amount': item.distribution?.evolution?.amount ?? '',
          'Evolution Address': item.distribution?.evolution?.address ?? '',
          'Total Distributed': item.distribution?.totalDistributed ?? '',
          'Main Recipient Amount': item.distribution?.mainRecipient?.amount ?? '',
          'Fee %': item.distributionPercentages?.feePercentage ? (item.distributionPercentages.feePercentage/10) : '',
          'Development %': item.distributionPercentages?.developmentPercentage ? (item.distributionPercentages.developmentPercentage/10) : '',
          'Charity %': item.distributionPercentages?.charityPercentage ? (item.distributionPercentages.charityPercentage/10) : '',
          'Evolution %': item.distributionPercentages?.evolutionPercentage ? (item.distributionPercentages.evolutionPercentage/10) : '',
        }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
      // Add summary
      const summaryData = [
        { Category: "Total Revenue (confirmed only)", Value: summary.totalRevenue },
        { Category: "FeeCollector", Value: walletSummary.feeCollector },
        { Category: "Development", Value: walletSummary.development },
        { Category: "Charity", Value: walletSummary.charity },
        { Category: "Evolution", Value: walletSummary.evolution }
      ];
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
      // Download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const date = new Date();
      const dateString = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
      saveAs(data, `gate33-financial-${dateString}.xlsx`);
    } catch (error) {
      alert('Error exporting to Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar para PDF
  const exportToPdf = async () => {
    setIsExporting(true);
    try {
      // Criar um novo documento PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();
      
      // Adicionar a fonte
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Definir as margens
      const margin = 50;
      let y = height - margin;
      const lineHeight = 18;
      
      // Adicionar título
      page.drawText('Gate33 - Financial Report', { x: margin, y, size: 20, font: boldFont, color: rgb(1, 0.5, 0) });
      
      y -= 30;
      
      // Adicionar data do relatório
      const currentDate = new Date().toLocaleDateString();
      page.drawText(`Report generated: ${currentDate}`, { x: margin, y, size: 12, font, color: rgb(1,1,1) });
      
      y -= 20;
      
      // Adicionar resumo
      page.drawText('Summary', { x: margin, y, size: 14, font: boldFont, color: rgb(1, 0.5, 0) });
      
      y -= 18;
      page.drawText(`Total Revenue (confirmed): ${summary.totalRevenue.toFixed(2)}`, { x: margin, y, size: 12, font, color: rgb(1,1,1) });
      y -= 16;
      page.drawText(`FeeCollector: ${walletSummary.feeCollector?.toFixed(6) || 0}`, { x: margin, y, size: 12, font, color: rgb(1,1,1) });
      y -= 16;
      page.drawText(`Development: ${walletSummary.development?.toFixed(6) || 0}`, { x: margin, y, size: 12, font, color: rgb(1,1,1) });
      y -= 16;
      page.drawText(`Charity: ${walletSummary.charity?.toFixed(6) || 0}`, { x: margin, y, size: 12, font, color: rgb(1,1,1) });
      y -= 16;
      page.drawText(`Evolution: ${walletSummary.evolution?.toFixed(6) || 0}`, { x: margin, y, size: 12, font, color: rgb(1,1,1) });
      y -= 24;
      
      // Adicionar tabela de dados
      page.drawText('Transactions (all statuses)', { x: margin, y, size: 14, font: boldFont, color: rgb(1, 0.5, 0) });
      
      y -= 18;
      
      // Cabeçalhos da tabela
      const headers = ['Type','Amount','Currency','Date','Status','TxHash','JobID','CompanyID','Fee','Dev','Charity','Evol','Main'];
      const colWidths = [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60];
      
      let x = margin;
      headers.forEach((header, i) => {
        page.drawText(header, { x, y, size: 10, font: boldFont, color: rgb(1,1,1) });
        x += colWidths[i];
      });
      
      y -= lineHeight;
      
      // Limitar a quantidade de itens para caber na página
      const maxItems = 20;
      const dataToShow = revenue
        .filter(item =>
          (chartType === 'all' ||
          (chartType === 'jobs' && item.type === 'jobPost') ||
          (chartType === 'instantjobs' && item.type === 'instantJob') ||
          (chartType === 'l2l' && item.type === 'learn2earn')) &&
          (activeTab === 'confirmed' ? item.status === 'confirmed' || item.status === 'completed' : item.status === 'pending' || item.status === 'failed') &&
          (filterCurrency === 'all' || item.currency === filterCurrency) &&
          (filterJobId ? item.jobId === filterJobId : true) &&
          (filterCompanyId ? item.companyId === filterCompanyId : true) &&
          (filterWallet ? [
            item.distribution?.feeCollector?.address,
            item.distribution?.development?.address,
            item.distribution?.charity?.address,
            item.distribution?.evolution?.address
          ].includes(filterWallet) : true)
        )
        .slice(0, maxItems);
      
      // Adicionar dados da tabela
      dataToShow.forEach(item => {
        x = margin;
        
        page.drawText(getTypeDescription(item.type), { x, y, size: 9, font, color: rgb(1,1,1) }); x += colWidths[0];
        page.drawText(item.amount.toFixed(2), { x, y, size: 9, font, color: rgb(1,1,1) }); x += colWidths[1];
        page.drawText(item.currency, { x, y, size: 9, font, color: rgb(1,1,1) }); x += colWidths[2];
        page.drawText(item.timestamp ? formatDate(item.timestamp) : '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[3];
        page.drawText(item.status || '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[4];
        page.drawText(item.transactionHash ? item.transactionHash.substring(0,8) : '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[5];
        page.drawText(item.jobId || '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[6];
        page.drawText(item.companyId || '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[7];
        page.drawText(item.distribution?.feeCollector?.amount?.toFixed(4) || '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[8];
        page.drawText(item.distribution?.development?.amount?.toFixed(4) || '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[9];
        page.drawText(item.distribution?.charity?.amount?.toFixed(4) || '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[10];
        page.drawText(item.distribution?.evolution?.amount?.toFixed(4) || '', { x, y, size: 8, font, color: rgb(1,1,1) }); x += colWidths[11];
        page.drawText(item.distribution?.mainRecipient?.amount?.toFixed(4) || '', { x, y, size: 8, font, color: rgb(1,1,1) });
        
        y -= lineHeight;
        
        // Verificar se precisa de nova página
        if (y < margin + 60) {
          const newPage = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
      });
      
      // Se houver mais dados do que podemos mostrar
      if (revenue.length > maxItems) {
        y -= 10;
        page.drawText(`...and ${revenue.length - maxItems} more transactions.`, { x: margin, y, size: 9, font, color: rgb(1,1,1) });
      }
      
      // Adicionar rodapé
      y = margin;
      page.drawText('Gate33 - Accounting Report', { x: margin, y, size: 10, font, color: rgb(1,1,1) });

      // Gerar o arquivo PDF
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Obter a data atual para o nome do arquivo
      const date = new Date();
      const dateString = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;

      saveAs(pdfBlob, `gate33-financial-${dateString}.pdf`);

    } catch (error) {
      alert('Error exporting to PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Função para obter descrição amigável do tipo
  const getTypeDescription = (type: string): string => {
    switch(type) {
      case 'instantJob': return 'Instant Job';
      case 'jobPost': return 'Job Posting';
      case 'learn2earn': return 'Learn2Earn';
      default: return type;
    }
  };

  const openModal = (item: RevenueItem) => {
    setSelectedTransaction(item);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  // Prepare chart data
  const getChartData = () => {
    // Group by day and type
    const filtered = revenue.filter(item =>
      chartType === 'all' ||
      (chartType === 'jobs' && item.type === 'jobPost') ||
      (chartType === 'instantjobs' && item.type === 'instantJob') ||
      (chartType === 'l2l' && item.type === 'learn2earn')
    );
    const byDay: Record<string, { jobs: number, instantjobs: number, l2l: number }> = {};
    filtered.forEach(item => {
      const d = getDate(item.timestamp).toISOString().slice(0, 10);
      if (!byDay[d]) byDay[d] = { jobs: 0, instantjobs: 0, l2l: 0 };
      if (item.type === 'jobPost') byDay[d].jobs += item.amount;
      if (item.type === 'instantJob') byDay[d].instantjobs += item.amount;
      if (item.type === 'learn2earn') byDay[d].l2l += item.amount;
    });
    const labels = Object.keys(byDay).sort();
    return {
      labels,
      datasets: [
        {
          label: 'Jobs',
          data: labels.map(l => byDay[l].jobs),
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34,211,238,0.2)',
        },
        {
          label: 'InstantJobs',
          data: labels.map(l => byDay[l].instantjobs),
          borderColor: '#f59e42',
          backgroundColor: 'rgba(245,158,66,0.2)',
        },
        {
          label: 'Learn2Earn',
          data: labels.map(l => byDay[l].l2l),
          borderColor: '#f87171',
          backgroundColor: 'rgba(248,113,113,0.2)',
        }
      ]
    };
  };

  return (
    <div className="p-6 bg-black/50 rounded-lg">
      {/* Config summary cards for each payment system */}
      {configJobs && renderConfigCard(configJobs, 'Jobs')}
      {configInstantJobs && renderConfigCard(configInstantJobs, 'InstantJobs')}
      {configL2L && renderConfigCard(configL2L, 'Learn2Earn')}
      <h2 className="text-2xl font-bold text-orange-500 mb-6">Financial Dashboard</h2>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Period</label>
          <select
            value={filterPeriod}
            onChange={handlePeriodChange}
            className="w-full p-2 bg-black border border-gray-600 rounded-md text-white"
          >
            <option value="all">All data</option>
            <option value="month">Last month</option>
            <option value="quarter">Last 3 months</option>
            <option value="year">Last year</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
          <select
            value={filterCurrency}
            onChange={handleCurrencyChange}
            className="w-full p-2 bg-black border border-gray-600 rounded-md text-white"
          >
            <option value="all">All currencies</option>
            {currencies.map(currency => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 bg-black border border-gray-600 rounded-md text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 bg-black border border-gray-600 rounded-md text-white"
          />
        </div>
      </div>
      {/* Advanced filter and tabs */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <button
          className={`px-4 py-2 rounded font-bold ${activeTab==='confirmed' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          onClick={()=>setActiveTab('confirmed')}
        >Confirmed Transactions</button>
        <button
          className={`px-4 py-2 rounded font-bold ${activeTab==='pending_failed' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          onClick={()=>setActiveTab('pending_failed')}
        >Pending/Failed</button>
        <input
          type="text"
          placeholder="Filter by Job ID"
          value={filterJobId}
          onChange={e=>setFilterJobId(e.target.value)}
          className="ml-2 p-2 rounded bg-gray-800 text-white border border-gray-600"
        />
        <input
          type="text"
          placeholder="Filter by Company ID"
          value={filterCompanyId}
          onChange={e=>setFilterCompanyId(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white border border-gray-600"
        />
        <input
          type="text"
          placeholder="Filter by Wallet Address"
          value={filterWallet}
          onChange={e=>setFilterWallet(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white border border-gray-600"
        />
      </div>
      {/* Wallet summary */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-3 rounded text-white">
          <div className="font-bold text-orange-400">FeeCollector</div>
          <div>{walletSummary.feeCollector?.toFixed(6) || 0}</div>
        </div>
        <div className="bg-gray-800 p-3 rounded text-white">
          <div className="font-bold text-orange-400">Development</div>
          <div>{walletSummary.development?.toFixed(6) || 0}</div>
        </div>
        <div className="bg-gray-800 p-3 rounded text-white">
          <div className="font-bold text-orange-400">Charity</div>
          <div>{walletSummary.charity?.toFixed(6) || 0}</div>
        </div>
        <div className="bg-gray-800 p-3 rounded text-white">
          <div className="font-bold text-orange-400">Evolution</div>
          <div>{walletSummary.evolution?.toFixed(6) || 0}</div>
        </div>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-r from-purple-800 to-purple-600 p-4 rounded-lg shadow-lg">
          <h3 className="text-white text-lg font-semibold mb-2">Total Revenue</h3>
          <p className="text-white text-2xl font-bold">{summary.totalRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-4 rounded-lg shadow-lg">
          <h3 className="text-white text-lg font-semibold mb-2">Instant Jobs</h3>
          <p className="text-white text-2xl font-bold">{summary.instantJobsRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
        <div className="bg-gradient-to-r from-green-800 to-green-600 p-4 rounded-lg shadow-lg">
          <h3 className="text-white text-lg font-semibold mb-2">Job Postings</h3>
          <p className="text-white text-2xl font-bold">{summary.jobPostingsRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
        <div className="bg-gradient-to-r from-orange-800 to-orange-600 p-4 rounded-lg shadow-lg">
          <h3 className="text-white text-lg font-semibold mb-2">Learn2Earn</h3>
          <p className="text-white text-2xl font-bold">{summary.learn2earnRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
        <div className="bg-gradient-to-r from-red-800 to-red-600 p-4 rounded-lg shadow-lg">
          <h3 className="text-white text-lg font-semibold mb-2">Other</h3>
          <p className="text-white text-2xl font-bold">{summary.otherRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
      </div>
      {/* Evolution Chart */}
      <div className="mb-8 bg-black/30 p-4 rounded-lg max-h-300">
        <div className="flex gap-2 mb-2">
          <button className={`px-3 py-1 rounded ${chartType==='all' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`} onClick={()=>setChartType('all')}>All</button>
          <button className={`px-3 py-1 rounded ${chartType==='jobs' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`} onClick={()=>setChartType('jobs')}>Jobs</button>
          <button className={`px-3 py-1 rounded ${chartType==='instantjobs' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`} onClick={()=>setChartType('instantjobs')}>InstantJobs</button>
          <button className={`px-3 py-1 rounded ${chartType==='l2l' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`} onClick={()=>setChartType('l2l')}>Learn2Earn</button>
        </div>
        <div className="chart-container">
          <Line 
            data={getChartData()} 
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { 
                  position: 'top' as const,
                  labels: {
                    boxWidth: 12,
                    font: { size: 11 }
                  }
                },
                title: { 
                  display: true, 
                  text: 'Revenue Evolution',
                  font: { size: 14 }
                }
              },
              scales: {
                y: { 
                  beginAtZero: true,
                  ticks: { font: { size: 10 } }
                },
                x: {
                  ticks: { font: { size: 10 } }
                }
              }
            }} 
          />
        </div>
      </div>
      {/* Export buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={exportToExcel}
          disabled={isExporting || isLoading}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center disabled:opacity-50"
        >
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Excel
        </button>
        
        <button
          onClick={exportToPdf}
          disabled={isExporting || isLoading}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center disabled:opacity-50"
        >
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export PDF
        </button>
      </div>
      {/* Transaction table with status filter and advanced filters */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading financial data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
            <button 
              onClick={fetchRevenueData}
              className="mt-4 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
            >
              Try again
            </button>
          </div>
        ) : revenue.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-300">No financial data found for the selected period.</p>
          </div>
        ) : (
          <table className="min-w-full bg-black/30 rounded-lg overflow-hidden">
            <thead className="bg-gray-800">
              <tr>
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-left">Amount</th>
                <th className="py-3 px-4 text-left">Currency</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Transaction ID</th>
                <th className="py-3 px-4 text-left">Details</th>
                <th className="py-3 px-4 text-left">Distribution</th>
                <th className="py-3 px-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {revenue
                .filter(item =>
                  (activeTab === 'confirmed'
                    ? item.status === 'confirmed' || item.status === 'completed'
                    : item.status === 'pending' || item.status === 'failed') &&
                  (filterCurrency === 'all' || item.currency === filterCurrency) &&
                  (filterJobId ? item.jobId === filterJobId : true) &&
                  (filterCompanyId ? item.companyId === filterCompanyId : true) &&
                  (filterWallet ? [item.distribution?.feeCollector?.address, item.distribution?.development?.address, item.distribution?.charity?.address, item.distribution?.evolution?.address].includes(filterWallet) : true)
                )
                .map((item) => (
                  <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                    <td className="py-3 px-4">{getTypeDescription(item.type)}</td>
                    <td className="py-3 px-4">{item.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">{item.currency}</td>
                    <td className="py-3 px-4">{formatDate(item.timestamp)}</td>
                    <td className="py-3 px-4">
                      {item.transactionHash ? (
                        <span className="text-xs font-mono text-gray-400">
                          {item.transactionHash.substring(0, 8)}...{item.transactionHash.substring(item.transactionHash.length - 8)}
                        </span>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.jobId && <span className="text-gray-400 mr-2">Job: {item.jobId.substring(0, 6)}...</span>}
                      {item.companyId && <span className="text-gray-400 mr-2">Company: {item.companyId.substring(0, 6)}...</span>}
                      {item.workerId && <span className="text-gray-400">Worker: {item.workerId.substring(0, 6)}...</span>}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-xs"
                        onClick={() => openModal(item)}
                      >
                        Details
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${item.status==='confirmed' ? 'bg-green-700 text-white' : item.status==='pending' ? 'bg-yellow-700 text-white' : 'bg-red-700 text-white'}`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal de Detalhamento da Transação */}
      <Transition.Root show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="fixed z-50 inset-0 overflow-y-auto" onClose={closeModal}>
          <div className="flex items-center justify-center min-h-screen px-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" />
            </Transition.Child>
            <span className="inline-block align-middle h-screen" aria-hidden="true">&#8203;</span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block bg-gray-900 rounded-lg px-8 py-6 text-left overflow-hidden shadow-xl transform transition-all align-middle max-w-lg w-full">
                <Dialog.Title as="h3" className="text-lg leading-6 font-bold text-orange-400 mb-4">
                  Transaction Distribution
                </Dialog.Title>
                {selectedTransaction && selectedTransaction.distribution ? (
                  <div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-300">Total amount:</span> {selectedTransaction.amount} {selectedTransaction.currency}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-300">Transaction ID:</span> {selectedTransaction.transactionHash}
                    </div>
                    <div className="mb-4">
                      <span className="font-semibold text-gray-300">Distribution:</span>
                      <ul className="mt-2 text-sm text-gray-200">
                        <li>
                          <span className="font-semibold">FeeCollector:</span> {selectedTransaction.distribution.feeCollector?.amount?.toFixed(6)} {selectedTransaction.currency} <br />
                          <span className="text-xs text-gray-400">{selectedTransaction.distribution.feeCollector?.address}</span>
                        </li>
                        <li className="mt-2">
                          <span className="font-semibold">Development:</span> {selectedTransaction.distribution.development?.amount?.toFixed(6)} {selectedTransaction.currency} <br />
                          <span className="text-xs text-gray-400">{selectedTransaction.distribution.development?.address}</span>
                        </li>
                        <li className="mt-2">
                          <span className="font-semibold">Charity:</span> {selectedTransaction.distribution.charity?.amount?.toFixed(6)} {selectedTransaction.currency} <br />
                          <span className="text-xs text-gray-400">{selectedTransaction.distribution.charity?.address}</span>
                        </li>
                        <li className="mt-2">
                          <span className="font-semibold">Evolution:</span> {selectedTransaction.distribution.evolution?.amount?.toFixed(6)} {selectedTransaction.currency} <br />
                          <span className="text-xs text-gray-400">{selectedTransaction.distribution.evolution?.address}</span>
                        </li>
                        <li className="mt-2">
                          <span className="font-semibold">Total distributed:</span> {selectedTransaction.distribution.totalDistributed?.toFixed(6)} {selectedTransaction.currency}
                        </li>
                        <li className="mt-2">
                          <span className="font-semibold">Main recipient:</span> {selectedTransaction.distribution.mainRecipient?.amount?.toFixed(6)} {selectedTransaction.currency}
                        </li>
                      </ul>
                    </div>
                    {selectedTransaction.distributionPercentages && (
                      <div className="mb-2 text-xs text-gray-400">
                        <span className="font-semibold text-gray-300">Percentages used:</span> <br />
                        Fee: {selectedTransaction.distributionPercentages.feePercentage / 10}% | Development: {selectedTransaction.distributionPercentages.developmentPercentage / 10}% | Charity: {selectedTransaction.distributionPercentages.charityPercentage / 10}% | Evolution: {selectedTransaction.distributionPercentages.evolutionPercentage / 10}%
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400">No distribution data for this transaction.</div>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
      {/* Show total count */}
      {!isLoading && !error && revenue.length > 0 && (
        <div className="mt-4 text-right text-gray-400">
          Showing {revenue.filter(item => filterCurrency === 'all' || item.currency === filterCurrency).length} transactions
        </div>
      )}
    </div>
  );
};

// Helper to render config card (now shows all wallet addresses if present)
const renderConfigCard = (config: any, label: string) => (
  <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-orange-900 to-black text-white border border-orange-700">
    <div className="font-bold text-lg mb-2 text-orange-400">Current Payment Distribution Settings ({label})</div>
    <div className="text-sm">
      <div><b>FeeCollector:</b> {config?.receiverAddress || config?.feeCollectorAddress}</div>
      {config?.developmentWalletAddress && <div><b>Development:</b> {config.developmentWalletAddress}</div>}
      {config?.charityWalletAddress && <div><b>Charity:</b> {config.charityWalletAddress}</div>}
      {config?.evolutionWalletAddress && <div><b>Evolution:</b> {config.evolutionWalletAddress}</div>}
      {config?.instantJobsFeeCollector && <div><b>FeeCollector (InstantJobs):</b> {config.instantJobsFeeCollector}</div>}
      {config?.l2lFeeCollector && <div><b>FeeCollector (L2L):</b> {config.l2lFeeCollector}</div>}
      <div><b>Service Fee:</b> {config?.serviceFee}%</div>
      <div><b>Transaction Timeout:</b> {config?.transactionTimeout/1000} seconds</div>
      <div><b>Contracts:</b> ETH: {config?.contracts?.ethereum} | Polygon: {config?.contracts?.polygon} | BSC: {config?.contracts?.binance}</div>
      <div><b>Last Update:</b> {config?.updatedAt ? (typeof config.updatedAt === 'object' && 'seconds' in config.updatedAt ? new Date(config.updatedAt.seconds * 1000).toLocaleString() : new Date(config.updatedAt).toLocaleString()) : 'N/A'}</div>
    </div>
  </div>
);

export default FinancialDashboard;