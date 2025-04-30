"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
  
  // Referência para o container do dropdown para detectar quando o mouse sai
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();

  // Função para verificar o tipo de usuário logado com base nos valores armazenados no localStorage
  useEffect(() => {
    const checkLoggedInUser = () => {
      // Verificar seeker
      if (localStorage.getItem("seekerId") && localStorage.getItem("seekerName")) {
        return {
          name: localStorage.getItem("seekerName") || "Usuário",
          photo: localStorage.getItem("seekerPhoto") || "/images/default-avatar.png",
          role: "Job Seeker",
          type: 'seeker' as const
        };
      }
      
      // Verificar admin ou support (ambos usam as mesmas chaves de localStorage)
      if (localStorage.getItem("userId") && localStorage.getItem("userName") && localStorage.getItem("userRole")) {
        // Formatar o role para exibição adequada
        const userRole = localStorage.getItem("userRole") || "";
        
        // Verificar se é um usuário de suporte
        if (userRole === "support") {
          return {
            name: localStorage.getItem("userName") || "Suporte",
            photo: localStorage.getItem("userPhoto") || "/images/support-avatar.png",
            role: "Support",
            type: 'support' as const
          };
        }
        
        // Se não for support, então é admin
        const formattedRole = userRole === "super_admin" ? "Super Admin" : 
                             userRole.charAt(0).toUpperCase() + userRole.slice(1);
        
        return {
          name: localStorage.getItem("userName") || "Admin",
          photo: localStorage.getItem("userPhoto") || "/images/default-avatar.png",
          role: formattedRole,
          type: 'admin' as const
        };
      }
      
      // Verificar company
      if (localStorage.getItem("companyId") && localStorage.getItem("companyName")) {
        return {
          name: localStorage.getItem("companyName") || "Empresa",
          photo: localStorage.getItem("companyPhoto") || "/images/default-company.png",
          role: "Company",
          type: 'company' as const
        };
      }
      
      return null;
    };

    // Executar apenas no cliente
    if (typeof window !== 'undefined') {
      setUserInfo(checkLoggedInUser());
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
  if (!userInfo) {
    return null;
  }

  return (
    <div 
      className={`relative ${className}`}
      ref={dropdownRef}
      onMouseEnter={() => setIsDropdownOpen(true)}
      onMouseLeave={() => setIsDropdownOpen(false)}
    >
      <div
        className="flex items-center gap-2 cursor-pointer"
      >
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-orange-500">
          <img
            src={userInfo.photo}
            alt={`${userInfo.name}'s profile`}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="hidden md:inline text-sm font-medium text-white">
          {userInfo.name.length > 12 ? `${userInfo.name.substring(0, 12)}...` : userInfo.name}
        </span>
      </div>
      
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-gray-700 rounded-md shadow-lg py-1 z-50">
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