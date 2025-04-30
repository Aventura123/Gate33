"use client";

import React, { useState, useEffect } from 'react';
import { useAdminPermissions, AdminRole } from '../../hooks/useAdminPermissions';
import { useRouter } from 'next/navigation';
import { logAdminAction } from '../../utils/logSystem';

interface AdminWithPermissions {
  id: string;
  name: string;
  role: AdminRole;
  email: string;
  username?: string;
}

const availableRoles: AdminRole[] = ['super_admin', 'admin', 'support'];

// Function to get display name for roles
const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'super_admin': return 'Super Admin: Complete access to all system functions';
    case 'admin': return 'Admin: Can manage users and approve companies';
    case 'support': return 'Support: Limited access to assist users';
    default: return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

const AdminPermissionsManager: React.FC = () => {
  const [admins, setAdmins] = useState<AdminWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AdminRole>("admin");
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { hasPermission, role } = useAdminPermissions();
  const router = useRouter();

  // Fetch admin users with their roles
  useEffect(() => {
    const fetchAdmins = async () => {
      setLoading(true);
      try {
        // Verificar se há algum token - aceitando 'token' ou 'adminToken'
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        const userName = localStorage.getItem('userName');
        const userId = localStorage.getItem('userId');
        
        // Se for André Ventura com permissões especiais, podemos prosseguir mesmo sem token
        const isSpecialUser = userName === "André Ventura" || userId === "a4425bf7-3a96-4a94-a95c-51689181413e";
        
        if (!token && !isSpecialUser) {
          console.warn('Authentication token not found in localStorage');
          
          // Caso de erro apenas se não for um usuário especial
          if (!isSpecialUser) {
            console.log('Redirecting to login page due to missing token.');
            router.replace('/admin-login');
            return;
          }
        }

        if (token) {
          console.log('Token found in localStorage');
        }
        
        if (isSpecialUser) {
          console.log('Special user detected, proceeding without token validation');
        }

        const res = await fetch('/api/admin');

        if (!res.ok) {
          console.error('Failed to fetch admins. Status:', res.status);
          throw new Error('Failed to fetch admins');
        }

        const data = await res.json();
        console.log('Admins fetched successfully:', data);

        // Sort admins by role importance
        const roleOrder: Record<string, number> = {
          "super_admin": 1,
          "superadmin": 1, // Para compatibilidade
          "admin": 2,
          "support": 3
        };

        // Normalizando roles obsoletas
        const normalizedAdmins = data.map((admin: AdminWithPermissions) => {
          let role: AdminRole = admin.role as AdminRole;
          if ((role as string) === 'superadmin') {
            role = 'super_admin';
          } else if (!['super_admin', 'admin', 'support'].includes(role)) {
            role = 'admin';
          }
          return { ...admin, role };
        });

        const sortedAdmins = normalizedAdmins.sort((a: AdminWithPermissions, b: AdminWithPermissions) => {
          const roleA = a.role || 'admin';
          const roleB = b.role || 'admin';
          return (roleOrder[roleA] || 999) - (roleOrder[roleB] || 999);
        });

        console.log('Admins sorted by role:', sortedAdmins);
        setAdmins(sortedAdmins);
      } catch (err: any) {
        console.error('Error fetching admins:', err);
        setError(err.message || 'An error occurred while fetching admins');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [router]);

  const handleRoleChange = async () => {
    if (!selectedAdmin || !newRole) return;
    
    setUpdating(true);
    setSuccessMessage(null);
    setError(null);
    
    try {
      // Verificar se há algum token - aceitando 'token' ou 'adminToken'
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const userName = localStorage.getItem('userName');
      const userId = localStorage.getItem('userId');
      
      // Se for André Ventura com permissões especiais, podemos prosseguir mesmo sem token
      const isSpecialUser = userName === "André Ventura" || userId === "a4425bf7-3a96-4a94-a95c-51689181413e";
      
      if (!token && !isSpecialUser) {
        // Silently redirect to login instead of showing the error
        router.replace('/admin-login');
        return;
      }
      
      const res = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'special_override_for_admin'}`
        },
        body: JSON.stringify({ 
          adminId: selectedAdmin, 
          role: newRole 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update admin role');
      }
      
      // Update local state to reflect the change
      setAdmins(admins.map(admin => 
        admin.id === selectedAdmin 
          ? { ...admin, role: newRole } 
          : admin
      ));
      
      // Registrar a ação no sistema de logs
      const targetAdmin = admins.find(admin => admin.id === selectedAdmin);
      if (targetAdmin) {
        await logAdminAction(
          userId || 'unknown',
          userName || 'unknown',
          `Alteração de permissão de administrador`,
          {
            targetAdminId: selectedAdmin,
            targetAdminName: targetAdmin.name,
            oldRole: targetAdmin.role,
            newRole: newRole,
            timestamp: new Date().toISOString()
          }
        );
      }
      
      setSuccessMessage('Admin role updated successfully');
      setSelectedAdmin(null);
      setNewRole("admin");
      
    } catch (err: any) {
      console.error('Error updating admin permissions:', err);
      setError(err.message || 'An error occurred while updating permissions');
    } finally {
      setUpdating(false);
    }
  };

  // Check if user has permission to manage permissions
  if (!hasPermission('canManageUsers')) {
    return (
      <div className="bg-red-900/40 p-4 rounded-lg text-center">
        <p>You don't have permission to manage admin roles.</p>
      </div>
    );
  }

  return (
    <div className="bg-black/70 p-4 rounded-lg text-white">
      <h3 className="text-lg font-semibold text-orange-400 mb-4">Admin Permissions</h3>
      
      {role === 'super_admin' && (
        <div className="mb-4 p-2 border border-green-400 rounded bg-green-900/30">
          <p className="text-green-400">Super Admin access confirmed. You have full access to manage permissions.</p>
        </div>
      )}
      
      {loading && <p className="text-gray-300">Loading admins...</p>}
      {error && <p className="text-red-400 mb-3">{error}</p>}
      {successMessage && <p className="text-green-400 mb-3">{successMessage}</p>}
      
      {!loading && !error && (
        <>
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1">Select Admin</label>
            <select 
              className="w-full bg-black/70 border border-gray-600 rounded px-3 py-2 text-white"
              value={selectedAdmin || ''}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              disabled={updating}
            >
              <option value="">Select an admin</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} ({admin.email || admin.username}) - {getRoleDisplayName(admin.role || 'admin')}
                </option>
              ))}
            </select>
          </div>
          
          {selectedAdmin && (
            <>
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1">Assign Role</label>
                <select 
                  className="w-full bg-black/70 border border-gray-600 rounded px-3 py-2 text-white"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AdminRole)}
                  disabled={updating}
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleRoleChange}
                className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors w-full disabled:opacity-60"
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Permissions'}
              </button>
            </>
          )}
        </>
      )}
      
      <div className="mt-6 text-sm text-gray-400">
        <h4 className="font-medium text-gray-300">Role Descriptions:</h4>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li><span className="text-orange-400">Super Admin:</span> Complete access to all system functions</li>
          <li><span className="text-orange-400">Admin:</span> Access to most functions except user management, NFTs, and payment settings</li>
          <li><span className="text-orange-400">Support:</span> Limited access to assist users</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPermissionsManager;
