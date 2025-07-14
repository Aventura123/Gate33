import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '../../../../lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    await initAdmin();
    
    const body = await request.json();
    console.log('Received body:', body);
    
    // Support both customClaims and claims for backward compatibility
    const { uid, customClaims, claims } = body;
    const finalClaims = customClaims || claims;
    
    if (!uid || !finalClaims) {
      console.error('Missing required fields:', { uid: !!uid, customClaims: !!customClaims, claims: !!claims });
      return NextResponse.json(
        { error: 'Missing uid or customClaims/claims' },
        { status: 400 }
      );
    }
    
    // Set custom claims for the user
    const auth = getAuth();
    console.log('Setting custom claims for uid:', uid, 'claims:', finalClaims);
    await auth.setCustomUserClaims(uid, finalClaims);
    
    console.log('Custom claims set successfully for uid:', uid);
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
