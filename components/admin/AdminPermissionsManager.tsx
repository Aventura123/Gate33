"use client";

import React, { useState, useEffect } from 'react';
import { useAdminPermissions, AdminRole, AdminPermissions } from '../../hooks/useAdminPermissions';
import { useRouter } from 'next/navigation';
import { logAdminAction } from '../../utils/logSystem';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AdminWithPermissions {
  id: string;
  name: string;
  role: AdminRole;
  email: string;
  username?: string;
  // Removed permissions property since permissions are determined by role
}

const availableRoles: AdminRole[] = ['super_admin', 'admin', 'support'];

// Default permissions for each role
const defaultRolePermissions: Record<AdminRole, AdminPermissions> = {  super_admin: {
    // Main tabs
    canAccessDashboard: true,
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
    canAccessJobsConfig: true, // JobPost P. Manag.
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
    canAccessSettings: true,    canAccessSettingsProfile: true,
    canAccessSettingsPermissions: true,
    canAccessPayments: true,
    canAccessPaymentsConfig: true,
    canAccessTokenDistribution: true,
    // Legacy/additional permissions
    canViewAnalytics: true,
    canManageUsers: true,
    canApproveCompanies: true,
    canEditContent: true,
  },  admin: {
    canAccessDashboard: true,
    canAccessNFTs: true,
    canAccessNFTsAdd: true,
    canAccessNFTsDelete: true,
    canAccessNFTsDeleteAll: false,
    canAccessUsers: true,    canAccessUsersAdms: true,
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
    canAccessSettings: false,    canAccessSettingsProfile: false,
    canAccessSettingsPermissions: false,
    canAccessPayments: false,
    canAccessPaymentsConfig: false,
    canAccessTokenDistribution: false,
    canViewAnalytics: true,
    canManageUsers: true,
    canApproveCompanies: false,
    canEditContent: true,
  },  support: {
    canAccessDashboard: true,
    canAccessNFTs: false,
    canAccessNFTsAdd: false,
    canAccessNFTsDelete: false,
    canAccessNFTsDeleteAll: false,
    canAccessUsers: true,    canAccessUsersAdms: false,
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
    canAccessSettings: false,    canAccessSettingsProfile: false,
    canAccessSettingsPermissions: false,
    canAccessPayments: false,
    canAccessPaymentsConfig: false,
    canAccessTokenDistribution: false,
    canViewAnalytics: false,
    canManageUsers: false,
    canApproveCompanies: false,
    canEditContent: false,
  },
}; // Added missing semicolon

// Function to get display name for roles
const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'support': return 'Support';
    default: return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

// Function to get friendly permission names
const getPermissionDisplayName = (permissionKey: string): string => {  const permissionNames: Record<string, string> = {
    // Tabs principais
    canAccessDashboard: 'Dashboard',
    canAccessNFTs: 'Manage NFTs',
    canAccessNFTsAdd: 'Add NFT',
    canAccessNFTsDelete: 'Delete NFT',
    canAccessNFTsDeleteAll: 'Delete All NFTs',
    canAccessUsers: 'Manage Users',
    canAccessUsersAdms: 'Admins',
    canAccessUsersEmployersList: 'Employers - List',
    canAccessUsersEmployersCreate: 'Approve Companies',
    canAccessUsersSeekers: 'Seekers',
    canAccessJobs: 'Manage Jobs',
    canAccessJobsList: 'Jobs List',
    canAccessJobsCreate: 'Create Job',
    canAccessJobsPrices: 'Job Plans',
    canAccessJobsConfig: 'JobPost P. Manag.',
    canAccessInstantJobs: 'Manage Instant Jobs',
    canAccessLearn2Earn: 'Learn2Earn',
    canAccessLearn2EarnList: 'Learn2Earn List',
    canAccessLearn2EarnContracts: 'Smart Contracts',
    canAccessAdsManager: 'Ads Manager',
    canAccessMarketing: 'Marketing Tools',
    canAccessMarketingNewsletter: 'Newsletter',
    canAccessMarketingSocialMedia: 'Social Media',
    canAccessAccounting: 'Accounting',
    canAccessSystemActivity: 'System Activity',
    canAccessSettings: 'System Settings',
    canAccessSettingsProfile: 'My Profile',
    canAccessSettingsPermissions: 'Manage Admins & Permissions',
    canAccessPayments: 'Payments',
    canAccessPaymentsConfig: 'Payment Configuration',
    canAccessTokenDistribution: 'Token Distribution',
    // Legacy/additional permissions
    canViewAnalytics: 'View Analytics',
    canManageUsers: 'Manage Admin Users',
    canApproveCompanies: 'Approve Companies',
    canEditContent: 'Edit Website Content',
  };
  return permissionNames[permissionKey] || permissionKey;
}; // Added missing semicolon

