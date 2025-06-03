// A custom hook to check administrator permissions
import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Define types for roles and permissions
export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminPermissions {
  // Tab-level visibility permissions (if you can see the tab, you have full access to it)
  canAccessNFTs: boolean;
  canAccessNFTsAdd: boolean;
  canAccessNFTsDelete: boolean;
  canAccessNFTsDeleteAll: boolean;
  canAccessUsers: boolean;
  canAccessUsersAdms: boolean;
  canAccessUsersEmployersList: boolean;  canAccessUsersEmployersCreate: boolean;
  canAccessUsersEmployersApprove: boolean; // Property now required, not optional
  canAccessUsersSeekers: boolean;
  canAccessJobs: boolean;
  canAccessJobsList: boolean;
  canAccessJobsCreate: boolean;
  canAccessJobsPrices: boolean;
  canAccessJobsConfig: boolean;
  canAccessInstantJobs: boolean;
  canAccessLearn2Earn: boolean;
  canAccessLearn2EarnList: boolean;
  canAccessLearn2EarnContracts: boolean;
  canAccessAdsManager: boolean;
  canAccessMarketing: boolean;
  canAccessMarketingNewsletter: boolean;
  canAccessMarketingSocialMedia: boolean;
  canAccessAccounting: boolean;
  canAccessSystemActivity: boolean;
  canAccessSettings: boolean;
  canAccessSettingsProfile: boolean;
  canAccessSettingsPermissions: boolean;
  canAccessPayments: boolean;
  canAccessPaymentsConfig: boolean;
  
  // UI-level permissions shown in dashboard
  canViewAnalytics: boolean;
  canManageUsers: boolean; // Controls managing admin users
  canApproveCompanies: boolean; // Controls company approval UI access
  canEditContent: boolean; // Controls content editing capabilities
}

