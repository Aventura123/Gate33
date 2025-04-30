// Um hook personalizado para verificar permissões de administrador
import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Defina tipos para os papéis e permissões
export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminPermissions {
  canManageUsers: boolean;
  canApproveCompanies: boolean;
  canDeleteJobs: boolean;
  canAccessSettings: boolean;
  canViewAnalytics: boolean;
  canEditContent: boolean;
  canManageNFTs: boolean;     // Nova permissão para NFTs
  canManagePayments: boolean; // Nova permissão para pagamentos
}

// Mapeamento padrão de papéis para permissões
const defaultRolePermissions: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    canManageUsers: true,
    canApproveCompanies: true,
    canDeleteJobs: true,
    canAccessSettings: true,
    canViewAnalytics: true,
    canEditContent: true,
    canManageNFTs: true,
    canManagePayments: true
  },
  admin: {
    canManageUsers: false,
    canApproveCompanies: true,
    canDeleteJobs: true,
    canAccessSettings: true,
    canViewAnalytics: true,
    canEditContent: true,
    canManageNFTs: false,
    canManagePayments: false
  },
  support: {
    canManageUsers: false,
    canApproveCompanies: false,
    canDeleteJobs: false,
    canAccessSettings: false,
    canViewAnalytics: false,
    canEditContent: false,
    canManageNFTs: false,
    canManagePayments: false
  }
};

// Função segura para acessar localStorage (apenas no cliente)
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

export const useAdminPermissions = () => {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminPermissions = async () => {
      try {
        console.log("Fetching admin permissions...");
        setLoading(true);
        
        if (!db) {
          throw new Error("Firebase is not initialized");
        }
        
        // Verificação forçada para André Ventura (super_admin)
        const adminId = getLocalStorageItem("userId");
        const userName = getLocalStorageItem("userName") || "Unknown User";
        
        console.log("Admin ID from localStorage:", adminId);
        console.log("User Name from localStorage:", userName);
        
        // Verifica se é o usuário André Ventura e força super_admin
        if (userName === "André Ventura" || adminId === "a4425bf7-3a96-4a94-a95c-51689181413e") {
          console.log("Detectado usuário André Ventura - Aplicando permissões de super_admin");
          const superAdminRole: AdminRole = 'super_admin';
          
          if (typeof window !== 'undefined') {
            localStorage.setItem("userRole", superAdminRole);
          }
          
          // Define todas as permissões como true
          const fullPermissions: AdminPermissions = {
            canManageUsers: true,
            canApproveCompanies: true,
            canDeleteJobs: true,
            canAccessSettings: true,
            canViewAnalytics: true,
            canEditContent: true,
            canManageNFTs: true,
            canManagePayments: true
          };
          
          console.log("Super admin permissions applied:", fullPermissions);
          setRole(superAdminRole);
          setPermissions(fullPermissions);
          setError(null);
          setLoading(false);
          return;
        }
        
        // Processamento normal para outros usuários
        const userRole = getLocalStorageItem("userRole") || "viewer";
        console.log("User Role from localStorage:", userRole);

        if (!adminId) {
          console.warn("Admin ID not found in localStorage. Attempting to refresh session.");

          // Attempt to refresh session or re-fetch token
          const token = getLocalStorageItem("token");
          if (token) {
            console.log("Token found. Attempting to reinitialize session.");
            // Logic to reinitialize session using the token can be added here
            setError(null);
            setLoading(false);
            return;
          }

          console.warn("Token also not found. Redirecting to login page.");
          setError("Admin ID not found");
          setLoading(false);
          if (typeof window !== 'undefined') {
            window.location.replace("/admin-login");
          }
          return;
        }
        
        // Primeiro verificamos se há um role válido no localStorage
        let adminRole: AdminRole;
        
        // Se o userRole do localStorage for válido (super_admin, admin, support), usamos ele
        if (['super_admin', 'admin', 'support'].includes(userRole)) {
          console.log(`Using role from localStorage: ${userRole}`);
          adminRole = userRole as AdminRole;
        } else {
          // Caso contrário, buscamos no Firestore
          const adminDoc = await getDoc(doc(db, "admins", adminId));
          console.log("Admin document fetched:", adminDoc.exists() ? adminDoc.data() : "Not found");
          
          if (!adminDoc.exists()) {
            throw new Error("Admin not found in Firestore");
          }
          
          const adminData = adminDoc.data();
          adminRole = adminData.role as AdminRole;
          console.log("Admin role from Firestore:", adminRole);
          
          // Validação do role obtido do Firestore
          if (!['super_admin', 'admin', 'support'].includes(adminRole)) {
            console.warn(`Invalid role "${adminRole}" found in Firestore, defaulting to admin`);
            adminRole = 'admin';
          }
          
          // Sincronizamos o localStorage com o valor do Firestore
          if (typeof window !== 'undefined') {
            localStorage.setItem("userRole", adminRole);
          }
        }
        
        console.log("Final admin role:", adminRole);
        
        const adminPermissions = {
          ...defaultRolePermissions[adminRole]
        };
        
        // Se o usuário for super_admin, garantimos todas as permissões
        if (adminRole === 'super_admin') {
          Object.keys(adminPermissions).forEach(key => {
            adminPermissions[key as keyof AdminPermissions] = true;
          });
        }
        
        console.log("Admin permissions:", adminPermissions);
        
        setRole(adminRole);
        setPermissions(adminPermissions);
        setError(null);
      } catch (err) {
        console.error("Error fetching admin permissions:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
        setRole('admin');
        setPermissions(defaultRolePermissions.admin);
      } finally {
        setLoading(false);
      }
    };
    
    if (typeof window !== 'undefined') {
      fetchAdminPermissions();
    } else {
      // No servidor, definir valores padrão
      setRole('admin');
      setPermissions(defaultRolePermissions.admin);
      setLoading(false);
    }
  }, []);
  
  // Função de verificação de permissão para uso em componentes
  const hasPermission = useCallback((permission: keyof AdminPermissions): boolean => {
    // Verificação especial para André Ventura
    const userName = getLocalStorageItem("userName");
    const adminId = getLocalStorageItem("userId");
    
    // Se for André Ventura, garantir permissão total
    if (userName === "André Ventura" || adminId === "a4425bf7-3a96-4a94-a95c-51689181413e") {
      console.log(`[OVERRIDE] Permissão ${permission} aprovada para super_admin André Ventura`);
      return true;
    }
    
    const result = permissions?.[permission] === true;
    console.log(`Verificando permissão: ${permission}, Role atual: ${role}, Resultado:`, result);
    return result;
  }, [permissions, role]);
  
  return { role, permissions, loading, error, hasPermission };
};