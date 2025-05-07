// A custom hook to check administrator permissions
import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Define types for roles and permissions
export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminPermissions {
  canManageUsers: boolean;
  canApproveCompanies: boolean;
  canDeleteJobs: boolean;
  canAccessSettings: boolean;
  canViewAnalytics: boolean;
  canEditContent: boolean;
  canManageNFTs: boolean;     // New permission for NFTs
  canManagePayments: boolean; // New permission for payments
}

// Default role to permissions mapping
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

// Safe function to access localStorage (client-side only)
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

// Interface for hook options
interface UseAdminPermissionsOptions {
  redirectUrl?: string; // URL for redirection in case of authentication error
}

export const useAdminPermissions = (options: UseAdminPermissionsOptions = {}) => {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Define default redirect URL as /admin-login if not specified
  const redirectUrl = options.redirectUrl || "/admin-login";

  useEffect(() => {
    const fetchAdminPermissions = async () => {
      try {
        console.log("Fetching admin permissions...");
        setLoading(true);
        
        if (!db) {
          throw new Error("Firebase is not initialized");
        }
        
        // Forced verification for André Ventura (super_admin)
        const adminId = getLocalStorageItem("userId");
        const userName = getLocalStorageItem("userName") || "Unknown User";
        
        console.log("Admin ID from localStorage:", adminId);
        console.log("User Name from localStorage:", userName);
        
        // Check if the user is André Ventura and force super_admin
        if (userName === "André Ventura" || adminId === "a4425bf7-3a96-4a94-a95c-51689181413e") {
          console.log("Detected user André Ventura - Applying super_admin permissions");
          const superAdminRole: AdminRole = 'super_admin';
          
          if (typeof window !== 'undefined') {
            localStorage.setItem("userRole", superAdminRole);
          }
          
          // Set all permissions to true
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
        
        // Normal processing for other users
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

          console.warn("Token also not found. Redirecting to login page:", redirectUrl);
          setError("Admin ID not found");
          setLoading(false);
          if (typeof window !== 'undefined') {
            // Using the configurable redirect URL
            window.location.replace(redirectUrl);
          }
          return;
        }
        
        // First check if there's a valid role in localStorage
        let adminRole: AdminRole;
        
        // If the userRole from localStorage is valid (super_admin, admin, support), use it
        if (['super_admin', 'admin', 'support'].includes(userRole)) {
          console.log(`Using role from localStorage: ${userRole}`);
          adminRole = userRole as AdminRole;
        } else {
          // Otherwise, fetch from Firestore
          const adminDoc = await getDoc(doc(db, "admins", adminId));
          console.log("Admin document fetched:", adminDoc.exists() ? adminDoc.data() : "Not found");
          
          if (!adminDoc.exists()) {
            throw new Error("Admin not found in Firestore");
          }
          
          const adminData = adminDoc.data();
          adminRole = adminData.role as AdminRole;
          console.log("Admin role from Firestore:", adminRole);
          
          // Validation of the role obtained from Firestore
          if (!['super_admin', 'admin', 'support'].includes(adminRole)) {
            console.warn(`Invalid role "${adminRole}" found in Firestore, defaulting to admin`);
            adminRole = 'admin';
          }
          
          // Synchronize localStorage with the value from Firestore
          if (typeof window !== 'undefined') {
            localStorage.setItem("userRole", adminRole);
          }
        }
        
        console.log("Final admin role:", adminRole);
        
        const adminPermissions = {
          ...defaultRolePermissions[adminRole]
        };
        
        // If the user is super_admin, ensure all permissions are granted
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
      // On the server, set default values
      setRole('admin');
      setPermissions(defaultRolePermissions.admin);
      setLoading(false);
    }
  }, [redirectUrl]);
  
  // Permission verification function for use in components
  const hasPermission = useCallback((permission: keyof AdminPermissions): boolean => {
    // Special check for André Ventura
    const userName = getLocalStorageItem("userName");
    const adminId = getLocalStorageItem("userId");
    
    // If it's André Ventura, ensure full permissions
    if (userName === "André Ventura" || adminId === "a4425bf7-3a96-4a94-a95c-51689181413e") {
      console.log(`[OVERRIDE] Permission ${permission} granted for super_admin André Ventura`);
      return true;
    }
    
    const result = permissions?.[permission] === true;
    console.log(`Checking permission: ${permission}, Current role: ${role}, Result:`, result);
    return result;
  }, [permissions, role]);
  
  return { role, permissions, loading, error, hasPermission };
};