// Agrupamento de permissões por tab e subtab
const permissionGroups = [
  {
    label: 'Dashboard',
    main: 'canAccessDashboard',
    children: [],
  },
  {
    label: 'NFTs',
    main: 'canAccessNFTs',
    children: [
      'canAccessNFTsAdd',
      'canAccessNFTsDelete',
      'canAccessNFTsDeleteAll',
    ],
  },
  {
    label: 'Users',
    main: 'canAccessUsers',
    children: [
      'canAccessUsersAdms',
      'canAccessUsersEmployersList',
      'canAccessUsersEmployersCreate',
      'canAccessUsersSeekers',
    ],
  },
  {
    label: 'Jobs',
    main: 'canAccessJobs',
    children: [
      'canAccessJobsList',
      'canAccessJobsCreate',
      'canAccessJobsPrices',
      'canAccessJobsConfig',
    ],
  },
  {
    label: 'Instant Jobs',
    main: 'canAccessInstantJobs',
    children: [],
  },
  {
    label: 'Learn2Earn',
    main: 'canAccessLearn2Earn',
    children: [
      'canAccessLearn2EarnList',
      'canAccessLearn2EarnContracts',
    ],
  },
  {
    label: 'Ads Manager',
    main: 'canAccessAdsManager',
    children: [],
  },
  {
    label: 'Marketing',
    main: 'canAccessMarketing',
    children: [
      'canAccessMarketingNewsletter',
      'canAccessMarketingSocialMedia',
    ],
  },
  {
    label: 'Accounting',
    main: 'canAccessAccounting',
    children: [],
  },
  {
    label: 'System Activity',
    main: 'canAccessSystemActivity',
    children: [],
  },
  {
    label: 'Payments',
    main: 'canAccessPayments',
    children: [
      'canAccessPaymentsConfig',
      'canAccessTokenDistribution',
    ],
  },
  {
    label: 'System Settings',
    main: 'canAccessSettings',
    children: [
      'canAccessSettingsProfile',
      'canAccessSettingsPermissions',
    ],
  },  // Permissões extras/legado
  {
    label: 'Extras',
    main: null,
    children: [
      'canViewAnalytics',
      'canManageUsers',
      'canEditContent',
    ],
  },
];

