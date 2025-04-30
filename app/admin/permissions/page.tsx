"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, updateDoc, Firestore } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAdminPermissions, AdminRole, AdminPermissions } from '../../../hooks/useAdminPermissions';
import Layout from '../../../components/Layout';

interface Admin {
  id: string;
  name: string;
  username: string;
  email: string;
  role: AdminRole;
  permissions?: AdminPermissions;
}

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

const AdminPermissionsManager: React.FC = () => {
  const router = useRouter();
  const { role, permissions, loading: permissionsLoading, hasPermission } = useAdminPermissions();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const hasAttemptedRedirect = useRef(false);

  // Permission verification and redirection
  useEffect(() => {
    if (!permissionsLoading && !hasPermission('canManageUsers')) {
      console.log('User without permission to manage users. Redirecting...');
      router.push('/admin/access-denied');
    }
  }, [permissionsLoading, hasPermission, router]);

  // Fetch admins only when having permission
  useEffect(() => {
    // Don't try to load data if still checking permissions
    // or if permission is not granted
    if (permissionsLoading || !hasPermission('canManageUsers')) return;

    const fetchAdmins = async () => {
      try {
        setLoading(true);
        
        // Check if Firestore is initialized
        if (!db) {
          throw new Error("Firebase is not initialized");
        }
        
        const adminsCollection = collection(db as Firestore, 'admins');
        const adminsSnapshot = await getDocs(adminsCollection);
        
        if (adminsSnapshot.empty) {
          setAdmins([]);
          return;
        }

        const adminsList: Admin[] = [];
        
        for (const docSnapshot of adminsSnapshot.docs) {
          const adminData = docSnapshot.data();
          const adminRole = (adminData.role as AdminRole) || 'viewer';
          
          adminsList.push({
            id: docSnapshot.id,
            name: adminData.name || adminData.username || 'Unknown',
            username: adminData.username || 'Unknown',
            email: adminData.email || 'No email',
            role: adminRole,
            permissions: adminData.permissions || defaultRolePermissions[adminRole]
          });
        }

        setAdmins(adminsList);
      } catch (err: any) {
        console.error('Error fetching admins:', err);
        setError('Failed to load administrators. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [permissionsLoading, hasPermission]);

  // Handle role change for an admin
  const handleRoleChange = async (adminId: string, newRole: AdminRole) => {
    try {
      setSavingId(adminId);
      setSuccessMessage(null);
      
      // Check if Firestore is initialized
      if (!db) {
        throw new Error("Firebase is not initialized");
      }
      
      // Get default permissions for the new role
      const defaultPermissions = defaultRolePermissions[newRole];
      
      // Update the admin in Firestore
      const adminRef = doc(db as Firestore, 'admins', adminId);
      await updateDoc(adminRef, {
        role: newRole,
        permissions: defaultPermissions
      });
      
      // Update local state
      setAdmins(prev => 
        prev.map(admin => 
          admin.id === adminId 
            ? { ...admin, role: newRole, permissions: defaultPermissions } 
            : admin
        )
      );
      
      setSuccessMessage('Role updated successfully');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating admin role:', err);
      setError(`Failed to update role: ${err.message}`);
      
      // Auto-clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setSavingId(null);
    }
  };

  // Handle permission change for an admin
  const handlePermissionChange = async (adminId: string, permKey: keyof AdminPermissions, value: boolean) => {
    try {
      setSavingId(adminId);
      setSuccessMessage(null);
      
      // Check if Firestore is initialized
      if (!db) {
        throw new Error("Firebase is not initialized");
      }
      
      const admin = admins.find(a => a.id === adminId);
      if (!admin) throw new Error('Admin not found');
      
      const updatedPermissions = { ...(admin.permissions || defaultRolePermissions[admin.role]) };
      updatedPermissions[permKey] = value;
      
      // Update the admin in Firestore
      const adminRef = doc(db as Firestore, 'admins', adminId);
      await updateDoc(adminRef, {
        permissions: updatedPermissions
      });
      
      // Update local state
      setAdmins(prev => 
        prev.map(admin => 
          admin.id === adminId 
            ? { ...admin, permissions: updatedPermissions } 
            : admin
        )
      );
      
      setSuccessMessage('Permission updated successfully');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating admin permission:', err);
      setError(`Failed to update permission: ${err.message}`);
      
      // Auto-clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setSavingId(null);
    }
  };

  // Reset permissions to defaults for the current role
  const resetToDefaults = async (adminId: string) => {
    try {
      setSavingId(adminId);
      setSuccessMessage(null);
      
      // Check if Firestore is initialized
      if (!db) {
        throw new Error("Firebase is not initialized");
      }
      
      const admin = admins.find(a => a.id === adminId);
      if (!admin) throw new Error('Admin not found');
      
      const defaultPermissions = defaultRolePermissions[admin.role];
      
      // Update the admin in Firestore
      const adminRef = doc(db as Firestore, 'admins', adminId);
      await updateDoc(adminRef, {
        permissions: defaultPermissions
      });
      
      // Update local state
      setAdmins(prev => 
        prev.map(admin => 
          admin.id === adminId 
            ? { ...admin, permissions: defaultPermissions } 
            : admin
        )
      );
      
      setSuccessMessage('Permissions reset to defaults successfully');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting admin permissions:', err);
      setError(`Failed to reset permissions: ${err.message}`);
      
      // Auto-clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-500 text-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-orange-300 mb-8">Admin Permissions Manager</h1>
          
          {permissionsLoading && (
            <div className="bg-black/30 p-6 rounded-lg text-center">
              <p>Loading permissions...</p>
            </div>
          )}
          
          {!permissionsLoading && !hasPermission('canManageUsers') && (
            <div className="bg-red-900/40 p-6 rounded-lg text-center">
              <h2 className="text-xl font-bold mb-4">Access Denied</h2>
              <p>You don't have permission to manage user permissions.</p>
            </div>
          )}
          
          {!permissionsLoading && hasPermission('canManageUsers') && (
            <div className="bg-black/30 p-6 rounded-lg">
              {loading ? (
                <p className="text-center">Loading administrators...</p>
              ) : error ? (
                <div className="bg-red-900/40 p-4 rounded-lg mb-4">
                  <p>{error}</p>
                </div>
              ) : (
                <>
                  {successMessage && (
                    <div className="bg-green-900/40 p-4 rounded-lg mb-4">
                      <p className="text-green-300">{successMessage}</p>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-black/50">
                          <th className="p-3 text-left border-b border-gray-700">Name</th>
                          <th className="p-3 text-left border-b border-gray-700">Username</th>
                          <th className="p-3 text-left border-b border-gray-700">Role</th>
                          <th className="p-3 text-left border-b border-gray-700">Permissions</th>
                          <th className="p-3 text-left border-b border-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins.map((admin) => (
                          <tr key={admin.id} className="border-b border-gray-700 hover:bg-black/20">
                            <td className="p-3">{admin.name}</td>
                            <td className="p-3">{admin.username}</td>
                            <td className="p-3">
                              <select
                                value={admin.role}
                                onChange={(e) => handleRoleChange(admin.id, e.target.value as AdminRole)}
                                className="bg-gray-800 text-white p-2 rounded border border-gray-600"
                                disabled={savingId === admin.id || admin.id === localStorage.getItem('userId')}
                              >
                                <option value="super_admin">Super Admin</option>
                                <option value="manager">Manager</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              {admin.id === localStorage.getItem('userId') && (
                                <p className="text-yellow-400 text-xs mt-1">Cannot change your own role</p>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="space-y-2">
                                {admin.permissions && Object.entries(admin.permissions).map(([key, value]) => (
                                  <div key={key} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id={`${admin.id}-${key}`}
                                      checked={value}
                                      onChange={(e) => handlePermissionChange(admin.id, key as keyof AdminPermissions, e.target.checked)}
                                      className="mr-2"
                                      disabled={savingId === admin.id || admin.id === localStorage.getItem('userId')}
                                    />
                                    <label htmlFor={`${admin.id}-${key}`} className="text-sm">
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => resetToDefaults(admin.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                disabled={savingId === admin.id || admin.id === localStorage.getItem('userId')}
                              >
                                Reset to Defaults
                              </button>
                              {admin.id === localStorage.getItem('userId') && (
                                <p className="text-yellow-400 text-xs mt-1">Cannot edit your own permissions</p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {admins.length === 0 && (
                    <p className="text-center text-gray-400 my-6">No administrators found.</p>
                  )}
                </>
              )}
              
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => router.back()}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Go Back
                </button>
                
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
                >
                  Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminPermissionsManager;