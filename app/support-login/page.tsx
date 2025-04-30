"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Layout from "../../components/Layout";
import { logSystemActivity } from "../../utils/logSystem";

const SupportLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth = getAuth();
      
      // Autenticar com Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Verificar permissões no Firestore
      const userDoc = await getDoc(doc(db, "admins", user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("Usuário não encontrado no banco de dados.");
      }
      
      const userData = userDoc.data();
      const userRole = userData.role;
      
      // Verificar se o usuário tem permissão de suporte
      if (userRole !== "support" && userRole !== "super_admin") {
        throw new Error("Você não tem permissão para acessar o painel de suporte.");
      }
      
      // Salvar dados no localStorage
      localStorage.setItem("token", await user.getIdToken());
      localStorage.setItem("userId", user.uid);
      localStorage.setItem("userEmail", user.email || "");
      localStorage.setItem("userName", userData.name || "Usuário de Suporte");
      localStorage.setItem("userRole", userRole);
      
      // Registrar acesso no log de atividades usando o utilitário de logs
      await logSystemActivity(
        "login",
        userData.name || user.email || "Usuário de Suporte",
        {
          userId: user.uid,
          userEmail: user.email,
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
      
      // Tratamento de erros específicos de autenticação
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Email ou senha incorretos.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Muitas tentativas de login. Tente novamente mais tarde.");
      } else {
        setError(err.message || "Ocorreu um erro durante o login.");
      }
      
      // Registrar tentativa de login malsucedida
      try {
        await logSystemActivity(
          "login",
          email,
          {
            success: false,
            error: err.message || "Erro desconhecido",
            errorCode: err.code,
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

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black text-white">
        <div className="w-full max-w-md">
          <div className="bg-black/70 rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-blue-500">Painel de Suporte</h1>
              <p className="text-gray-400 mt-2">Entre com suas credenciais de suporte</p>
            </div>
            
            {error && (
              <div className="bg-red-900/50 border border-red-600 text-white px-4 py-3 rounded mb-4">
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SupportLogin;