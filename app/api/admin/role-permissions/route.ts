import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { AdminRole, AdminPermissions } from '../../../../hooks/useAdminPermissions';

// Default permissions for each role
const defaultRolePermissions: Record<AdminRole, AdminPermissions> = {  super_admin: {
    canAccessDashboard: true,
    canAccessNFTs: true,
    canAccessNFTsAdd: true,
    canAccessNFTsDelete: true,
    canAccessNFTsDeleteAll: true,
    canAccessUsers: true,
    canAccessUsersAdms: true,
    canAccessUsersEmployersList: true,
    canAccessUsersEmployersCreate: true,
    canAccessUsersEmployersApprove: true, // Added missing property
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
    canAccessMarketingNewsletter: true,    canAccessMarketingSocialMedia: true,
    canAccessAccounting: true,
    canAccessTokenDistribution: true,
    canAccessSystemActivity: true,
    canAccessSettings: true,
    canAccessSettingsProfile: true,
    canAccessSettingsPermissions: true,
    canAccessPayments: true, // Added missing property
    canAccessPaymentsConfig: true, // Added missing property
    canViewAnalytics: true,
    canManageUsers: true,
    canApproveCompanies: true, // Added missing property
    canEditContent: true,
  },  admin: {
    canAccessDashboard: true,
    canAccessNFTs: true,
    canAccessNFTsAdd: true,
    canAccessNFTsDelete: true,
    canAccessNFTsDeleteAll: false,
    canAccessUsers: true,
    canAccessUsersAdms: true,
    canAccessUsersEmployersList: true,
    canAccessUsersEmployersCreate: false,
    canAccessUsersEmployersApprove: false, // Added missing property
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
    canAccessMarketingSocialMedia: false,    canAccessAccounting: false,
    canAccessTokenDistribution: false,
    canAccessSystemActivity: false,
    canAccessSettings: false,
    canAccessSettingsProfile: false,
    canAccessSettingsPermissions: false,
    canAccessPayments: false, // Added missing property
    canAccessPaymentsConfig: false, // Added missing property
    canViewAnalytics: true,
    canManageUsers: true,
    canApproveCompanies: false, // Added missing property
    canEditContent: true,
  },  support: {
    canAccessDashboard: true,
    canAccessNFTs: false,
    canAccessNFTsAdd: false,
    canAccessNFTsDelete: false,
    canAccessNFTsDeleteAll: false,
    canAccessUsers: true,
    canAccessUsersAdms: false,
    canAccessUsersEmployersList: true,
    canAccessUsersEmployersCreate: false,
    canAccessUsersEmployersApprove: false, // Added missing property
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
    canAccessMarketingSocialMedia: false,    canAccessAccounting: false,
    canAccessTokenDistribution: false,
    canAccessSystemActivity: false,
    canAccessSettings: false,
    canAccessSettingsProfile: false,
    canAccessSettingsPermissions: false,
    canAccessPayments: false, // Added missing property
    canAccessPaymentsConfig: false, // Added missing property
    canViewAnalytics: false,
    canManageUsers: false,
    canApproveCompanies: false, // Added missing property
    canEditContent: false,
  },
};

// GET: Fetch role permissions
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as AdminRole;

    if (!role || !['super_admin', 'admin', 'support'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Super Admin: always return full permissions, never from Firestore
    if (role === 'super_admin') {
      return NextResponse.json({
        success: true,
        role,
        permissions: defaultRolePermissions.super_admin
      });
    }

    try {
      // Try to get custom permissions from Firestore
      const rolePermissionsRef = doc(db, 'rolePermissions', role);
      const rolePermissionsDoc = await getDoc(rolePermissionsRef);

      let permissions: AdminPermissions;

      if (rolePermissionsDoc.exists()) {
        // Use custom permissions from database
        permissions = rolePermissionsDoc.data() as AdminPermissions;
        console.log(`Custom permissions found for role ${role}:`, permissions);
      } else {
        // Use default permissions
        permissions = defaultRolePermissions[role];
        console.log(`Using default permissions for role ${role}:`, permissions);
      }

      return NextResponse.json({
        success: true,
        role,
        permissions
      });

    } catch (error: any) {
      console.error('Error fetching role permissions:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch role permissions',
        details: error.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in GET role permissions:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// POST: Update role permissions (only for super_admin)
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const body = await request.json();
    const { role, permissions, adminRole } = body;

    // Validate input
    if (!role || !permissions || !adminRole) {
      return NextResponse.json({ 
        error: 'Role, permissions, and adminRole are required' 
      }, { status: 400 });
    }

    // Block any attempt to change super_admin permissions
    if (role === 'super_admin') {
      return NextResponse.json({ 
        error: 'Super Admin permissions cannot be changed.' 
      }, { status: 403 });
    }

    // Only super_admin can modify role permissions
    if (adminRole !== 'super_admin') {
      return NextResponse.json({ 
        error: 'Only Super Admins can modify role permissions' 
      }, { status: 403 });
    }

    // Validate role
    if (!['super_admin', 'admin', 'support'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Validate permissions structure
    const expectedPermissionKeys = Object.keys(defaultRolePermissions.super_admin);
    const providedPermissionKeys = Object.keys(permissions);

    if (!expectedPermissionKeys.every(key => providedPermissionKeys.includes(key))) {
      return NextResponse.json({ 
        error: 'Invalid permissions structure' 
      }, { status: 400 });
    }

    try {
      // Save permissions to Firestore
      const rolePermissionsRef = doc(db, 'rolePermissions', role);
      
      await setDoc(rolePermissionsRef, {
        ...permissions,
        updatedAt: new Date().toISOString(),
        updatedBy: 'super_admin' // In a real app, you'd get this from the session
      }, { merge: true });

      console.log(`Role permissions updated for ${role}:`, permissions);

      return NextResponse.json({
        success: true,
        message: `Permissions updated successfully for ${role} role`,
        role,
        permissions
      });

    } catch (error: any) {
      console.error('Error saving role permissions:', error);
      return NextResponse.json({ 
        error: 'Failed to save role permissions',
        details: error.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in POST role permissions:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
