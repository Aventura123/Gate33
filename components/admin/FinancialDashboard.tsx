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

// Interface for financial data
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

// Interface for statistics
interface RevenueSummary {
  totalRevenue: number;
  instantJobsRevenue: number;
  jobPostingsRevenue: number;
  learn2earnRevenue: number;
  otherRevenue: number;
}

const FinancialDashboard: React.FC = () => {
  const [revenue, setRevenue] = useState<RevenueItem[]>([]);  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'month' | 'quarter' | 'year'>('month');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showTooManyAlert, setShowTooManyAlert] = useState<boolean>(false);
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
  // State for pagination - moved from nested IIFE to component top level
  const [currentPage, setCurrentPage] = useState(0);
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
  // Function to fetch financial data
  const fetchRevenueData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!db) throw new Error("Firestore is not initialized");      // Collection of InstantJobs commissions
      const instantJobsCommissionsQuery = query(collection(db, "commissions"));
      const instantJobsCommissionsSnapshot = await getDocs(instantJobsCommissionsQuery);

      // Collection of JobPosts payments
      const jobPaymentsQuery = query(collection(db, "payments"));
      const jobPaymentsSnapshot = await getDocs(jobPaymentsQuery);

      // Collection of Learn2Earn participations
      const learn2earnPaymentsQuery = query(collection(db, "learn2earnPayments"));
      const learn2earnPaymentsSnapshot = await getDocs(learn2earnPaymentsQuery);

      // Combining all data
      const allRevenue: RevenueItem[] = [];      // Processing InstantJobs commissions
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
      });      // Processing JobPosts payments
      jobPaymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Add if status is 'confirmed' or 'completed'
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
      });      // Processing Learn2Earn payments
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
      });      // Getting the list of unique currencies
      const uniqueCurrencies = [...new Set(allRevenue.map(item => item.currency))];
      setCurrencies(uniqueCurrencies);

      // Filtering based on the selected period
      const filteredRevenue = filterRevenueByPeriod(allRevenue, filterPeriod, startDate, endDate);
      setRevenue(filteredRevenue);

      // Calculating the summary
      calculateSummary(filteredRevenue);    } catch (error) {
      console.error("Error fetching financial data:", error);
      setError("Failed to load financial data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get a Date from Date or Timestamp
  function getDate(ts: Date | Timestamp): Date {
    // @ts-ignore
    return ts instanceof Date ? ts : (typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts));
  }
  // Function to filter data by period
  const filterRevenueByPeriod = (data: RevenueItem[], period: string, start?: string, end?: string): RevenueItem[] => {
    if (period === 'all') return data;
    const now = new Date();    let startDateFilter: Date;
    if (period === 'month') {
      // Last month
      startDateFilter = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (period === 'quarter') {
      // Last 3 months
      startDateFilter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (period === 'year') {
      // Last year
      startDateFilter = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else if (start && end) {
      // Custom period
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
  // Function to calculate the financial summary
  const calculateSummary = (filteredData: RevenueItem[]) => {
    const summary = {
      totalRevenue: 0,
      instantJobsRevenue: 0,
      jobPostingsRevenue: 0,
      learn2earnRevenue: 0,
      otherRevenue: 0
    };    // Check if there is currency filtering
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
  // Function to calculate wallet summary
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
  // Effect to fetch data when component is mounted
  useEffect(() => {
    fetchRevenueData();
  }, []);
  // Effect to recalculate when filters change
  useEffect(() => {
    if (revenue.length > 0) {
      const filteredData = filterRevenueByPeriod(revenue, filterPeriod, startDate, endDate);
      calculateSummary(filteredData);
        // Check if there are many transactions and if the period filter is 'all'
      const showAlert = filteredData.length > 100 && filterPeriod === 'all' && !startDate && !endDate;
      setShowTooManyAlert(showAlert);
    }
  }, [filterPeriod, filterCurrency, startDate, endDate, revenue]);

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
        // Removido a busca por configurações de Learn2Earn
      } catch (err) {
        setConfigJobs(null);
        setConfigInstantJobs(null);
        // Removido o configL2L
      }
    };
    fetchConfigs();
  }, []);
  // Handler to change filter period
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterPeriod(e.target.value as 'all' | 'month' | 'quarter' | 'year');
  };

  // Handler to change currency
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCurrency(e.target.value);
  };

  // Format date for display
  const formatDate = (date: Date | Timestamp) => {
    const d = getDate(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };
  // Export to Excel
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
  // Export to PDF
  const exportToPdf = async () => {
    setIsExporting(true);
    try {      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();
      
      // Add font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Define margins
      const margin = 50;
      let y = height - margin;
      const lineHeight = 18;
      
      // Add title
      page.drawText('Gate33 - Financial Report', { x: margin, y, size: 20, font: boldFont, color: rgb(1, 0.5, 0) });
      
      y -= 30;
        // Add report date
      const currentDate = new Date().toLocaleDateString();
      page.drawText(`Report generated: ${currentDate}`, { x: margin, y, size: 12, font, color: rgb(1,1,1) });
      
      y -= 20;
      
      // Add summary
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
        // Add data table
      page.drawText('Transactions (all statuses)', { x: margin, y, size: 14, font: boldFont, color: rgb(1, 0.5, 0) });
      
      y -= 18;
      
      // Table headers
      const headers = ['Type','Amount','Currency','Date','Status','TxHash','JobID','CompanyID','Fee','Dev','Charity','Evol','Main'];
      const colWidths = [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60];
      
      let x = margin;
      headers.forEach((header, i) => {
        page.drawText(header, { x, y, size: 10, font: boldFont, color: rgb(1,1,1) });
        x += colWidths[i];
      });
      
      y -= lineHeight;
        // Limit the number of items to fit on the page
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
        // Add table data
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
          // Check if a new page is needed
        if (y < margin + 60) {
          const newPage = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
      });
        // If there are more data than we can show
      if (revenue.length > maxItems) {
        y -= 10;
        page.drawText(`...and ${revenue.length - maxItems} more transactions.`, { x: margin, y, size: 9, font, color: rgb(1,1,1) });
      }
        // Add footer
      y = margin;
      page.drawText('Gate33 - Accounting Report', { x: margin, y, size: 10, font, color: rgb(1,1,1) });

      // Generate PDF file
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
  // Function to get friendly description of the type
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
  };  return (
    <div className="p-3 md:p-6 bg-black/60 rounded-xl border border-gray-700">
      {/* Config summary cards for each payment system */}
      {configJobs && renderConfigCard(configJobs, 'Jobs')}
      {configInstantJobs && renderConfigCard(configInstantJobs, 'InstantJobs')}{/* Filters - optimized for mobile */}      
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 md:mb-2">Period</label>
          <select
            value={filterPeriod}
            onChange={handlePeriodChange}
            className="w-full p-2 text-sm md:text-base bg-black/70 border border-gray-700 hover:border-orange-500 rounded-lg text-white"
          >
            <option value="all">All data</option>
            <option value="month">Last month</option>
            <option value="quarter">Last 3 months</option>
            <option value="year">Last year</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 md:mb-2">Currency</label>
          <select
            value={filterCurrency}
            onChange={handleCurrencyChange}
            className="w-full p-2 text-sm md:text-base bg-black/70 border border-gray-700 hover:border-orange-500 rounded-lg text-white"
          >
            <option value="all">All currencies</option>
            {currencies.map(currency => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 md:mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 text-sm md:text-base bg-black/70 border border-gray-700 hover:border-orange-500 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 md:mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 text-sm md:text-base bg-black/70 border border-gray-700 hover:border-orange-500 rounded-lg text-white"
          />
        </div>
      </div>      {/* Advanced filter and tabs - optimized for mobile */}
      <div className="mb-6">
        <div className="flex mb-3 gap-2">
          <button
            className={`flex-1 px-3 py-2 rounded-lg font-semibold shadow text-xs md:text-sm ${activeTab==='confirmed' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-black/70 hover:bg-black/80 text-gray-300 border border-gray-700'}`}
            onClick={()=>setActiveTab('confirmed')}
          >Confirmed</button>
          <button
            className={`flex-1 px-3 py-2 rounded-lg font-semibold shadow text-xs md:text-sm ${activeTab==='pending_failed' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-black/70 hover:bg-black/80 text-gray-300 border border-gray-700'}`}
            onClick={()=>setActiveTab('pending_failed')}
          >Pending/Failed</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
          <input
            type="text"
            placeholder="Filter by Job ID"
            value={filterJobId}
            onChange={e=>setFilterJobId(e.target.value)}
            className="p-2 text-sm rounded-lg bg-black/70 text-white border border-gray-700 hover:border-orange-500"
          />
          <input
            type="text"
            placeholder="Filter by Company ID"
            value={filterCompanyId}
            onChange={e=>setFilterCompanyId(e.target.value)}
            className="p-2 text-sm rounded-lg bg-black/70 text-white border border-gray-700 hover:border-orange-500"
          />
          <input
            type="text"
            placeholder="Filter by Wallet Address"
            value={filterWallet}
            onChange={e=>setFilterWallet(e.target.value)}
            className="p-2 text-sm rounded-lg bg-black/70 text-white border border-gray-700 hover:border-orange-500"
          />
        </div>
      </div>{/* Wallet summary - optimized for mobile */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-black/30 p-3 md:p-4 rounded-lg border border-gray-700 text-white shadow">
          <div className="font-bold text-orange-400 text-sm md:text-base mb-1">FeeCollector</div>
          <div className="text-white text-sm md:text-base overflow-hidden text-ellipsis">{walletSummary.feeCollector?.toFixed(6) || 0}</div>
        </div>
        <div className="bg-black/30 p-3 md:p-4 rounded-lg border border-gray-700 text-white shadow">
          <div className="font-bold text-orange-400 text-sm md:text-base mb-1">Development</div>
          <div className="text-white text-sm md:text-base overflow-hidden text-ellipsis">{walletSummary.development?.toFixed(6) || 0}</div>
        </div>
        <div className="bg-black/30 p-3 md:p-4 rounded-lg border border-gray-700 text-white shadow">
          <div className="font-bold text-orange-400 text-sm md:text-base mb-1">Charity</div>
          <div className="text-white text-sm md:text-base overflow-hidden text-ellipsis">{walletSummary.charity?.toFixed(6) || 0}</div>
        </div>
        <div className="bg-black/30 p-3 md:p-4 rounded-lg border border-gray-700 text-white shadow">
          <div className="font-bold text-orange-400 text-sm md:text-base mb-1">Evolution</div>
          <div className="text-white text-sm md:text-base overflow-hidden text-ellipsis">{walletSummary.evolution?.toFixed(6) || 0}</div>
        </div>
      </div>{/* Summary cards - improved for mobile with smaller padding and font sizes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
        <div className="bg-black/70 border border-purple-700 p-3 md:p-6 rounded-xl shadow">
          <h3 className="text-orange-500 text-base md:text-xl font-bold mb-1 md:mb-3">Total Revenue</h3>
          <p className="text-white text-lg md:text-2xl font-bold">{summary.totalRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
        <div className="bg-black/70 border border-blue-700 p-3 md:p-6 rounded-xl shadow">
          <h3 className="text-orange-500 text-base md:text-xl font-bold mb-1 md:mb-3">Instant Jobs</h3>
          <p className="text-white text-lg md:text-2xl font-bold">{summary.instantJobsRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
        <div className="bg-black/70 border border-green-700 p-3 md:p-6 rounded-xl shadow">
          <h3 className="text-orange-500 text-base md:text-xl font-bold mb-1 md:mb-3">Job Postings</h3>
          <p className="text-white text-lg md:text-2xl font-bold">{summary.jobPostingsRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
        <div className="bg-black/70 border border-orange-700 p-3 md:p-6 rounded-xl shadow">
          <h3 className="text-orange-500 text-base md:text-xl font-bold mb-1 md:mb-3">Learn2Earn</h3>
          <p className="text-white text-lg md:text-2xl font-bold">{summary.learn2earnRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
        <div className="bg-black/70 border border-red-700 p-3 md:p-6 rounded-xl shadow">
          <h3 className="text-orange-500 text-base md:text-xl font-bold mb-1 md:mb-3">Other</h3>
          <p className="text-white text-lg md:text-2xl font-bold">{summary.otherRevenue.toFixed(2)} {filterCurrency !== 'all' ? filterCurrency : ''}</p>
        </div>
      </div>      {/* Evolution Chart - optimized for mobile */}
      <div className="mb-10 bg-black/60 p-3 md:p-6 rounded-xl border border-gray-700 shadow">
        <h3 className="text-lg md:text-xl font-bold text-orange-500 mb-3 md:mb-4">Revenue Evolution</h3>
        <div className="grid grid-cols-4 gap-1 md:flex md:gap-3 mb-4">
          <button className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold ${chartType==='all' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-black/70 hover:bg-black/80 text-gray-300 border border-gray-700'}`} onClick={()=>setChartType('all')}>All</button>
          <button className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold ${chartType==='jobs' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-black/70 hover:bg-black/80 text-gray-300 border border-gray-700'}`} onClick={()=>setChartType('jobs')}>Jobs</button>
          <button className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold ${chartType==='instantjobs' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-black/70 hover:bg-black/80 text-gray-300 border border-gray-700'}`} onClick={()=>setChartType('instantjobs')}>InstantJobs</button>
          <button className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold ${chartType==='l2l' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-black/70 hover:bg-black/80 text-gray-300 border border-gray-700'}`} onClick={()=>setChartType('l2l')}>L2Earn</button>
        </div>
        <div className="chart-container bg-black/30 p-2 md:p-4 rounded-lg">
          <Line 
            data={getChartData()} 
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { 
                  position: 'top' as const,
                  labels: {
                    boxWidth: 10,
                    font: { size: window.innerWidth < 768 ? 8 : 11 }
                  }
                },
                title: { 
                  display: false
                }
              },
              scales: {
                y: { 
                  beginAtZero: true,
                  ticks: { font: { size: window.innerWidth < 768 ? 8 : 10 } }
                },
                x: {
                  ticks: { 
                    font: { size: window.innerWidth < 768 ? 8 : 10 },
                    maxRotation: 45,
                    minRotation: 45
                  }
                }
              }
            }} 
          />
        </div>
      </div>      {/* Export buttons - further simplified for mobile */}
      <div className="grid grid-cols-2 gap-3 md:flex md:gap-4 mb-6 md:mb-8">
        <button
          onClick={exportToExcel}
          disabled={isExporting || isLoading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 md:px-4 py-2 rounded disabled:opacity-60 font-medium shadow text-xs md:text-sm flex items-center justify-center"
        >
          <svg className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Excel
        </button>
        
        <button
          onClick={exportToPdf}
          disabled={isExporting || isLoading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 md:px-4 py-2 rounded disabled:opacity-60 font-medium shadow text-xs md:text-sm flex items-center justify-center"
        >
          <svg className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export PDF
        </button>
      </div>
      {/* Transaction table with status filter and advanced filters */}      <div className="bg-black/30 rounded-xl border border-gray-700 p-3 md:p-6">
        <h3 className="text-lg md:text-xl font-bold text-orange-500 mb-3 md:mb-4">Transaction Details</h3>
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
              className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold shadow text-sm"
            >
              Try again
            </button>
          </div>
        ) : revenue.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-300">No financial data found for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table - Hidden on mobile */}            <table className="min-w-full bg-black/60 rounded-lg overflow-hidden hidden md:table">
              <thead className="bg-black/70 border-b border-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-orange-400">Type</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-orange-400">Amount</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-orange-400">Currency</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-orange-400">Date</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-orange-400">Transaction ID</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-orange-400">Details</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-orange-400">Distribution</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-orange-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredItems = revenue
                    .filter(item =>
                      (activeTab === 'confirmed'
                        ? item.status === 'confirmed' || item.status === 'completed'
                        : item.status === 'pending' || item.status === 'failed') &&
                      (filterCurrency === 'all' || item.currency === filterCurrency) &&
                      (filterJobId ? item.jobId === filterJobId : true) &&
                      (filterCompanyId ? item.companyId === filterCompanyId : true) &&
                      (filterWallet ? [item.distribution?.feeCollector?.address, item.distribution?.development?.address, item.distribution?.charity?.address, item.distribution?.evolution?.address].includes(filterWallet) : true)
                    );
                    
                  // Using pagination state from component level
                  const itemsPerPage = 10;
                  
                  // Items to display on current page
                  const currentItems = filteredItems.slice(
                    currentPage * itemsPerPage,
                    (currentPage + 1) * itemsPerPage
                  );
                  
                  return currentItems.map((item) => (
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
                          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                          onClick={() => openModal(item)}
                        >
                          Details
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-md ${item.status==='confirmed' ? 'bg-green-900/70 text-green-300 border border-green-700' : item.status==='pending' ? 'bg-yellow-900/70 text-yellow-300 border border-yellow-700' : 'bg-red-900/70 text-red-300 border border-red-700'}`}>{item.status}</span>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
            
            {/* Desktop pagination controls */}
            <div className="mt-6 hidden md:flex justify-between items-center">
              {(() => {
                const filteredItems = revenue.filter(item =>
                  (activeTab === 'confirmed'
                    ? item.status === 'confirmed' || item.status === 'completed'
                    : item.status === 'pending' || item.status === 'failed') &&
                  (filterCurrency === 'all' || item.currency === filterCurrency) &&
                  (filterJobId ? item.jobId === filterJobId : true) &&
                  (filterCompanyId ? item.companyId === filterCompanyId : true) &&
                  (filterWallet ? [item.distribution?.feeCollector?.address, item.distribution?.development?.address, item.distribution?.charity?.address, item.distribution?.evolution?.address].includes(filterWallet) : true)
                );
                
                const itemsPerPage = 10;
                const pageCount = Math.ceil(filteredItems.length / itemsPerPage);
                
                return pageCount > 1 ? (
                  <>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className={`px-4 py-2 rounded-md font-medium ${
                        currentPage === 0
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      Previous
                    </button>
                    <div className="text-gray-300">
                      Page {currentPage + 1} of {pageCount}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(pageCount - 1, prev + 1))}
                      disabled={currentPage === pageCount - 1}
                      className={`px-4 py-2 rounded-md font-medium ${
                        currentPage === pageCount - 1
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      Next
                    </button>
                  </>
                ) : null;
              })()}
            </div>
            
            {/* Mobile Card Layout - Exact match to screenshot */}            <div className="md:hidden">


              {(() => {
                const filteredItems = revenue.filter(item =>
                  (activeTab === 'confirmed'
                    ? item.status === 'confirmed' || item.status === 'completed'
                    : item.status === 'pending' || item.status === 'failed') &&
                  (filterCurrency === 'all' || item.currency === filterCurrency) &&
                  (filterJobId ? item.jobId === filterJobId : true) &&
                  (filterCompanyId ? item.companyId === filterCompanyId : true) &&
                  (filterWallet ? [item.distribution?.feeCollector?.address, item.distribution?.development?.address, item.distribution?.charity?.address, item.distribution?.evolution?.address].includes(filterWallet) : true)
                );
                  // Using pagination state from component level
                const itemsPerPage = 10;
                const pageCount = Math.ceil(filteredItems.length / itemsPerPage);
                
                // Items to display on current page
                const currentItems = filteredItems.slice(
                  currentPage * itemsPerPage,
                  (currentPage + 1) * itemsPerPage
                );
                
                return (
                  <>
                    {currentItems.map((item) => (
                      <div key={item.id} className="mb-1.5 bg-black/80 p-1.5 rounded-md border border-gray-800">
                        <div className="flex justify-between items-center">
                          <div className="text-orange-400 font-medium text-sm">
                            {getTypeDescription(item.type)}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${item.status==='confirmed' || item.status==='completed' ? 'bg-green-900 text-white' : item.status==='pending' ? 'bg-yellow-900 text-white' : 'bg-red-900 text-white'}`}>
                            {item.status === 'completed' ? 'completed' : item.status}
                          </span>
                        </div>
                        
                        <div className="text-white font-bold text-base">
                          {item.amount.toFixed(2)} {item.currency}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-400">
                            {getDate(item.timestamp).toLocaleDateString().split('/').slice(0,2).join('/')}
                          </div>
                          <button
                            className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-medium"
                            onClick={() => openModal(item)}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Pagination controls */}
                    {pageCount > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                          disabled={currentPage === 0}
                          className={`px-3 py-1 text-xs rounded-md ${
                            currentPage === 0
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-black/70 border border-gray-600 text-orange-400 hover:bg-black/90'
                          }`}
                        >
                          Previous
                        </button>
                        <div className="text-gray-300 text-xs">
                          Page {currentPage + 1} of {pageCount}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(pageCount - 1, prev + 1))}
                          disabled={currentPage === pageCount - 1}
                          className={`px-3 py-1 text-xs rounded-md ${
                            currentPage === pageCount - 1
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-black/70 border border-gray-600 text-orange-400 hover:bg-black/90'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>      {/* Transaction Detail Modal */}
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
            >              <div className="inline-block bg-black/70 rounded-xl px-8 py-6 text-left overflow-hidden shadow-xl transform transition-all align-middle max-w-lg w-full border border-gray-700">
                <Dialog.Title as="h3" className="text-xl leading-6 font-bold text-orange-500 mb-6">
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
                )}                <div className="mt-8 flex justify-end">
                  <button
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold shadow text-sm"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>      {/* Show total count */}
      {!isLoading && !error && revenue.length > 0 && (
        <div className="mt-4 text-right text-gray-400 text-sm">
          Showing {revenue.filter(item => filterCurrency === 'all' || item.currency === filterCurrency).length} transactions
        </div>
      )}
    </div>
  );
};

// Helper to render config card (now shows all wallet addresses if present)
const renderConfigCard = (config: any, label: string) => (
  <div className="mb-6 p-6 rounded-xl bg-black/70 text-white border border-orange-700 shadow">
    <div className="font-bold text-xl mb-3 text-orange-400">Current Payment Distribution Settings ({label})</div>
    <div className="text-sm text-gray-300">
      <div className="mb-1"><span className="font-semibold text-orange-300">FeeCollector:</span> {config?.receiverAddress || config?.feeCollectorAddress}</div>
      {config?.developmentWalletAddress && <div className="mb-1"><span className="font-semibold text-orange-300">Development:</span> {config.developmentWalletAddress}</div>}
      {config?.charityWalletAddress && <div className="mb-1"><span className="font-semibold text-orange-300">Charity:</span> {config.charityWalletAddress}</div>}
      {config?.evolutionWalletAddress && <div className="mb-1"><span className="font-semibold text-orange-300">Evolution:</span> {config.evolutionWalletAddress}</div>}
      {config?.instantJobsFeeCollector && <div className="mb-1"><span className="font-semibold text-orange-300">FeeCollector (InstantJobs):</span> {config.instantJobsFeeCollector}</div>}
      {config?.l2lFeeCollector && <div className="mb-1"><span className="font-semibold text-orange-300">FeeCollector (L2L):</span> {config.l2lFeeCollector}</div>}
      <div className="mb-1"><span className="font-semibold text-orange-300">Service Fee:</span> {config?.serviceFee}%</div>
      <div className="mb-1"><span className="font-semibold text-orange-300">Transaction Timeout:</span> {config?.transactionTimeout/1000} seconds</div>
      <div className="mb-1"><span className="font-semibold text-orange-300">Contracts:</span> ETH: {config?.contracts?.ethereum} | Polygon: {config?.contracts?.polygon} | BSC: {config?.contracts?.binance}</div>
      <div className="mb-1"><span className="font-semibold text-orange-300">Last Update:</span> {config?.updatedAt ? (typeof config.updatedAt === 'object' && 'seconds' in config.updatedAt ? new Date(config.updatedAt.seconds * 1000).toLocaleString() : new Date(config.updatedAt).toLocaleString()) : 'N/A'}</div>
    </div>
  </div>
);

export default FinancialDashboard;