// ⚠️ DEPRECATED SCRIPT - DO NOT USE ⚠️
//
// This script is DEPRECATED as of [current date] because:
//
// 1. The application now uses a role-based permissions system
// 2. Individual permissions on admin records are no longer used
// 3. André Ventura has hardcoded super_admin access in useAdminPermissions hook
// 4. Setting role: 'super_admin' is sufficient for full permissions
//
// NEW APPROACH:
// - To grant admin access: Set role field to 'super_admin', 'admin', or 'support'
// - André Ventura automatically gets super_admin access via hardcoded logic
// - Use AdminPermissionsManager component to modify role-based permissions
//
// This file is kept for historical reference only.
// Original script moved to: update-admin-permissions.js.backup

// If you need to manually update an admin role, use this instead:
/*
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

// Firebase config here...

async function updateAdminRole(username, newRole) {
  // Search for admin and update only the role field
  // The permissions will be automatically handled by the role-based system
}
*/
