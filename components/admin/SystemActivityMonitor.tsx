"use client";
import React, { useState, useEffect } from "react";
import { getMonitoringState } from "../../utils/monitors/contractMonitor";

// Temporary interface for component compatibility
interface MonitoringState {
  isRunning: boolean;
  lastCheck?: string | Date;
  contractsCount?: number;
  errors?: string[];
  fullState?: {
    isLearn2EarnMonitoring: boolean;
    isWalletMonitoring: boolean;
    isTokenDistributionMonitoring: boolean;
  }
}

// Integrated contract monitoring component
const ContractMonitor: React.FC = () => {
  const [monitoringState, setMonitoringState] = useState<MonitoringState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  const [restartMessage, setRestartMessage] = useState<string | null>(null);

  // Add contract names and keys for display
  const contracts = [
    { key: "isLearn2EarnMonitoring", label: "Learn2Earn" },
    { key: "isWalletMonitoring", label: "Wallet" },
    { key: "isTokenDistributionMonitoring", label: "Token Distribution" }
  ];
  async function fetchMonitoringState() {
    try {
      setLoading(true);
      const state = await getMonitoringState();
      
      // Set all state properties at once to prevent double rendering
      setMonitoringState({
        isRunning: state.isLearn2EarnMonitoring || state.isWalletMonitoring || state.isTokenDistributionMonitoring,
        lastCheck: new Date().toISOString(),
        contractsCount: contracts.length,
        errors: state.errors,
        fullState: {
          isLearn2EarnMonitoring: state.isLearn2EarnMonitoring,
          isWalletMonitoring: state.isWalletMonitoring,
          isTokenDistributionMonitoring: state.isTokenDistributionMonitoring
        }
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error fetching monitoring state");
      console.error("Error fetching monitoring state:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMonitoringState();
    const interval = setInterval(fetchMonitoringState, 30000);
    return () => clearInterval(interval);
  }, []);

  // Function to restart contract monitoring
  const handleRestartMonitoring = async () => {
    try {
      setIsRestarting(true);
      setRestartMessage("Restarting monitoring...");

      const response = await fetch("/api/diagnostics/restart-monitoring", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setRestartMessage("✅ Monitoring restarted successfully! Updating status...");
        // Fetch updated state after a brief delay
        setTimeout(() => {
          fetchMonitoringState();
          setRestartMessage(null);
          setIsRestarting(false);
        }, 2000);
      } else {
        setRestartMessage(`❌ Error restarting: ${result.error}`);
        setIsRestarting(false);
      }
    } catch (error) {
      console.error("Failed to restart monitoring:", error);
      setRestartMessage("❌ Error restarting the monitoring");
      setIsRestarting(false);
    }
  };
  if (loading) {
    return (
      <div className="p-6 bg-black/30 rounded-lg">
        <p className="text-center text-orange-400">Loading monitoring state...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-black/30 rounded-lg">
        <p className="text-center text-red-400">Error: {error}</p>
        <button
          onClick={fetchMonitoringState}
          className="mt-4 mx-auto block bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }
  return (
    <div className="bg-black/30 p-6 rounded-lg">
      <h3 className="text-xl text-orange-400 mb-4">Contract Monitoring Status</h3>
      
      {restartMessage && (
        <div className="bg-orange-900/30 p-3 rounded-lg mb-4 text-sm">
          {restartMessage}
        </div>
      )}
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm ${monitoringState?.isRunning ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {monitoringState?.isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">Last Check:</span>
          <span className="text-sm text-orange-200">
            {monitoringState?.lastCheck ? new Date(monitoringState.lastCheck).toLocaleString() : 'N/A'}
          </span>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">Contracts Tracked:</span>
          <span className="text-sm text-orange-200">{contracts.length}</span>
        </div>
        <div className="mt-4">
          <h4 className="text-orange-300 text-sm mb-2">Tracked Contracts:</h4>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-gray-400 pb-1">Contract</th>
                <th className="text-left text-gray-400 pb-1">Monitored</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(contract => (
                <tr key={contract.key}>
                  <td className="py-1 text-gray-200">{contract.label}</td>
                  <td className="py-1">                    <span className={
                      (monitoringState?.fullState && monitoringState.fullState[contract.key as keyof typeof monitoringState.fullState])
                        ? "text-green-400"
                        : "text-red-400"
                    }>
                      {(monitoringState?.fullState && monitoringState.fullState[contract.key as keyof typeof monitoringState.fullState])
                        ? "Yes"
                        : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button
        className="w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg flex items-center justify-center"
        onClick={handleRestartMonitoring}
        disabled={isRestarting}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {isRestarting ? 'Restarting...' : 'Restart Monitoring'}
      </button>
    </div>
  );
};

// Type for system logs
interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details?: Record<string, any>;
}

// Main component for monitoring system activities
const SystemActivityMonitor: React.FC = () => {

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'contracts' | 'management'>('system');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 12;
  // States for log management
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState(false);
  const [operationMessage, setOperationMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);  // Removed password-related state variables - no longer needed
  // Fetch system logs
  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      setCurrentPage(1); // Reset to first page when new logs are fetched

      // Get the authentication token of the current user
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("You need to be authenticated to view system logs.");
      }
      
      const response = await fetch('/api/support/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching logs: ${response.status}`);
      }
      const data = await response.json();
      setLogs(data || []);
      // Extract unique action types for filtering
      const types = [...new Set(data.map((log: any) => log.action))].filter(
        (action): action is string => typeof action === 'string'
      );
      setActionTypes(types);
    } catch (err: any) {
      console.error("Failed to fetch logs:", err);
      setError(err.message || "Error fetching logs");
    } finally {
      setLoadingLogs(false);
    }
  };
  
  useEffect(() => {
    fetchLogs();
  }, []);
  // Filters logs based on the selected filter
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.action === filter);
    
  // Calculates the logs of the current page
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  
  // Calculates the total number of pages
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  
  // Helper function to format log details
  const formatDetails = (details: any) => {
    if (!details) return <div className="text-gray-400">No details available</div>;
    
    // If details is a string, just display it
    if (typeof details === 'string') {
      return <div className="text-gray-200 break-words">{details}</div>;
    }
    
    // Otherwise, format the object
    return Object.entries(details)
      .filter(([key]) => key !== 'timestamp') // Exclude timestamp which is already shown
      .map(([key, value]) => {
        let formattedValue = value;
        if (typeof value === 'boolean') {
          formattedValue = value ? 'Yes' : 'No';
        } else if (typeof value === 'object' && value !== null) {
          formattedValue = JSON.stringify(value);
        }
        return (
          <div key={key} className="py-1">
            <span className="font-medium text-orange-300">{key}: </span>
            <span className="text-gray-200">{String(formattedValue)}</span>
          </div>
        );
      });
  };

  // Function to export logs
  const handleExportLogs = async () => {
    try {
      setIsExporting(true);
      setOperationMessage(null);
        // Date validation
      if (!startDate || !endDate) {
        setOperationMessage({
          type: 'error',
          text: 'Select start and end dates to export'
        });
        return;
      }
      
      const response = await fetch('/api/support/export-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          format: exportFormat
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error exporting logs: ${response.status}`);
      }
      
      // If Excel, we need to download the file
      if (exportFormat === 'excel') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        // For PDF, open in new tab
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
      
      setOperationMessage({
        type: 'success',
        text: `Logs successfully exported to ${exportFormat.toUpperCase()}`
      });
    } catch (err: any) {      console.error("Error exporting logs:", err);
      setOperationMessage({
        type: 'error',
        text: err.message || "Error exporting logs"
      });
    } finally {
      setIsExporting(false);
    }
  };  // Function to clear logs using Firebase authentication
  const handleClearLogs = async () => {
    if (!startDate || !endDate) {
      setOperationMessage({ type: 'error', text: 'Please select a valid date range.' });
      return;
    }
    try {
      setIsClearing(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You need to be authenticated to perform this operation.');
      }
      const userId = localStorage.getItem('userId');
      const userRole = localStorage.getItem('userRole');
      if (userRole !== 'super_admin' && userRole !== 'admin') {
        throw new Error('You do not have permission to clear system logs.');
      }

      // Send the password directly to the backend for verification
      const clearResponse = await fetch('/api/support/logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          startDate,
          endDate,
          userId,
        }),
      });

      if (!clearResponse.ok) {
        const errorData = await clearResponse.json();
        throw new Error(errorData.message || errorData.error || 'Error clearing logs.');
      }

      setOperationMessage({ type: 'success', text: 'Logs successfully cleared!' });
      setClearConfirmation(false);
      fetchLogs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error clearing logs.';
      setOperationMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsClearing(false);
    }
  };
  // Function to start the clear confirmation process
  const startClearConfirmation = () => {
    if (!startDate || !endDate) {
      setOperationMessage({ type: 'error', text: 'Please select a valid date range.' });
      return;
    }
    setClearConfirmation(true);
  };

  // Function to cancel the clearing
  const cancelClearLogs = () => {
    setClearConfirmation(false);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-orange-500 mb-6">System Activity Monitor</h2>
      <div className="bg-black/50 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4 items-center">
            {activeTab === 'system' && (
              <>
                <label className="text-sm text-gray-300">Filter by:</label>
                <select 
                  className="bg-black/50 border border-orange-500 text-white px-3 py-2 rounded"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1); // Reset to first page when changing the filter
                  }}
                >
                  <option value="all">All</option>
                  {actionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </>
            )}
            <button 
              onClick={fetchLogs}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        {/* Tabs to switch between system logs, contract monitoring, and log management */}
        <div className="mb-6 border-b border-orange-800">
          <div className="flex">
            <button
              className={`py-2 px-4 ${activeTab === 'system' ? 'text-orange-400 border-b-2 border-orange-400 font-medium' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('system')}
            >
              System Logs
            </button>
            <button
              className={`py-2 px-4 ${activeTab === 'contracts' ? 'text-orange-400 border-b-2 border-orange-400 font-medium' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('contracts')}
            >
              Contract Monitoring
            </button>
            <div className="flex-grow"></div>
            <button
              className={`py-2 px-4 ${activeTab === 'management' ? 'text-orange-400 border-b-2 border-orange-400 font-medium' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('management')}
            >
              Logs Management
            </button>
          </div>
        </div>

        {/* Content based on the selected tab */}
        {activeTab === 'system' ? (
          <>
            {loadingLogs && (              <div className="flex justify-center my-12">
                <p className="text-gray-400">Loading logs...</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-900/30 p-4 rounded-lg my-4 text-center">
                <p className="text-red-300">{error}</p>
                <button
                  onClick={fetchLogs}
                  className="mt-2 bg-red-700 hover:bg-red-800 px-4 py-1 rounded text-sm"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {!loadingLogs && !error && filteredLogs.length === 0 && (              <div className="bg-black/30 p-6 rounded-lg text-center">
                <p className="text-gray-300">No logs found.</p>
              </div>
            )}            
            {!loadingLogs && !error && filteredLogs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full bg-black/30 rounded-lg">
                  <thead>
                    <tr className="border-b border-orange-900/30">
                      <th className="p-3 text-left text-orange-400">Timestamp</th>
                      <th className="p-3 text-left text-orange-400">Action</th>
                      <th className="p-3 text-left text-orange-400">User</th>
                      <th className="p-3 text-left text-orange-400">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLogs.map((log, index) => (
                      <React.Fragment key={log.id || index}>
                        <tr className="border-b border-orange-900/30 hover:bg-black/50">
                          <td className="p-3 text-gray-300">
                            {typeof log.timestamp === 'string' 
                              ? new Date(log.timestamp).toLocaleString()
                              : typeof log.timestamp === 'object' && log.timestamp !== null && typeof (log.timestamp as any).toDate === 'function'
                                ? (log.timestamp as any).toDate().toLocaleString() 
                                : 'N/A'}
                          </td>
                          <td className="p-3 text-gray-300 capitalize">{log.action}</td>
                          <td className="p-3 text-gray-300">{log.user || 'SYSTEM'}</td>
                          <td className="p-3 border-b border-orange-900/30">
                            <button 
                              className="text-orange-400 hover:text-orange-300 flex items-center"
                              onClick={() => setExpandedLog(expandedLog === (log.id || String(index)) ? null : (log.id || String(index)))}
                            >
                              <span>View details</span>
                              <svg className={`w-4 h-4 ml-1 transform ${expandedLog === (log.id || String(index)) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                        {expandedLog === (log.id || String(index)) && (
                          <tr className="bg-black/90">
                            <td colSpan={4} className="p-4 border-b border-orange-900/30">
                              <div className="bg-orange-900/20 p-3 rounded">
                                <h4 className="text-lg font-medium text-orange-400 mb-2">Complete Details:</h4>
                                <div className="ml-2 text-sm">
                                  {formatDetails(log.details)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {!loadingLogs && !error && filteredLogs.length > logsPerPage && (
              <div className="mt-4 flex justify-between items-center">
                <div className="text-gray-300">
                  Page {currentPage} of {totalPages} ({filteredLogs.length} logs)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-700 text-gray-500' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                  >
                    &lt;&lt;
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-700 text-gray-500' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-700 text-gray-500' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                  >
                    &gt;
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-700 text-gray-500' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                  >
                    &gt;&gt;
                  </button>
                </div>
              </div>
            )}
          </>        ) : activeTab === 'contracts' ? (
          // Contract monitoring component
          <ContractMonitor />
        ) : (
          // Log management component
          <div className="bg-black/30 p-6 rounded-lg">
            <h3 className="text-xl text-orange-400 mb-4">Logs Management</h3>
            
            {operationMessage && (
              <div className={`p-4 mb-4 rounded-lg ${
                operationMessage.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
              }`}>
                {operationMessage.text}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export logs */}
              <div className="bg-black/50 p-4 rounded-lg">
                <h4 className="text-lg text-orange-400 mb-3">Export Logs</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">From Date:</label>
                    <input 
                      type="date" 
                      className="w-full bg-black/50 border border-orange-500/50 text-white px-3 py-2 rounded"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">To Date:</label>
                    <input 
                      type="date" 
                      className="w-full bg-black/50 border border-orange-500/50 text-white px-3 py-2 rounded"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Export Format:</label>
                    <div className="flex space-x-3">
                      <label className="inline-flex items-center cursor-pointer">
                        <input 
                          type="radio" 
                          className="form-radio text-orange-500" 
                          name="exportFormat" 
                          checked={exportFormat === 'excel'}
                          onChange={() => setExportFormat('excel')}
                        />
                        <span className="ml-2 text-gray-300">Excel (.xlsx)</span>
                      </label>
                      <label className="inline-flex items-center cursor-pointer">
                        <input 
                          type="radio" 
                          className="form-radio text-orange-500" 
                          name="exportFormat" 
                          checked={exportFormat === 'pdf'}
                          onChange={() => setExportFormat('pdf')}
                        />
                        <span className="ml-2 text-gray-300">PDF</span>
                      </label>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleExportLogs}
                    disabled={isExporting || !startDate || !endDate}
                    className={`w-full px-4 py-2 rounded-lg flex items-center justify-center
                      ${isExporting || !startDate || !endDate
                        ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                      }`}
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Logs to {exportFormat === 'excel' ? 'Excel' : 'PDF'}
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Clear logs */}
              <div className="bg-black/50 p-4 rounded-lg">
                <h4 className="text-lg text-orange-400 mb-3">Clear System Logs</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">From Date:</label>
                    <input 
                      type="date" 
                      className="w-full bg-black/50 border border-orange-500/50 text-white px-3 py-2 rounded"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">To Date:</label>
                    <input 
                      type="date" 
                      className="w-full bg-black/50 border border-orange-500/50 text-white px-3 py-2 rounded"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-sm text-gray-300">
                    <p className="mb-2 text-red-300 font-medium">⚠️ Warning:</p>
                    <p>This action will permanently delete all system logs within the specified date range. This operation cannot be undone.</p>
                  </div>                  {!clearConfirmation ? (
                    <button
                      onClick={startClearConfirmation}
                      disabled={!startDate || !endDate}
                      className={`w-full px-4 py-2 rounded-lg flex items-center justify-center
                        ${!startDate || !endDate
                          ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                      Clear Logs
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={handleClearLogs}
                          disabled={isClearing}
                          className={`flex-1 px-4 py-2 rounded-lg ${isClearing ? 'bg-gray-700 text-gray-400' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        >
                          {isClearing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Clearing...
                            </>
                          ) : (
                            <>Confirm Clear</>
                          )}
                        </button>
                        <button
                          onClick={cancelClearLogs}
                          className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemActivityMonitor;
