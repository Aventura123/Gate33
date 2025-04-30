// app/api/admin/login/route.ts

"use server";

import { NextResponse } from 'next/server';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { compare } from 'bcrypt';

// Função de login do administrador
export async function loginAdmin(email: string, password: string) {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Erro ao fazer login');
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('admin', JSON.stringify(data.admin));

    return data.admin;
  } catch (error) {
    console.error('Erro ao fazer login do admin:', error);
    throw error;
  }
}