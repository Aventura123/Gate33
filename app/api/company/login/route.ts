"use server";

import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { compare } from 'bcrypt';

// Endpoint de autenticação da empresa
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Query companies collection to find a company with the provided email
    const companiesCollection = collection(db, 'companies');
    const q = query(companiesCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get the first document (email should be unique)
    const companyDoc = querySnapshot.docs[0];
    const companyData = companyDoc.data();
    
    // Compare the password with the stored hash
    const passwordValid = await compare(password, companyData.passwordHash);
    
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Return success with company ID as token (simple approach)
    const token = Buffer.from(companyDoc.id).toString('base64');
    
    return NextResponse.json({
      success: true,
      token,
      company: {
        id: companyDoc.id,
        name: companyData.name,
        email: companyData.email,
      }
    });
  } catch (error) {
    console.error('Error during authentication:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
