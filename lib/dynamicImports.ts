/**
 * Dynamic imports para bibliotecas Web3 pesadas
 * Reduz o bundle inicial carregando apenas quando necessário
 */

// Ethers.js dynamic import
export const loadEthers = async () => {
  const ethers = await import('ethers');
  return ethers;
};

// WalletConnect dynamic import
export const loadWalletConnect = async () => {
  const WalletConnect = await import('@walletconnect/ethereum-provider');
  return WalletConnect;
};

// Web3Modal dynamic import
export const loadWeb3Modal = async () => {
  const Web3Modal = await import('@web3modal/ethereum');
  return Web3Modal;
};

// Charts dynamic imports
export const loadChartJS = async () => {
  const Chart = await import('chart.js');
  return Chart;
};

export const loadApexCharts = async () => {
  const ApexCharts = await import('apexcharts');
  return ApexCharts;
};

export const loadLightweightCharts = async () => {
  const LightweightCharts = await import('lightweight-charts');
  return LightweightCharts;
};

// Solana Web3 dynamic import
export const loadSolanaWeb3 = async () => {
  const solanaWeb3 = await import('@solana/web3.js');
  return solanaWeb3;
};

// Framer Motion dynamic import
export const loadFramerMotion = async () => {
  const framerMotion = await import('framer-motion');
  return framerMotion;
};

// PDF-lib dynamic import
export const loadPDFLib = async () => {
  const pdfLib = await import('pdf-lib');
  return pdfLib;
};

// XLSX dynamic import
export const loadXLSX = async () => {
  const xlsx = await import('xlsx');
  return xlsx;
};
