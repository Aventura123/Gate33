import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { compare } from 'bcryptjs';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '../../../../lib/firebaseAdmin';

export async function POST(request: Request) {
  try {    // Check if Firestore is initialized
    if (!db) {
      console.error('Firestore was not initialized correctly');
      return NextResponse.json({ error: 'Service unavailable. Please try again later.' }, { status: 503 });
    }

    // Initialize Firebase Admin only when needed
    initAdmin();

    const body = await request.json();    const { email, password } = body;
    const usernameOrEmail = email; // Can be username or email

    if (!usernameOrEmail || !password) {
      return NextResponse.json({ error: 'Username/Email and password are required' }, { status: 400 });
    }    console.log('Attempting to authenticate admin:', usernameOrEmail);

    const adminsCollection = collection(db, 'admins');
    
    // Try to search by username first (preferred for admin login)
    const qUsername = query(adminsCollection, where("username", "==", usernameOrEmail));
    let querySnapshot = await getDocs(qUsername);
    
    // If not found by username, try by email
    if (querySnapshot.empty) {
      console.log('Admin not found by username, trying by email');
      const qEmail = query(adminsCollection, where("email", "==", usernameOrEmail));
      querySnapshot = await getDocs(qEmail);
    }    console.log('Query result:', querySnapshot.size, 'admin(s) found');
    
    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();

    // Check if we have the password hash
    if (!adminData.password) {
      console.error('Admin found but no password defined:', adminDoc.id);
      return NextResponse.json({ error: 'Invalid administrator account' }, { status: 401 });
    }

    // Verify admin email is available for Firebase Auth
    const adminEmail = adminData.email;
    if (!adminEmail || !adminEmail.includes('@')) {
      console.error('Admin found but no valid email for Firebase Auth:', adminDoc.id);
      return NextResponse.json({ error: 'Admin account configuration error' }, { status: 500 });
    }

    // Use bcrypt to compare the entered password with the saved hash
    let passwordValid = false;
    try {
      passwordValid = await compare(password, adminData.password);
    } catch (compareError) {
      console.error('Error comparing passwords:', compareError);
      return NextResponse.json({ error: 'Password validation error' }, { status: 500 });
    }
    
    console.log('Password validation:', passwordValid ? 'Success' : 'Failed');

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // MANDATORY Firebase Auth integration for admins
    let firebaseUid = null;
    
    try {
      const auth = getAuth();
      
      try {
        // Check if admin already has Firebase Auth account
        const userRecord = await auth.getUserByEmail(adminEmail);
        firebaseUid = userRecord.uid;
        console.log('Admin already has Firebase Auth account:', firebaseUid);
      } catch (error) {
        // Create new Firebase Auth account for admin
        const newUser = await auth.createUser({
          email: adminEmail,
          displayName: adminData.name || adminData.username,
          password: Date.now().toString() // Temporary random password
        });
        
        firebaseUid = newUser.uid;
        console.log('Created new Firebase Auth account for admin:', firebaseUid);
      }
      
      // Set custom claims for admin (MANDATORY)
      await auth.setCustomUserClaims(firebaseUid, {
        role: 'admin',
        adminId: adminDoc.id
      });
      
      console.log('Custom claims set for admin in Firebase Auth');
    } catch (authError) {
      console.error('CRITICAL: Failed to sync admin with Firebase Auth:', authError);
      return NextResponse.json({ 
        error: 'Authentication system error. Please contact support.' 
      }, { status: 500 });
    }

    // Generate token
    const tokenData = {
      id: adminDoc.id,
      role: adminData.role || 'viewer',
      timestamp: Date.now(),
      firebaseUid: firebaseUid // Adiciona o UID do Firebase se disponível
    };
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    // Configure session cookie
    const cookieStore = await cookies();
    cookieStore.set('adminSession', token, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });    // Return response with token and admin data
    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: adminDoc.id,
        name: adminData.name || '',
        username: adminData.username,
        email: adminData.email,
        role: adminData.role || 'viewer',
        photoURL: adminData.photoURL || adminData.photo || null,
        firebaseUid: firebaseUid
      }
    });
  } catch (error) {
    console.error('Error during authentication:', error);
    return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 500 });
  }
}
