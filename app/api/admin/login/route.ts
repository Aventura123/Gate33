import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { compare } from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {    // Check if Firestore is initialized
    if (!db) {
      console.error('Firestore was not initialized correctly');
      return NextResponse.json({ error: 'Service unavailable. Please try again later.' }, { status: 503 });
    }

    const body = await request.json();    const { email, password } = body;
    const username = email; // Allow login using username in the 'email' field

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }    console.log('Attempting to authenticate user:', username);

    const adminsCollection = collection(db, 'admins');
    
    // Try to search by username or email
    const qUsername = query(adminsCollection, where("username", "==", username));
    let querySnapshot = await getDocs(qUsername);
    
    // If not found by username, try by email
    if (querySnapshot.empty) {
      console.log('Not found by username, trying by email');
      const qEmail = query(adminsCollection, where("email", "==", username));
      querySnapshot = await getDocs(qEmail);
    }    console.log('Query result:', querySnapshot.size, 'documents found');
    
    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();

    // Check if we have the password hash
    if (!adminData.password) {
      console.error('Admin found but no password defined:', adminDoc.id);
      return NextResponse.json({ error: 'Invalid administrator account' }, { status: 401 });
    }    // Use bcrypt to compare the entered password with the saved hash
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
    }    // Generate token
    const tokenData = {
      id: adminDoc.id,
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
        photoURL: adminData.photoURL || adminData.photo || null
      }
    });
  } catch (error) {
    console.error('Error during authentication:', error);
    return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 500 });
  }
}
