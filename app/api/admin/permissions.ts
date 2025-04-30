import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function PUT(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    // Get request data
    const { adminId, role } = await request.json();

    if (!adminId || !role) {
      return NextResponse.json({ error: 'Admin ID and role are required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['superadmin', 'admin', 'moderator', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    try {
      // Get the admin document by ID
      if (!db) {
        throw new Error('Database instance is not initialized');
      }
      const adminRef = doc(db, 'admins', adminId);
      const adminSnapshot = await getDoc(adminRef);
      
      if (!adminSnapshot.exists()) {
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
      }
      
      // Update the admin's role
      await updateDoc(adminRef, { role });
      
      return NextResponse.json({
        success: true,
        message: 'Admin role updated successfully',
      });
    } catch (firestoreError: any) {
      console.error('Firestore error:', firestoreError);
      return NextResponse.json({ 
        error: firestoreError.message || 'Firestore operation failed' 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error updating admin role:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
