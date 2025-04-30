"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminPermissions } from "../../hooks/useAdminPermissions";
import Layout from "../../components/Layout";

// Tipo para os logs do sistema
interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details?: Record<string, any>;
}

const SystemActivity: React.FC = () => {
  const router = useRouter();
  const { role, loading } = useAdminPermissions();

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    // Aguardar o carregamento das permissões antes de verificar o role
    if (!loading && role !== "super_admin") {
      console.log("Acesso negado. Role atual:", role);
      router.replace("/admin/access-denied");
      return;
    }
    
    // Se for super_admin, continua carregando os logs
    if (!loading && role === "super_admin") {
      fetchLogs();
    }
  }, [loading, role, router]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    setError(null);
    try {
      console.log("Buscando logs do sistema...");
      const res = await fetch("/api/support/logs");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch logs");
      }
      const data = await res.json();
      setLogs(data);
      console.log(`Recebidos ${data.length} logs do sistema`);
    } catch (err: any) {
      console.error("Erro ao buscar logs:", err);
      setError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateString || 'Data desconhecida';
    }
  };

  // Filtrar logs por tipo de ação
  const filteredLogs = filter === "all" 
    ? logs 
    : logs.filter(log => log.action === filter);

  // Obter tipos de ações disponíveis para filtro
  const actionTypes = Array.from(new Set(logs.map(log => log.action)));

  // Formatar detalhes do log
  const formatDetails = (details: Record<string, any> | undefined) => {
    if (!details) return "Sem detalhes";
    
    return Object.entries(details)
      .filter(([key]) => key !== 'timestamp') // Excluir timestamp que já é mostrado
      .map(([key, value]) => {
        // Formatar valores especiais
        let formattedValue = value;
        if (typeof value === 'boolean') {
          formattedValue = value ? 'Sim' : 'Não';
        } else if (typeof value === 'object' && value !== null) {
          formattedValue = JSON.stringify(value);
        }
        
        return (
          <div key={key} className="py-1">
            <span className="font-medium text-blue-300">{key}: </span>
            <span className="text-gray-200">{String(formattedValue)}</span>
          </div>
        );
      });
  };

  // Mostrar indicador de carregamento enquanto verificamos as permissões
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black text-white p-6">
          <p>Verificando permissões...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black text-white p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-blue-500">System Activity Monitor</h2>
          <div className="flex space-x-4 items-center">
            <label className="text-sm text-gray-300">Filtrar por:</label>
            <select 
              className="bg-black/50 border border-blue-500 text-white px-3 py-2 rounded"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              {actionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button 
              onClick={fetchLogs}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
          </div>
        </div>

        {loadingLogs && (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-white p-4 rounded-lg mb-6">
            <p className="text-red-300 font-bold">Erro ao carregar logs:</p>
            <p>{error}</p>
          </div>
        )}
        
        {!loadingLogs && !error && filteredLogs.length === 0 && (
          <div className="bg-blue-900/50 border border-blue-500 text-white p-4 rounded-lg">
            <p>Nenhum registro de atividade encontrado.</p>
          </div>
        )}
        
        {!loadingLogs && !error && filteredLogs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full bg-black/70 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-blue-800 text-white">
                  <th className="p-3 text-left">Timestamp</th>
                  <th className="p-3 text-left">Ação</th>
                  <th className="p-3 text-left">Usuário</th>
                  <th className="p-3 text-left">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <React.Fragment key={log.id || index}>
                    <tr 
                      className={`
                        cursor-pointer hover:bg-black/60 
                        ${expandedLog === (log.id || String(index)) ? 'bg-black/80' : 'odd:bg-black/50 even:bg-black/30'}
                      `}
                      onClick={() => setExpandedLog(expandedLog === (log.id || String(index)) ? null : (log.id || String(index)))}
                    >
                      <td className="p-3 border-b border-blue-900/30">{formatDate(log.timestamp)}</td>
                      <td className="p-3 border-b border-blue-900/30 capitalize">{log.action}</td>
                      <td className="p-3 border-b border-blue-900/30">{log.user}</td>
                      <td className="p-3 border-b border-blue-900/30">
                        <button className="text-blue-400 hover:text-blue-300 flex items-center">
                          <span>Ver detalhes</span>
                          <svg className={`w-4 h-4 ml-1 transform ${expandedLog === (log.id || String(index)) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {expandedLog === (log.id || String(index)) && (
                      <tr className="bg-black/90">
                        <td colSpan={4} className="p-4 border-b border-blue-900/30">
                          <div className="bg-blue-900/20 p-3 rounded">
                            <h4 className="text-lg font-medium text-blue-400 mb-2">Detalhes Completos:</h4>
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
      </div>
    </Layout>
  );
};

export default SystemActivity;