const AdminPermissionsManager: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<AdminRole>('super_admin');
  const [rolePermissions, setRolePermissions] = useState<AdminPermissions>(defaultRolePermissions.super_admin);
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);  const { hasPermission, role } = useAdminPermissions();
  const router = useRouter();

  // Load initial permissions for the default selected role
  useEffect(() => {
    handleRoleSelection(selectedRole);
  }, []);

  // Handle role selection change
  const handleRoleSelection = async (selectedRole: AdminRole) => {
    setSelectedRole(selectedRole);
    setSuccessMessage(null);
    setError(null);
    
    try {
      // Fetch the current permissions for this role from the API
      const response = await fetch(`/api/admin/role-permissions?role=${selectedRole}`);
      const data = await response.json();
      
      if (data.success) {
        setRolePermissions(data.permissions);
      } else {
        console.error('Failed to fetch role permissions:', data.error);
        // Fallback to default permissions
        setRolePermissions(defaultRolePermissions[selectedRole]);
      }
    } catch (err) {
      console.error('Error fetching role permissions:', err);
      // Fallback to default permissions
      setRolePermissions(defaultRolePermissions[selectedRole]);
    }
  };
  // Handle permission toggle for the selected role
  const handlePermissionToggle = async (permissionKey: keyof AdminPermissions) => {
    if (role !== 'super_admin') {
      setError('Only Super Admins can modify role permissions');
      return;
    }

    setUpdating(true);
    setError(null);
    
    try {
      // Toggle the permission
      const newPermissions = {
        ...rolePermissions,
        [permissionKey]: !rolePermissions[permissionKey]
      };
      
      // Save to API
      const response = await fetch('/api/admin/role-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          permissions: newPermissions,
          adminRole: role
        })
      });

      const data = await response.json();

      if (data.success) {
        setRolePermissions(newPermissions);
        setSuccessMessage(`Permission updated for ${getRoleDisplayName(selectedRole)} role`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to update permission');
      }
      
    } catch (err: any) {
      console.error('Error updating role permission:', err);
      setError(err.message || 'An error occurred while updating permission');
    } finally {
      setUpdating(false);
    }
  };// Check if user has permission to manage permissions
  if (!hasPermission('canAccessUsers')) {
    return (
      <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-center text-sm">
        You do not have permission to manage administrator permissions.
      </div>
    );
  }

  return (
    <div className="bg-black/30 p-4 md:p-6 rounded-xl mb-6 md:mb-10 border border-gray-700 hover:border-orange-500 transition-colors">      <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">
        Role Permissions Manager
      </h3>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          {successMessage}
        </div>
      )}

      {/* Role Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Select role to manage:
        </label>
        <select
          value={selectedRole}
          onChange={(e) => handleRoleSelection(e.target.value as AdminRole)}
          className="w-full max-w-xs px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
        >
          {availableRoles.map((roleOption) => (
            <option key={roleOption} value={roleOption}>
              {getRoleDisplayName(roleOption)}
            </option>
          ))}
        </select>
      </div>

      {/* Permissions Grid for Selected Role */}
      <div className="bg-black/30 border border-gray-700 rounded-xl overflow-hidden transition-colors p-4 md:p-6 mb-6">
        <h4 className="text-base font-bold text-orange-400 mb-4">
          Permissions for {getRoleDisplayName(selectedRole)}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-4">
          {permissionGroups.map((group) => (
            <div key={group.label} className={group.children.length > 0 ? "mb-6" : "mb-2"}>
              {group.main && (
                <div className="flex items-center mb-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={`${selectedRole}-${group.main}`}
                      checked={!!rolePermissions[group.main as keyof AdminPermissions]}
                      onChange={() => handlePermissionToggle(group.main as keyof AdminPermissions)}
                      disabled={updating || role !== 'super_admin'}
                      className="mr-2 h-5 w-5 accent-orange-500"
                    />
                    <span className="text-orange-400 text-sm font-semibold">
                      {getPermissionDisplayName(group.main)}
                    </span>
                  </label>
                </div>
              )}
              {group.children.length > 0 && (
                <div className="ml-6 space-y-1">
                  {group.children.map((permissionKey) => (
                    <div key={permissionKey} className="flex items-center">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id={`${selectedRole}-${permissionKey}`}
                          checked={!!rolePermissions[permissionKey as keyof AdminPermissions]}
                          onChange={() => handlePermissionToggle(permissionKey as keyof AdminPermissions)}
                          disabled={updating || role !== 'super_admin'}
                          className="mr-2 h-5 w-5 accent-orange-500"
                        />
                        <span className="text-gray-300 text-sm font-medium">
                          {getPermissionDisplayName(permissionKey)}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {role !== 'super_admin' && (
          <div className="mt-4 p-3 bg-yellow-900/40 rounded border border-yellow-600">
            <p className="text-yellow-400 text-sm">
              <strong>Note:</strong> Only Super Admins can modify role permissions. You can view but not edit these settings.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 md:mt-8 text-sm text-gray-400">
        {/* Role descriptions removed as requested */}
      </div>
    </div>
  );
};

export default AdminPermissionsManager;
