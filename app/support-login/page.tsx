"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Layout from "../../components/Layout";
import { logSystemActivity } from "../../utils/logSystem";
import bcrypt from "bcryptjs";

const SupportLogin: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  // Verificar se usuário já está logado
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    
    if (token) {
      // Se já estiver logado e for suporte ou super_admin, redirecionar para o dashboard
      if (role === "support" || role === "super_admin") {
        router.replace("/support-dashboard");
      }
    }
  }, [router]);

  // Função para resetar a senha de um usuário (apenas para desenvolvimento)
  const handleResetPassword = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar primeiro se o usuário existe
      const usersRef = collection(db, "admins");
      const q = query(usersRef, where("username", "==", username));
      let querySnapshot = await getDocs(q);
      
      // Se não achar pelo username, tente pelo email
      if (querySnapshot.empty) {
        const q2 = query(usersRef, where("email", "==", username));
        querySnapshot = await getDocs(q2);
      }
      
      if (querySnapshot.empty) {
        setError("Usuário não encontrado. Verifique o nome de usuário ou email.");
        setLoading(false);
        return;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Exibir informações de debug (apenas para desenvolvimento)
      setDebugInfo({
        id: userDoc.id,
        username: userData.username || 'N/A',
        email: userData.email || 'N/A', 
        role: userData.role || 'N/A',
        currentPassword: userData.password || 'N/A'
      });
      setShowDebugInfo(true);
      
      // Atualizar a senha (para '123456' - somente para desenvolvimento)
      const hashedPassword = await bcrypt.hash("123456", 10);
      await updateDoc(doc(db, "admins", userDoc.id), {
        password: hashedPassword
      });
      
      setPassword("123456"); // Auto-preencher o campo de senha
      setError(null);
      alert(`Senha redefinida para '123456' com sucesso! Agora você pode fazer login.`);
      setResetMode(false);
      
    } catch (err: any) {
      console.error("Erro ao resetar senha:", err);
      setError(err.message || "Ocorreu um erro ao resetar a senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setShowDebugInfo(false);
    setDebugInfo(null);

    try {
      // Exibir dados para depuração
      console.log(`Tentando fazer login com usuário: ${username}`);
      
      if (!db) {
        throw new Error("Banco de dados Firestore não está disponível");
      }
      
      // Primeiro, tente encontrar o usuário pelo campo 'username'
      let usersRef = collection(db, "admins");
      let q = query(usersRef, where("username", "==", username));
      let querySnapshot = await getDocs(q);
      
      // Se não encontrar pelo username, tente pelo email
      if (querySnapshot.empty) {
        console.log("Usuário não encontrado pelo campo 'username', tentando campo 'email'");
        q = query(usersRef, where("email", "==", username));
        querySnapshot = await getDocs(q);
      }
      
      // Se ainda não encontrar, tente por user_id (caso exista esse campo)
      if (querySnapshot.empty) {
        console.log("Usuário não encontrado pelo campo 'email', tentando campo 'user_id'");
        q = query(usersRef, where("user_id", "==", username));
        querySnapshot = await getDocs(q);
      }
      
      // Se ainda não encontrar, verifica se o login é com o email@teste.com ou support@teste.com
      if (querySnapshot.empty && (username === "email@teste.com" || username === "support@teste.com")) {
        console.log("Email de teste detectado, buscando por qualquer usuário de suporte");
        q = query(usersRef, where("role", "==", "support"));
        querySnapshot = await getDocs(q);
      }
      
      if (querySnapshot.empty) {
        console.log("Nenhum usuário encontrado após todas as tentativas");
        throw new Error("Nome de usuário ou senha incorretos.");
      }
      
      // Obter o documento do usuário
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      console.log("Documento de usuário encontrado:", {
        id: userDoc.id,
        role: userData.role,
        hasPasswordField: !!userData.password
      });
      
      // Verificar a senha
      // Note: Em um ambiente de produção, a senha deve ser armazenada com hash e comparada com segurança
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (!passwordMatch) {
        console.log("Senha incorreta");
        
        // Armazenar informações para modo debug (APENAS DESENVOLVIMENTO)
        if (process.env.NODE_ENV !== 'production') {
          setDebugInfo({
            id: userDoc.id,
            username: userData.username || 'N/A',
            email: userData.email || 'N/A', 
            role: userData.role || 'N/A',
            currentPassword: userData.password || 'N/A'
          });
        }
        
        throw new Error("Nome de usuário ou senha incorretos.");
      }
      
      const userRole = userData.role;
      const userId = userDoc.id;
      
      // Verificar se o usuário tem permissão de suporte
      if (userRole !== "support" && userRole !== "super_admin") {
        console.log(`Papel incompatível: ${userRole}`);
        throw new Error(`Você não tem permissão para acessar o painel de suporte. Papel atual: ${userRole}`);
      }
      
      console.log("Login bem-sucedido! Papel:", userRole);
      
      // Gerar um token simples (em produção, use um método mais seguro como JWT)
      const simpleToken = btoa(`${userId}:${Date.now()}`);
      
      // Salvar dados no localStorage
      localStorage.setItem("token", simpleToken);
      localStorage.setItem("userId", userId);
      localStorage.setItem("userName", userData.name || username);
      localStorage.setItem("userRole", userRole);
      
      // Registrar acesso no log de atividades usando o utilitário de logs
      await logSystemActivity(
        "login",
        userData.name || username,
        {
          userId: userId,
          username: username,
          userRole: userRole,
          loginType: "support-portal",
          timestamp: new Date().toISOString(),
          browser: navigator.userAgent
        }
      );
      
      console.log("Login registrado no sistema de logs");
      
      // Redirecionar para o dashboard
      router.push("/support-dashboard");
    } catch (err: any) {
      console.error("Erro de login:", err);
      
      setError(err.message || "Ocorreu um erro durante o login.");
      
      // Registrar tentativa de login malsucedida
      try {
        await logSystemActivity(
          "login",
          username,
          {
            success: false,
            error: err.message || "Erro desconhecido",
            loginType: "support-portal",
            timestamp: new Date().toISOString()
          }
        );
      } catch (logError) {
        console.error("Erro ao registrar falha de login:", logError);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleResetMode = () => {
    setResetMode(!resetMode);
    setError(null);
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black text-white">
        <div className="w-full max-w-md">
          <div className="bg-black/70 rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-blue-500">Painel de Suporte</h1>
              <p className="text-gray-400 mt-2">
                {resetMode ? "Redefina sua senha" : "Entre com suas credenciais de suporte"}
              </p>
            </div>
            
            {error && (
              <div className="bg-red-900/50 border border-red-600 text-white px-4 py-3 rounded mb-4">
                <p>{error}</p>
              </div>
            )}
            
            {/* Formulário de Login ou Reset */}
            {resetMode ? (
              <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-gray-300 mb-2">
                    Nome de Usuário ou Email
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className={`w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? "Processando..." : "Redefinir Senha"}
                </button>
                
                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={toggleResetMode}
                    className="text-blue-400 hover:underline text-sm"
                  >
                    Voltar ao Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-gray-300 mb-2">Nome de Usuário</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-gray-300 mb-2">Senha</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
                
                {/* Link para recuperação de senha - apenas ambiente de desenvolvimento */}
                {process.env.NODE_ENV !== 'production' && (
                  <div className="text-center mt-4">
                    <button 
                      type="button" 
                      onClick={toggleResetMode}
                      className="text-blue-400 hover:underline text-sm"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}
              </form>
            )}
            
            {/* Informações de debug - apenas para desenvolvimento */}
            {showDebugInfo && debugInfo && process.env.NODE_ENV !== 'production' && (
              <div className="mt-6 p-4 bg-gray-900 rounded-md border border-gray-700 text-sm">
                <h4 className="text-yellow-500 font-medium mb-2">Informações de Debug:</h4>
                <pre className="text-gray-300 text-xs overflow-x-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SupportLogin;