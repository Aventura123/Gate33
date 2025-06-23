"use server";

import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Company authentication endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // First check if this email belongs to a seeker account
    const seekersCollection = collection(db, 'seekers');
    const seekerQuery = query(seekersCollection, where('email', '==', email));
    const seekerSnapshot = await getDocs(seekerQuery);

    if (!seekerSnapshot.empty) {
      return NextResponse.json({ 
        error: 'This email belongs to a job seeker account. Please login as a job seeker.' 
      }, { status: 401 });
    }

    // Query companies collection to find a company with the provided email
    const companiesCollection = collection(db, 'companies');
    const q = query(companiesCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Company account not found. Please register as a company.' }, { status: 401 });
    }

    // Get the first document (email should be unique)
    const companyDoc = querySnapshot.docs[0];
    const companyData = companyDoc.data();
    
    // Check if company is approved
    if (!companyData.approved && companyData.status !== 'approved') {
      return NextResponse.json({ 
        error: 'Company account is pending approval by administrator.' 
      }, { status: 401 });
    }
    
    // Use Firebase Auth to authenticate
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get the Firebase ID token
      const idToken = await user.getIdToken();
      
      return NextResponse.json({
        success: true,
        token: idToken,
        company: {
          id: companyDoc.id,
          name: companyData.name,
          email: companyData.email,
          firebaseUid: user.uid
        }
      });
    } catch (authError: any) {
      console.error('Firebase authentication error:', authError);
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
