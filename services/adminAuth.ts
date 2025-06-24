// app/api/admin/login/route.ts

"use server";

import { NextResponse } from 'next/server';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { compare } from 'bcrypt';
 import { cookies } from 'next/headers';

// Administrator login function
export async function loginAdmin(email: string, password: string) {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });    if (!response.ok) {
      throw new Error('Login error');
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('admin', JSON.stringify(data.admin));

    return data.admin;  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
}

/**
 * Verifies if the current user is an administrator
 * @param request Request object to extract authentication cookie
 * @returns true if user is administrator, false otherwise
 */
export async function isUserAdmin(request: Request): Promise<boolean> {
  try {
    // Extrair token do cookie ou header Authorization
    let token: string | null = null;
      // Try to extract from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
      // If not found in header, try to extract from cookie
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const tokenCookie = cookies.find(c => c.startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }
    }    if (!token) {
      console.log('Token not found');
      return false;
    }    // Decode the token (simple implementation - use JWT in production)
    try {
      // For this example, we'll assume any valid token represents an admin
      // In a real scenario, you would perform proper token verification
      
      // Optional verification: query database to confirm user is admin
      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("token", "==", token));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return false;
      }
        // Verify if user has admin permission
      const adminDoc = snapshot.docs[0];
      const role = adminDoc.data().role;
      
      return ['admin', 'super_admin'].includes(role);    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  } catch (error) {
    console.error('Error verifying if user is admin:', error);
    return false;
  }
}