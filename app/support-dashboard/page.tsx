"use client";

import Layout from "../../components/Layout";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { useAdminPermissions } from "../../hooks/useAdminPermissions";
import { logSystemActivity, logAdminAction } from "../../utils/logSystem";

const SupportDashboard: React.FC = () => {
  const router = useRouter();
  const { role, loading: permissionsLoading, error: permissionsError } = useAdminPermissions();
  
  const [activeTab, setActiveTab] = useState<"jobs" | "instantJobs" | "chat">("jobs");
  const [activeSubTab, setActiveSubTab] = useState<string | null>("list");
  
  // Estado para gerenciamento de trabalhos
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [newJob, setNewJob] = useState({
    title: "",
    companyName: "",
    description: "",
    location: "",
    salary: "",
    sourceLink: "",
  });
  const [creatingJob, setCreatingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  
  // Estado para gerenciamento de trabalhos instantâneos
  const [instantJobs, setInstantJobs] = useState<any[]>([]);
  const [instantJobsLoading, setInstantJobsLoading] = useState(false);
  const [instantJobsError, setInstantJobsError] = useState<string | null>(null);

  // Estados para barra de pesquisa
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [instantJobSearchQuery, setInstantJobSearchQuery] = useState("");
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [filteredInstantJobs, setFilteredInstantJobs] = useState<any[]>([]);
  
  // Verificação de autenticação e permissões
  useEffect(() => {
    // Verifica se o usuário está logado
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("Token não encontrado, redirecionando para login");
      router.replace("/support-login");
      return;
    }
    
    // Verifica as permissões do usuário após o carregamento
    if (!permissionsLoading) {
      if (permissionsError) {
        console.error("Erro ao carregar permissões:", permissionsError);
        router.replace("/support-login");
        return;
      }
      
      // Verifica se o usuário tem papel de suporte ou super_admin
      if (role !== 'support' && role !== 'super_admin') {
        console.log("Usuário não tem permissões de suporte:", role);
        router.replace("/admin/access-denied");
        return;
      }
      
      // Registra o acesso ao painel de suporte
      const logAccess = async () => {
        try {
          const userId = localStorage.getItem("userId") || "unknown";
          const userName = localStorage.getItem("userName") || "unknown";
          await logSystemActivity(
            "admin_action",
            userName,
            {
              userId,
              userRole: role,
              action: "Acesso ao painel de suporte",
              timestamp: new Date().toISOString(),
              browser: navigator.userAgent
            }
          );
          console.log("Acesso ao painel de suporte registrado com sucesso");
        } catch (error) {
          console.error("Erro ao registrar acesso:", error);
        }
      };
      
      logAccess();
    }
  }, [permissionsLoading, permissionsError, role, router]);

  // Função para buscar trabalhos
  const fetchJobs = async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        throw new Error("Firestore is not initialized.");
      }

      const jobsCollection = collection(db, "jobs");
      const querySnapshot = await getDocs(jobsCollection);

      const jobsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setJobs(jobsList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobsError("Failed to fetch jobs. Please check the console for more details.");
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  // Função para buscar trabalhos instantâneos
  const fetchInstantJobs = async () => {
    setInstantJobsLoading(true);
    setInstantJobsError(null);
    try {
      if (!db) {
        console.error("Firestore is not initialized.");
        throw new Error("Firestore is not initialized.");
      }

      const instantJobsCollection = collection(db, "instantJobs");
      const querySnapshot = await getDocs(instantJobsCollection);

      const instantJobsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setInstantJobs(instantJobsList);
    } catch (error) {
      console.error("Error fetching instant jobs:", error);
      setInstantJobsError("Failed to fetch instant jobs. Please check the console for more details.");
      setInstantJobs([]);
    } finally {
      setInstantJobsLoading(false);
    }
  };

  // Função para criar um novo trabalho
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.companyName || !newJob.description || !newJob.sourceLink) {
      alert("Please fill in all required fields!");
      return;
    }
    setCreatingJob(true);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }

      const jobData = {
        ...newJob,
        fromSupportPanel: true,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      };

      const jobRef = await addDoc(collection(db, "jobs"), jobData);

      // Registrar a criação de job no sistema de logs
      try {
        const userId = localStorage.getItem("userId") || "unknown";
        const userName = localStorage.getItem("userName") || "unknown";
        
        await logSystemActivity(
          "create",
          userName,
          {
            userId,
            userRole: role,
            entityType: "job",
            entityId: jobRef.id,
            entityData: {
              title: newJob.title,
              company: newJob.companyName
            },
            timestamp: new Date().toISOString()
          }
        );
        console.log("Criação de job registrada nos logs");
      } catch (logError) {
        console.error("Erro ao registrar criação de job:", logError);
      }

      setNewJob({
        title: "",
        companyName: "",
        description: "",
        location: "",
        salary: "",
        sourceLink: "",
      });

      fetchJobs();
      alert("Job created successfully!");
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please check the console for details.");
    } finally {
      setCreatingJob(false);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "jobs") {
      fetchJobs();
    } else if (activeTab === "instantJobs") {
      fetchInstantJobs();
    }
  }, [activeTab]);

  // Fetch data when sub-tab changes
  useEffect(() => {
    if (activeTab === "jobs") {
      if (activeSubTab === "list") {
        fetchJobs();
      }
    }
  }, [activeSubTab, activeTab]);

  // Filtrar jobs baseado na pesquisa
  useEffect(() => {
    if (jobs.length > 0) {
      const filtered = jobs.filter(
        (job) =>
          job.title?.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
          job.companyName?.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
          job.description?.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
          job.location?.toLowerCase().includes(jobSearchQuery.toLowerCase())
      );
      setFilteredJobs(filtered);
    } else {
      setFilteredJobs([]);
    }
  }, [jobs, jobSearchQuery]);

  // Filtrar instant jobs baseado na pesquisa
  useEffect(() => {
    if (instantJobs.length > 0) {
      const filtered = instantJobs.filter(
        (job) =>
          job.title?.toLowerCase().includes(instantJobSearchQuery.toLowerCase()) ||
          job.description?.toLowerCase().includes(instantJobSearchQuery.toLowerCase()) ||
          job.budget?.toString().toLowerCase().includes(instantJobSearchQuery.toLowerCase())
      );
      setFilteredInstantJobs(filtered);
    } else {
      setFilteredInstantJobs([]);
    }
  }, [instantJobs, instantJobSearchQuery]);

  // Exibe um indicador de carregamento enquanto as permissões estão sendo verificadas
  if (permissionsLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Carregando...</h2>
            <p>Verificando suas permissões</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleTabChange = async (newTab: "jobs" | "instantJobs" | "chat", subTab: string | null = null) => {
    // Registrar a navegação no sistema de logs
    try {
      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      
      await logSystemActivity(
        "admin_action",
        userName,
        {
          userId,
          userRole: role,
          action: "Navegação no painel de suporte",
          details: {
            from: { tab: activeTab, subTab: activeSubTab },
            to: { tab: newTab, subTab: subTab }
          },
          timestamp: new Date().toISOString()
        }
      );
      console.log("Navegação de tab registrada nos logs");
    } catch (error) {
      console.error("Erro ao registrar navegação:", error);
    }
    
    // Atualizar os estados
    setActiveTab(newTab);
    setActiveSubTab(subTab);
  };

  // Função de logout com registro de atividade
  const handleLogout = async () => {
    try {
      // Registrar o logout no sistema
      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      
      await logSystemActivity(
        "logout",
        userName,
        {
          userId,
          userRole: role,
          timestamp: new Date().toISOString(),
          portal: "support-dashboard"
        }
      );
      
      console.log("Logout registrado nos logs");
    } catch (error) {
      console.error("Erro ao registrar logout:", error);
    } finally {
      // Limpar dados da sessão e redirecionar
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
      router.push("/support-login");
    }
  };

  // Função para excluir um trabalho com registro de logs
  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      return;
    }
    
    setDeletingJobId(jobId);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      
      // Encontrar o job que será excluído para registrar nos logs
      const jobToDelete = jobs.find(job => job.id === jobId);
      
      // Excluir do Firestore
      await deleteDoc(doc(db, "jobs", jobId));
      
      // Atualizar a lista local
      setJobs(jobs.filter((job) => job.id !== jobId));
      setFilteredJobs(filteredJobs.filter((job) => job.id !== jobId));
      
      // Registrar a exclusão no sistema de logs
      try {
        const userId = localStorage.getItem("userId") || "unknown";
        const userName = localStorage.getItem("userName") || "unknown";
        
        await logSystemActivity(
          "delete",
          userName,
          {
            userId,
            userRole: role,
            entityType: "job",
            entityId: jobId,
            entityData: jobToDelete ? {
              title: jobToDelete.title,
              company: jobToDelete.companyName
            } : { info: "Job data not available" },
            timestamp: new Date().toISOString()
          }
        );
        console.log("Exclusão de job registrada nos logs");
      } catch (logError) {
        console.error("Erro ao registrar exclusão de job:", logError);
      }
      
      alert("Job deleted successfully!");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job. Please check the console for details.");
    } finally {
      setDeletingJobId(null);
    }
  };

  // Função para resolver disputas com registro
  const handleResolveDispute = async (jobId: string, resolution: 'buyer' | 'seller' | 'split') => {
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      
      // Encontrar o job em disputa
      const disputedJob = instantJobs.find(job => job.id === jobId);
      if (!disputedJob) {
        throw new Error("Disputed job not found");
      }
      
      // Atualizar o status da disputa no Firestore
      // Esta é uma implementação simplificada, a real dependeria da estrutura do seu banco de dados
      // await updateDoc(doc(db, "instantJobs", jobId), {
      //   hasDispute: false,
      //   disputeResolution: resolution,
      //   resolvedAt: new Date().toISOString(),
      //   resolvedBy: localStorage.getItem("userId")
      // });
      
      // Mockup para demonstração - remover na implementação real
      alert(`Dispute for job "${disputedJob.title}" resolved in favor of ${resolution}`);
      
      // Registrar a resolução da disputa no sistema de logs
      try {
        const userId = localStorage.getItem("userId") || "unknown";
        const userName = localStorage.getItem("userName") || "unknown";
        
        await logSystemActivity(
          "admin_action",
          userName,
          {
            userId,
            userRole: role,
            action: "Resolução de disputa",
            entityType: "instantJob",
            entityId: jobId,
            resolution,
            entityData: {
              title: disputedJob.title,
              budget: disputedJob.budget,
              disputeReason: disputedJob.disputeReason
            },
            timestamp: new Date().toISOString()
          }
        );
        console.log("Resolução de disputa registrada nos logs");
      } catch (logError) {
        console.error("Erro ao registrar resolução de disputa:", logError);
      }
      
      // Atualizar a lista local
      fetchInstantJobs();
    } catch (error) {
      console.error("Error resolving dispute:", error);
      alert("Failed to resolve dispute. Please check the console for details.");
    }
  };
  
  // Registrar quando um administrador visualiza detalhes de um job
  const handleViewJobDetails = async (jobId: string) => {
    try {
      const userId = localStorage.getItem("userId") || "unknown";
      const userName = localStorage.getItem("userName") || "unknown";
      const viewedJob = jobs.find(job => job.id === jobId);
      
      if (!viewedJob) return;
      
      await logSystemActivity(
        "admin_action",
        userName,
        {
          userId,
          userRole: role,
          action: "Visualização de detalhes",
          entityType: "job",
          entityId: jobId,
          entityData: {
            title: viewedJob.title,
            company: viewedJob.companyName
          },
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error("Erro ao registrar visualização de job:", error);
    }
  };

  return (
    <Layout>
      <main className="min-h-screen flex bg-gradient-to-br from-blue-900 to-black text-white">
        {/* Sidebar */}
        <aside className="w-1/4 bg-black/70 p-6 flex flex-col items-start min-h-screen">
          <h2 className="text-blue-400 text-xl font-bold mb-6">Support Dashboard</h2>
          <ul className="space-y-4 w-full">
            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "jobs" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => handleTabChange("jobs", "list")}
              >
                Manage Jobs
              </div>
              {activeTab === "jobs" && (
                <ul className="ml-4 mt-2 space-y-2">
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "list" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => handleTabChange("jobs", "list")}
                  >
                    Jobs List
                  </li>
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "create" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => handleTabChange("jobs", "create")}
                  >
                    Create Job
                  </li>
                </ul>
              )}
            </li>
            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "instantJobs" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => handleTabChange("instantJobs", "list")}
              >
                Manage Instant Jobs
              </div>
              {activeTab === "instantJobs" && (
                <ul className="ml-4 mt-2 space-y-2">
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "list" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => handleTabChange("instantJobs", "list")}
                  >
                    List Instant Jobs
                  </li>
                  <li
                    className={`cursor-pointer p-2 rounded-lg text-center ${
                      activeSubTab === "disputes" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                    }`}
                    onClick={() => handleTabChange("instantJobs", "disputes")}
                  >
                    Disputes
                  </li>
                </ul>
              )}
            </li>
            <li>
              <div
                className={`cursor-pointer p-3 rounded-lg text-center ${
                  activeTab === "chat" ? "bg-blue-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => handleTabChange("chat", null)}
              >
                Live Chat
              </div>
            </li>
          </ul>
          
          {/* Botão de Logout */}
          <div className="mt-auto pt-6 w-full">
            <button
              onClick={handleLogout}
              className="w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Jobs - List */}
          {activeTab === "jobs" && activeSubTab === "list" && (
            <div>
              <h2 className="text-3xl font-semibold text-blue-500 mb-6">Jobs List</h2>
              
              {/* Barra de pesquisa para Jobs */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search jobs by title, company, description or location..."
                    className="w-full px-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {jobsLoading && <p className="text-gray-400">Loading jobs...</p>}
              {jobsError && <p className="text-red-400">{jobsError}</p>}
              {!jobsLoading && !jobsError && filteredJobs.length === 0 && (
                <p className="text-gray-400">No jobs matching your search criteria.</p>
              )}
              
              <div className="bg-black/50 p-6 rounded-lg mb-6">
                <ul className="space-y-4">
                  {filteredJobs.map((job) => (
                    <li key={job.id} className="bg-black/40 p-4 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold text-blue-400">{job.title}</h3>
                          <p className="text-gray-300">{job.companyName}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {job.location && <span className="mr-2">📍 {job.location}</span>}
                            {job.salary && <span>💰 {job.salary}</span>}
                          </p>
                          <p className="mt-2 text-gray-300">{job.description}</p>
                          {job.sourceLink && (
                            <a
                              href={job.sourceLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-blue-400 hover:underline"
                            >
                              Source Link
                            </a>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Posted: {new Date(job.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Jobs - Create */}
          {activeTab === "jobs" && activeSubTab === "create" && (
            <div>
              <h2 className="text-3xl font-semibold text-blue-500 mb-6">Create Job</h2>
              <div className="bg-black/50 p-6 rounded-lg">
                <form onSubmit={handleCreateJob} className="space-y-4">
                  <input
                    type="text"
                    name="title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="Job Title"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                    required
                  />
                  <input
                    type="text"
                    name="companyName"
                    placeholder="Company Name"
                    value={newJob.companyName}
                    onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                    required
                  />
                  <textarea
                    name="description"
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    placeholder="Job Description"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                    required
                    rows={5}
                  />
                  <input
                    type="text"
                    name="location"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="Location"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                  />
                  <input
                    type="text"
                    name="salary"
                    value={newJob.salary}
                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    placeholder="Salary"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                  />
                  <input
                    type="text"
                    name="sourceLink"
                    value={newJob.sourceLink}
                    onChange={(e) => setNewJob({ ...newJob, sourceLink: e.target.value })}
                    placeholder="Source Link"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                    disabled={creatingJob}
                  >
                    {creatingJob ? "Creating..." : "Create Job"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Instant Jobs - Lista */}
          {activeTab === "instantJobs" && activeSubTab === "list" && (
            <div>
              <h2 className="text-3xl font-semibold text-blue-500 mb-6">Instant Jobs List</h2>
              
              {/* Barra de pesquisa para Instant Jobs */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search instant jobs by title, description or budget..."
                    className="w-full px-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={instantJobSearchQuery}
                    onChange={(e) => setInstantJobSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {instantJobsLoading && <p className="text-gray-400">Loading instant jobs...</p>}
              {instantJobsError && <p className="text-red-400">{instantJobsError}</p>}
              
              <div className="bg-black/50 p-6 rounded-lg mb-6">
                {!instantJobsLoading && !instantJobsError && filteredInstantJobs.length === 0 ? (
                  <p className="text-gray-400">No instant jobs matching your search criteria.</p>
                ) : (
                  <ul className="space-y-4">
                    {filteredInstantJobs.map((job) => (
                      <li key={job.id} className="bg-black/40 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-semibold text-blue-400">{job.title}</h3>
                            <p className="text-gray-300">Budget: {job.budget}</p>
                            <p className="mt-2 text-gray-300">{job.description}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Instant Jobs - Disputes */}
          {activeTab === "instantJobs" && activeSubTab === "disputes" && (
            <div>
              <h2 className="text-3xl font-semibold text-blue-500 mb-6">Resolve Disputes</h2>
              
              <div className="bg-black/50 p-6 rounded-lg mb-6">
                <h3 className="text-xl text-blue-400 mb-4">Pending Disputes</h3>
                <p className="text-gray-300 mb-6">This section displays instant jobs that have open disputes requiring resolution.</p>
                
                {instantJobsLoading && <p className="text-gray-400">Loading disputes...</p>}
                {instantJobsError && <p className="text-red-400">{instantJobsError}</p>}
                
                {!instantJobsLoading && !instantJobsError && (
                  <div className="space-y-4">
                    {instantJobs.filter(job => job.hasDispute).length > 0 ? (
                      <ul className="space-y-4">
                        {instantJobs
                          .filter(job => job.hasDispute)
                          .map((job) => (
                            <li key={job.id} className="bg-black/40 p-4 rounded-lg border border-red-800">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center">
                                    <h3 className="text-xl font-semibold text-blue-400">{job.title}</h3>
                                    <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded">Disputed</span>
                                  </div>
                                  <p className="text-gray-300">Budget: {job.budget}</p>
                                  <p className="mt-2 text-gray-300">{job.description}</p>
                                  <div className="mt-4 p-3 bg-red-900/30 rounded border border-red-800">
                                    <h4 className="text-red-400 font-medium">Dispute Reason:</h4>
                                    <p className="text-gray-300">{job.disputeReason || "No reason provided"}</p>
                                  </div>
                                  <div className="mt-3">
                                    <button
                                      className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded mr-2"
                                      onClick={() => alert("Dispute resolution interface coming soon")}
                                    >
                                      Resolve Dispute
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}

                      </ul>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-400">No open disputes at this time.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Chat */}
          {activeTab === "chat" && (
            <div>
              <h2 className="text-3xl font-semibold text-blue-500 mb-6">Live Chat</h2>
              <div className="bg-black/50 p-6 rounded-lg mb-6">
                <div className="flex justify-center items-center py-10">
                  <div className="text-center">
                    <h3 className="text-xl text-blue-400 mb-4">Live Chat Feature</h3>
                    <p className="text-gray-300 mb-4">This feature is coming soon!</p>
                    <p className="text-gray-400">
                      You will be able to provide real-time support to users through live chat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default SupportDashboard;