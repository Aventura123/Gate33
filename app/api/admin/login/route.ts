import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { compare } from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Check if Firestore is initialized
    if (!db) {
      console.error('Firestore was not initialized correctly');
      return NextResponse.json({ error: 'Service unavailable. Please try again later.' }, { status: 503 });
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    console.log('Attempting to authenticate admin:', username);

    const adminsCollection = collection(db, 'admins');
    
    // Search by username
    const qUsername = query(adminsCollection, where("username", "==", username));
    let querySnapshot = await getDocs(qUsername);
    
    console.log('Query result:', querySnapshot.size, 'admin(s) found');
    
    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();

    // Check if we have the password hash
    if (!adminData.password) {
      console.error('Admin found but no password defined:', adminDoc.id);
      return NextResponse.json({ error: 'Invalid administrator account' }, { status: 401 });
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

    // Generate token (simple Firestore-only auth)
    const tokenData = {
      id: adminDoc.id,
      username: adminData.username,
      role: adminData.role || 'viewer',
      timestamp: Date.now()
    };
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    // Configure session cookie
    const cookieStore = await cookies();
    cookieStore.set('adminSession', token, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });

    // Return response with token and admin data
    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: adminDoc.id,
        name: adminData.name || '',
        username: adminData.username,
        email: adminData.email || '',
        role: adminData.role || 'viewer',
        photoURL: adminData.photoURL || adminData.photo || null
      }
    });
  } catch (error) {
    console.error('Error during authentication:', error);
    return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 500 });
  }
}
