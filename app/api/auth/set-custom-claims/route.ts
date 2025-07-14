import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '../../../../lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    await initAdmin();
    
    const { uid, customClaims } = await request.json();
    
    if (!uid || !customClaims) {
      return NextResponse.json(
        { error: 'Missing uid or customClaims' },
        { status: 400 }
      );
    }
    
    // Set custom claims for the user
    const auth = getAuth();
    await auth.setCustomUserClaims(uid, customClaims);
    
    return NextResponse.json(
      { message: 'Custom claims set successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return NextResponse.json(
      { error: 'Failed to set custom claims' },
      { status: 500 }
    );
  }
}