// Default role to permissions mapping
const defaultRolePermissions: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    canAccessNFTs: true,
    canAccessNFTsAdd: true,
    canAccessNFTsDelete: true,
    canAccessNFTsDeleteAll: true,
    canAccessUsers: true,
    canAccessUsersAdms: true,
    canAccessUsersEmployersList: true,
    canAccessUsersEmployersCreate: true,
    canAccessUsersEmployersApprove: true,
    canAccessUsersSeekers: true,
    canAccessJobs: true,
    canAccessJobsList: true,
    canAccessJobsCreate: true,
    canAccessJobsPrices: true,
    canAccessJobsConfig: true,
    canAccessInstantJobs: true,
    canAccessLearn2Earn: true,
    canAccessLearn2EarnList: true,
    canAccessLearn2EarnContracts: true,
    canAccessAdsManager: true,
    canAccessMarketing: true,
    canAccessMarketingNewsletter: true,
    canAccessMarketingSocialMedia: true,
    canAccessAccounting: true,
    canAccessSystemActivity: true,
    canAccessSettings: true,
    canAccessSettingsProfile: true,
    canAccessSettingsPermissions: true,
    canAccessPayments: true,
    canAccessPaymentsConfig: true,
    canViewAnalytics: true,
    canManageUsers: true,
    canApproveCompanies: true,
    canEditContent: true,
  },
  admin: {
    canAccessNFTs: true,
    canAccessNFTsAdd: true,
    canAccessNFTsDelete: true,
    canAccessNFTsDeleteAll: false,
    canAccessUsers: true,
    canAccessUsersAdms: true,
    canAccessUsersEmployersList: true,
    canAccessUsersEmployersCreate: false,
    canAccessUsersEmployersApprove: false,
    canAccessUsersSeekers: true,
    canAccessJobs: true,
    canAccessJobsList: true,
    canAccessJobsCreate: true,
    canAccessJobsPrices: false,
    canAccessJobsConfig: false,
    canAccessInstantJobs: true,
    canAccessLearn2Earn: false,
    canAccessLearn2EarnList: false,
    canAccessLearn2EarnContracts: false,
    canAccessAdsManager: false,
    canAccessMarketing: false,
    canAccessMarketingNewsletter: false,
    canAccessMarketingSocialMedia: false,
    canAccessAccounting: false,
    canAccessSystemActivity: false,
    canAccessSettings: false,
    canAccessSettingsProfile: false,
    canAccessSettingsPermissions: false,
    canAccessPayments: false,
    canAccessPaymentsConfig: false,
    canViewAnalytics: true,
    canManageUsers: true,
    canApproveCompanies: false,
    canEditContent: true,  },
  support: {
    canAccessNFTs: false,
    canAccessNFTsAdd: false,
    canAccessNFTsDelete: false,
    canAccessNFTsDeleteAll: false,
    canAccessUsers: true,
    canAccessUsersAdms: false,
    canAccessUsersEmployersList: true,
    canAccessUsersEmployersCreate: false,
    canAccessUsersEmployersApprove: false,
    canAccessUsersSeekers: false,
    canAccessJobs: true,
    canAccessJobsList: true,
    canAccessJobsCreate: false,
    canAccessJobsPrices: false,
    canAccessJobsConfig: false,
    canAccessInstantJobs: false,
    canAccessLearn2Earn: false,
    canAccessLearn2EarnList: false,
    canAccessLearn2EarnContracts: false,
    canAccessAdsManager: false,
    canAccessMarketing: false,
    canAccessMarketingNewsletter: false,
    canAccessMarketingSocialMedia: false,
    canAccessAccounting: false,
    canAccessSystemActivity: false,
    canAccessSettings: false,
    canAccessSettingsProfile: false,
    canAccessSettingsPermissions: false,
    canAccessPayments: false,
    canAccessPaymentsConfig: false,
    canViewAnalytics: false,
    canManageUsers: false,
    canApproveCompanies: false,
    canEditContent: false,
  },
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
          // Set all permissions to true (expanded)
          const fullPermissions: AdminPermissions = {
            canAccessNFTs: true,
            canAccessNFTsAdd: true,
            canAccessNFTsDelete: true,
            canAccessNFTsDeleteAll: true,
            canAccessUsers: true,
            canAccessUsersAdms: true,
            canAccessUsersEmployersList: true,
            canAccessUsersEmployersCreate: true,
            canAccessUsersEmployersApprove: true,
            canAccessUsersSeekers: true,
            canAccessJobs: true,
            canAccessJobsList: true,
            canAccessJobsCreate: true,
            canAccessJobsPrices: true,
            canAccessJobsConfig: true,
            canAccessInstantJobs: true,
            canAccessLearn2Earn: true,
            canAccessLearn2EarnList: true,
            canAccessLearn2EarnContracts: true,
            canAccessAdsManager: true,
            canAccessMarketing: true,
            canAccessMarketingNewsletter: true,
            canAccessMarketingSocialMedia: true,
            canAccessAccounting: true,
            canAccessSystemActivity: true,
            canAccessSettings: true,
            canAccessSettingsProfile: true,
            canAccessSettingsPermissions: true,
            canAccessPayments: true,
            canAccessPaymentsConfig: true,
            canViewAnalytics: true,
            canManageUsers: true,
            canApproveCompanies: true,
            canEditContent: true,
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
        
        // Get permissions for the role from API (which checks custom permissions first, then defaults)
        try {
          const rolePermissionsResponse = await fetch(`/api/admin/role-permissions?role=${adminRole}`);
          const rolePermissionsData = await rolePermissionsResponse.json();
          
          let adminPermissions: AdminPermissions;
          
          if (rolePermissionsData.success) {
            adminPermissions = rolePermissionsData.permissions;
            console.log("Permissions loaded from API:", adminPermissions);
          } else {
            // Fallback to default permissions
            adminPermissions = { ...defaultRolePermissions[adminRole] };
            console.log("Using fallback default permissions:", adminPermissions);
          }
          
          setRole(adminRole);
          setPermissions(adminPermissions);
          setError(null);
        } catch (permissionsError) {
          console.warn("Error loading role permissions from API, using defaults:", permissionsError);
          // Fallback to default permissions if API fails
          const adminPermissions = { ...defaultRolePermissions[adminRole] };
          
          console.log("Admin permissions:", adminPermissions);
          
          setRole(adminRole);
          setPermissions(adminPermissions);
          setError(null);
        }
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