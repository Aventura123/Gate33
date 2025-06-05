import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import * as XLSX from 'xlsx';

interface ManualDistributionProps {
  adminId?: string;
  onDistributionComplete?: (result: any) => void;
}

interface DistributionResult {
  success: boolean;
  transactionHash?: string;
  distributionId?: string;
  error?: string;
  details?: string;
  message?: string;
  address?: string;
  tokens?: number;
}

interface ExcelRow {
  address: string;
  tokens: number;
  isValid: boolean;
  error?: string;
}

interface BulkDistributionProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  results: DistributionResult[];
}

const ManualTokenDistribution: React.FC<ManualDistributionProps> = ({ 
  adminId, 
  onDistributionComplete 
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
  
  // Individual distribution states
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isDistributing, setIsDistributing] = useState(false);
  const [result, setResult] = useState<DistributionResult | null>(null);
  const [waitForConfirmation, setWaitForConfirmation] = useState(true);

  // Bulk distribution states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [bulkReason, setBulkReason] = useState('');
  const [isBulkDistributing, setIsBulkDistributing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkDistributionProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Form validation
  const isValidAddress = recipientAddress && ethers.utils.isAddress(recipientAddress);
  const isValidAmount = tokenAmount && !isNaN(Number(tokenAmount)) && Number(tokenAmount) >= 20;
  const isValidReason = reason.trim().length >= 5;
  const canSubmit = isValidAddress && isValidAmount && isValidReason && !isDistributing;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) return;

    setIsDistributing(true);
    setResult(null);

    try {
      // Convert tokens to USD (20 tokens = $1 USD)
      const usdValue = Number(tokenAmount) / 20;
      
      const response = await fetch('/api/tokens/manual-distribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientAddress: recipientAddress.trim(),
          usdValue: usdValue,
          reason: reason.trim(),
          adminId: adminId || 'unknown',
          waitForConfirmation
        }),
      });

      const data = await response.json();
      setResult(data);

      if (onDistributionComplete) {
        onDistributionComplete(data);
      }

      // Clear form on success
      if (data.success) {
        setRecipientAddress('');
        setTokenAmount('');
        setReason('');
      }

    } catch (error) {
      console.error('Error during manual distribution:', error);
      setResult({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsDistributing(false);
    }
  };
  const formatUsdValue = (tokens: number) => {
    return (tokens / 20).toFixed(2); // Convert tokens to USD (20 tokens = $1 USD)
  };

  // Handle Excel file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setExcelFile(file);
      parseExcelFile(file);
    }
  };

  // Parse Excel file
  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const parsedData: ExcelRow[] = [];
        
        // Skip header row (index 0)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row[0] && row[1]) { // Check if both address and tokens exist
            const address = String(row[0]).trim();
            const tokens = Number(row[1]);
            
            let isValid = true;
            let error = '';

            // Validate address
            if (!ethers.utils.isAddress(address)) {
              isValid = false;
              error = 'Invalid Ethereum address';
            }
            // Validate token amount
            else if (isNaN(tokens) || tokens < 20) {
              isValid = false;
              error = 'Invalid token amount (minimum 20)';
            }

            parsedData.push({
              address,
              tokens,
              isValid,
              error
            });
          }
        }

        setExcelData(parsedData);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Error parsing Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };
  // Start bulk distribution
  const startBulkDistribution = async () => {
    if (excelData.length === 0 || !bulkReason.trim()) return;

    const validRows = excelData.filter(row => row.isValid);
    if (validRows.length === 0) {
      alert('No valid rows found to distribute');
      return;
    }

    setIsBulkDistributing(true);
    setIsPaused(false);
    setBulkProgress({
      total: validRows.length,
      completed: 0,
      failed: 0,
      current: '',
      results: []
    });

    // Process each row one by one
    for (let i = 0; i < validRows.length; i++) {
      // Check if paused - wait until resumed
      while (isPaused && isBulkDistributing) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check if distribution was stopped
      if (!isBulkDistributing) {
        break;
      }

      const row = validRows[i];
      
      setBulkProgress(prev => prev ? {
        ...prev,
        current: `${row.address} (${row.tokens} tokens)`
      } : null);

      try {
        const usdValue = row.tokens / 20;
        
        const response = await fetch('/api/tokens/manual-distribute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientAddress: row.address,
            usdValue: usdValue,
            reason: bulkReason.trim(),
            adminId: adminId || 'unknown',
            waitForConfirmation: false // Don't wait for confirmation in bulk
          }),
        });

        const result = await response.json();
        
        setBulkProgress(prev => prev ? {
          ...prev,
          completed: prev.completed + (result.success ? 1 : 0),
          failed: prev.failed + (result.success ? 0 : 1),
          results: [...prev.results, { 
            ...result, 
            address: row.address, 
            tokens: row.tokens 
          }]
        } : null);

        // Add a small delay between distributions to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error distributing to ${row.address}:`, error);
        setBulkProgress(prev => prev ? {
          ...prev,
          failed: prev.failed + 1,
          results: [...prev.results, {
            success: false,
            error: 'Network error',
            details: error instanceof Error ? error.message : 'Unknown error',
            address: row.address,
            tokens: row.tokens
          }]
        } : null);
      }
    }

    // Only set as completed if we finished all rows
    if (isBulkDistributing) {
      setIsBulkDistributing(false);
      setBulkProgress(prev => prev ? {
        ...prev,
        current: 'Completed'
      } : null);
    }
  };

  // Toggle pause/resume
  const togglePause = () => {
    setIsPaused(!isPaused);
  };  return (
    <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition-colors">
      <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4 md:mb-6">
        Manual Token Distribution
      </h3>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-4 md:mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`px-4 py-2 font-semibold transition-colors text-sm ${
            activeTab === 'individual'
              ? 'text-orange-400 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Individual Distribution
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`px-4 py-2 font-semibold transition-colors text-sm ${
            activeTab === 'bulk'
              ? 'text-orange-400 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Bulk Distribution (Excel)
        </button>
      </div>

      {/* Individual Distribution Tab */}
      {activeTab === 'individual' && (
        <form onSubmit={handleSubmit} className="space-y-4">        {/* Recipient Address */}
        <div>
          <label htmlFor="recipientAddress" className="block text-sm font-semibold text-gray-300 mb-1">
            Recipient Address
          </label>
          <input
            id="recipientAddress"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            className={`w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm ${
              recipientAddress && !isValidAddress 
                ? 'border-red-500' 
                : 'focus:border-orange-500'
            }`}
            disabled={isDistributing}
            required
          />
          {recipientAddress && !isValidAddress && (
            <p className="text-xs text-red-400 mt-1">Invalid Ethereum address</p>
          )}
        </div>        {/* Token Amount */}
        <div>
          <label htmlFor="tokenAmount" className="block text-sm font-semibold text-gray-300 mb-1">
            Token Amount
          </label>
          <input
            id="tokenAmount"
            type="number"
            min="20"
            step="20"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(e.target.value)}
            placeholder="Enter token amount (minimum 20)"
            className={`w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm ${
              tokenAmount && !isValidAmount 
                ? 'border-red-500' 
                : 'focus:border-orange-500'
            }`}
            disabled={isDistributing}
            required
          />
          {tokenAmount && isValidAmount && (
            <p className="text-xs text-green-400 mt-1">
              Equivalent to ${formatUsdValue(Number(tokenAmount))} USD
            </p>
          )}
          {tokenAmount && !isValidAmount && (
            <p className="text-xs text-red-400 mt-1">
              Minimum amount is 20 tokens
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">Minimum 20 tokens required</p>
        </div>        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-semibold text-gray-300 mb-1">
            Reason for Distribution
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why tokens are being distributed manually (minimum 5 characters)"
            rows={3}
            className={`w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm resize-none ${
              reason && !isValidReason 
                ? 'border-red-500' 
                : 'focus:border-orange-500'
            }`}
            disabled={isDistributing}
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            {reason.length}/5 characters minimum
          </p>
        </div>        {/* Wait for Confirmation */}
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="waitForConfirmation"
              checked={waitForConfirmation}
              onChange={(e) => setWaitForConfirmation(e.target.checked)}
              className="mr-2 h-5 w-5 accent-orange-500"
              disabled={isDistributing}
            />
            <span className="text-gray-300 text-sm font-medium">Wait for blockchain confirmation (recommended)</span>
          </label>
        </div>        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm w-full ${
            !canSubmit ? 'cursor-not-allowed' : ''
          }`}
        >
          {isDistributing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Distributing Tokens...</span>
            </div>
          ) : (
            'Distribute Tokens'
          )}
        </button>
      {/* Result Display */}
      {result && (
        <div className={`mt-6 p-4 rounded border ${
          result.success 
            ? 'bg-green-900/20 border-green-500 text-green-400' 
            : 'bg-red-900/20 border-red-500 text-red-400'
        }`}>
          <div className="flex items-start space-x-2">
            <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${
              result.success ? 'bg-green-500' : 'bg-red-500'
            }`}>
              <span className="block w-full h-full rounded-full text-white text-xs flex items-center justify-center">
                {result.success ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {result.success ? 'Distribution Successful!' : 'Distribution Failed'}
              </p>
              
              {result.message && (
                <p className="text-sm mt-1">{result.message}</p>
              )}

              {result.transactionHash && (
                <div className="mt-2">
                  <p className="text-xs text-gray-400">Transaction Hash:</p>
                  <a
                    href={`https://polygonscan.com/tx/${result.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline break-all"
                  >
                    {result.transactionHash}
                  </a>
                </div>
              )}

              {result.distributionId && (
                <p className="text-xs text-gray-400 mt-1">
                  Distribution ID: {result.distributionId}
                </p>
              )}

              {result.error && (
                <p className="text-sm mt-1">
                  <strong>Error:</strong> {result.error}
                </p>
              )}              
              {result.details && (
                <p className="text-xs text-gray-400 mt-1">
                  {result.details}
                </p>
              )}            </div>
          </div>
        </div>
      )}
      </form>
      )}

      {/* Bulk Distribution Tab */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">          {/* File Upload */}
          <div>
            <label htmlFor="excel-upload" className="block text-sm font-semibold text-gray-300 mb-1">
              Upload Excel File
            </label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
                disabled={isBulkDistributing}
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                {excelFile ? (
                  <div className="text-green-400">
                    <p className="font-medium">✓ {excelFile.name}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {excelData.length} rows found
                    </p>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <p className="font-medium">Click to upload Excel file</p>
                    <p className="text-sm mt-1">
                      Format: Address (Column A) | Token Amount (Column B)
                    </p>
                  </div>
                )}
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">Supported formats: .xlsx, .xls</p>
          </div>

          {/* Excel Data Preview */}
          {excelData.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-300 mb-3">
                Data Preview ({excelData.filter(row => row.isValid).length} valid / {excelData.length} total)
              </h4>
              <div className="max-h-60 overflow-y-auto border border-gray-600 rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-300">Status</th>
                      <th className="px-4 py-2 text-left text-gray-300">Address</th>
                      <th className="px-4 py-2 text-left text-gray-300">Tokens</th>
                      <th className="px-4 py-2 text-left text-gray-300">USD Value</th>
                      <th className="px-4 py-2 text-left text-gray-300">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.map((row, index) => (
                      <tr key={index} className={`border-t border-gray-700 ${
                        row.isValid ? 'bg-green-900/10' : 'bg-red-900/10'
                      }`}>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            row.isValid 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {row.isValid ? 'Valid' : 'Invalid'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-300 font-mono text-xs">
                          {row.address}
                        </td>
                        <td className="px-4 py-2 text-gray-300">
                          {row.tokens}
                        </td>
                        <td className="px-4 py-2 text-gray-300">
                          ${(row.tokens / 20).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-red-400 text-xs">
                          {row.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}          {/* Bulk Reason */}
          {excelData.length > 0 && (
            <div>
              <label htmlFor="bulkReason" className="block text-sm font-semibold text-gray-300 mb-1">
                Reason for Bulk Distribution
              </label>
              <textarea
                id="bulkReason"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Explain why tokens are being distributed in bulk (minimum 5 characters)"
                rows={3}
                className={`w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm resize-none ${
                  bulkReason && bulkReason.trim().length < 5
                    ? 'border-red-500' 
                    : 'focus:border-orange-500'
                }`}
                disabled={isBulkDistributing}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                {bulkReason.length}/5 characters minimum
              </p>
            </div>
          )}          {/* Bulk Distribution Controls */}
          {excelData.length > 0 && (
            <div className="flex space-x-4">
              {!isBulkDistributing ? (
                <button
                  type="button"
                  onClick={startBulkDistribution}
                  disabled={excelData.filter(row => row.isValid).length === 0 || bulkReason.trim().length < 5}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm w-full md:w-auto"
                >
                  Start Bulk Distribution
                </button>
              ) : (
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-1.5 rounded-md text-xs font-semibold"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkDistributing(false);
                      setIsPaused(false);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold"
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bulk Progress */}
          {bulkProgress && (
            <div className="bg-gray-800 p-4 rounded border border-gray-600">
              <h4 className="text-lg font-medium text-gray-300 mb-3">
                Distribution Progress
                {isPaused && <span className="text-yellow-400 ml-2">(Paused)</span>}
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Progress:</span>
                  <span className="text-white">
                    {bulkProgress.completed + bulkProgress.failed} / {bulkProgress.total}
                  </span>
                </div>                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="progress-bar bg-orange-500 h-2 rounded-full transition-all duration-300"
                    data-progress={Math.round(((bulkProgress.completed + bulkProgress.failed) / bulkProgress.total) * 100)}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-green-400 font-medium">{bulkProgress.completed}</div>
                    <div className="text-gray-400">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-medium">{bulkProgress.failed}</div>
                    <div className="text-gray-400">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-300 font-medium">
                      {bulkProgress.total - bulkProgress.completed - bulkProgress.failed}
                    </div>
                    <div className="text-gray-400">Remaining</div>
                  </div>
                </div>

                {bulkProgress.current && bulkProgress.current !== 'Completed' && (
                  <div className="text-sm">
                    <span className="text-gray-400">Current:</span>
                    <span className="text-white ml-2">{bulkProgress.current}</span>
                  </div>
                )}
              </div>

              {/* Results Summary */}
              {bulkProgress.results.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-md font-medium text-gray-300 mb-2">
                    Recent Results:
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {bulkProgress.results.slice(-5).reverse().map((result, index) => (
                      <div key={index} className={`text-xs p-2 rounded ${
                        result.success 
                          ? 'bg-green-900/20 border border-green-500/30' 
                          : 'bg-red-900/20 border border-red-500/30'
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                            {result.success ? '✓' : '✗'} {result.address || 'Unknown'}
                          </span>
                          <span className="text-gray-400">
                            {result.tokens} tokens
                          </span>
                        </div>
                        {result.transactionHash && (
                          <a
                            href={`https://polygonscan.com/tx/${result.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            View Transaction
                          </a>
                        )}
                        {result.error && (
                          <div className="text-red-400 mt-1">
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManualTokenDistribution;
