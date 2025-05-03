// app/api/admin/login/route.ts

"use server";

import { NextResponse } from 'next/server';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { compare } from 'bcrypt';
import { cookies } from 'next/headers';

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

/**
 * Verifica se o usuário atual é um administrador
 * @param request Objeto Request para extrair o cookie de autenticação
 * @returns true se o usuário for administrador, false caso contrário
 */
export async function isUserAdmin(request: Request): Promise<boolean> {
  try {
    // Extrair token do cookie ou header Authorization
    let token: string | null = null;
    
    // Tentar extrair do header Authorization
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Se não encontrou no header, tentar extrair do cookie
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const tokenCookie = cookies.find(c => c.startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }
    }

    if (!token) {
      console.log('Token não encontrado');
      return false;
    }

    // Decodificar o token (implementação simples - em produção usar JWT)
    try {
      // Para este exemplo, vamos assumir que qualquer token válido representa um admin
      // Em um cenário real, você faria a verificação adequada do token
      
      // Verificação opcional: consultar o banco de dados para confirmar que o usuário é admin
      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("token", "==", token));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return false;
      }
      
      // Verificar se o usuário tem permissão de admin
      const adminDoc = snapshot.docs[0];
      const role = adminDoc.data().role;
      
      return ['admin', 'super_admin'].includes(role);
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  } catch (error) {
    console.error('Erro ao verificar se usuário é admin:', error);
    return false;
  }
}