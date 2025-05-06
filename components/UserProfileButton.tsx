"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserProfileButtonProps {
  className?: string;
}

const UserProfileButton: React.FC<UserProfileButtonProps> = ({ className = "" }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    photo: string;
    role: string;
    type: 'seeker' | 'company' | 'admin' | 'support';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Referência para o container do dropdown para detectar quando o mouse sai
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Referência para o timer de fechamento do dropdown
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();

  // Função para buscar dados do usuário do Firebase
  const fetchUserDataFromFirebase = async (type: string, id: string) => {
    try {
      if (!db) return null;
      
      let collection = '';
      
      switch(type) {
        case 'company':
          collection = 'companies';
          break;
        case 'seeker':
          collection = 'seekers';
          break;
        case 'admin':
          collection = 'admins';
          break;
        case 'support':
          collection = 'support';
          break;
        default:
          return null;
      }
      
      const docRef = doc(db, collection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log(`No ${type} document found for ID: ${id}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
      return null;
    }
  };

  // Função para verificar o tipo de usuário logado com base nos valores armazenados no localStorage
  useEffect(() => {
    const checkLoggedInUser = async () => {
      setIsLoading(true);
      
      // Check and debug all localStorage values
      console.log("UserProfileButton checking localStorage:");
      console.log("- seekerId:", localStorage.getItem("seekerId"));
      console.log("- seekerName:", localStorage.getItem("seekerName"));
      console.log("- seekerPhoto:", localStorage.getItem("seekerPhoto"));
      console.log("- userId:", localStorage.getItem("userId"));
      console.log("- userName:", localStorage.getItem("userName"));
      console.log("- userRole:", localStorage.getItem("userRole"));
      console.log("- companyId:", localStorage.getItem("companyId"));
      console.log("- companyName:", localStorage.getItem("companyName"));
      console.log("- token:", localStorage.getItem("token"));
      
      try {
        // Verificar seeker
        if (localStorage.getItem("seekerToken")) {
          const seekerId = localStorage.getItem("seekerToken") 
            ? atob(localStorage.getItem("seekerToken") || "")
            : null;
            
          if (seekerId) {
            const seekerData = await fetchUserDataFromFirebase('seeker', seekerId);
            
            if (seekerData) {
              return {
                name: seekerData.name || "Usuário",
                photo: seekerData.photoURL || "/logo.png",
                role: "Job Seeker",
                type: 'seeker' as const
              };
            }
          }
        }
        
        // Verificar admin ou support
        if (localStorage.getItem("userId") && localStorage.getItem("userRole")) {
          const userId = localStorage.getItem("userId");
          const userRole = localStorage.getItem("userRole") || "";
          
          // Fixed: Check for userRole directly, prioritizing admin roles over support
          if (userRole === "super_admin" || userRole === "admin") {
            const adminData = await fetchUserDataFromFirebase('admin', userId || "");
            
            const formattedRole = userRole === "super_admin" ? "Super Admin" : 
                               userRole.charAt(0).toUpperCase() + userRole.slice(1);
            
            return {
              name: adminData?.name || localStorage.getItem("userName") || "Admin",
              photo: adminData?.photoURL || localStorage.getItem("userPhoto") || "/logo.png",
              role: formattedRole,
              type: 'admin' as const
            };
          }
          
          // Verificar se é um usuário de suporte
          if (userRole === "support" && userId) {
            const supportData = await fetchUserDataFromFirebase('support', userId);
            
            if (supportData) {
              return {
                name: supportData.name || "Suporte",
                photo: supportData.photoURL || "/logo.png",
                role: "Support",
                type: 'support' as const
              };
            }
          }
        }
        
        // Verificar company
        const companyId = localStorage.getItem("companyId") || 
          (localStorage.getItem("token") ? atob(localStorage.getItem("token") || "") : null);
          
        if (companyId) {
          console.log("Buscando dados da empresa do Firebase, ID:", companyId);
          const companyData = await fetchUserDataFromFirebase('company', companyId);
          
          if (companyData) {
            console.log("Dados da empresa obtidos do Firebase:", companyData);
            return {
              name: companyData.name || "Company",
              photo: companyData.photoURL || companyData.photo || "/logo.png",
              role: "Company",
              type: 'company' as const
            };
          } else {
            // Fallback para dados do localStorage se o Firebase falhar
            return {
              name: localStorage.getItem("companyName") || "Company",
              photo: localStorage.getItem("companyPhoto") || "/logo.png",
              role: "Company",
              type: 'company' as const
            };
          }
        }
      } catch (error) {
        console.error("Error checking logged in user:", error);
      } finally {
        setIsLoading(false);
      }
      
      setIsLoading(false);
      return null;
    };

    // Executar apenas no cliente
    if (typeof window !== 'undefined') {
      checkLoggedInUser().then(user => {
        setUserInfo(user);
        setIsLoading(false);
      });
    }
  }, []);

  // Adicionar event listener para lidar com cliques fora do dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Funções para manipular a abertura e fechamento do dropdown com delay
  const handleMouseEnter = () => {
    // Cancela qualquer timer de fechamento pendente
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    // Define um timer para fechar o dropdown após 1.5 segundos
    closeTimerRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 1500); // 1.5 segundos de delay para dar tempo de mover o cursor
  };

  // Limpar o timer quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    // Limpar todos os possíveis tokens de autenticação
    localStorage.removeItem("seekerId");
    localStorage.removeItem("seekerName");
    localStorage.removeItem("seekerPhoto");
    localStorage.removeItem("seekerToken");
    
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhoto");
    localStorage.removeItem("userRole");
    localStorage.removeItem("token");
    
    localStorage.removeItem("companyId");
    localStorage.removeItem("companyName");
    localStorage.removeItem("companyPhoto");
    
    document.cookie = "isAuthenticated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirecionar para a página inicial
    router.push("/");
    
    // Recarregar a página para garantir que o estado do componente seja atualizado
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleGoToDashboard = () => {
    if (!userInfo) return;
    
    switch (userInfo.type) {
      case 'seeker':
        router.push("/seeker-dashboard");
        break;
      case 'company':
        router.push("/company-dashboard");
        break;
      case 'admin':
        router.push("/admin/dashboard");
        break;
      case 'support':
        router.push("/support-dashboard");
        break;
    }
  };

  // Se não há usuário logado, não renderiza nada
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-orange-500 bg-black/20 flex items-center justify-center">
            <div className="animate-pulse w-4 h-4 bg-orange-500 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <div 
      className={`relative ${className}`}
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="flex items-center gap-2 cursor-pointer"
      >
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-orange-500">
          <img
            src={userInfo.photo}
            alt={`${userInfo.name}'s profile`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/logo.png';
            }}
          />
        </div>
        <span className="hidden md:inline text-sm font-medium text-white">
          {userInfo.name.length > 12 ? `${userInfo.name.substring(0, 12)}...` : userInfo.name}
        </span>
      </div>
      
      {isDropdownOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-black/95 border border-gray-700 rounded-md shadow-lg py-1 z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="text-orange-400 font-semibold">{userInfo.name}</p>
            <p className="text-gray-400 text-xs">{userInfo.role}</p>
          </div>
          
          <button 
            onClick={handleGoToDashboard}
            className="px-4 py-2 text-gray-200 hover:bg-orange-500 hover:text-white w-full text-left"
          >
            Dashboard
          </button>
          
          <button 
            onClick={handleLogout}
            className="px-4 py-2 text-gray-200 hover:bg-red-600 hover:text-white w-full text-left"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfileButton;