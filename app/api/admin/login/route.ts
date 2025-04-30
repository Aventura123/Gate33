import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { compare } from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Verificar se o Firestore está inicializado
    if (!db) {
      console.error('Firestore não foi inicializado corretamente');
      return NextResponse.json({ error: 'Serviço indisponível. Tente novamente mais tarde.' }, { status: 503 });
    }

    const body = await request.json();
    const { email, password } = body;
    const username = email; // Permitir login usando username no campo 'email'

    if (!username || !password) {
      return NextResponse.json({ error: 'Username e senha são obrigatórios' }, { status: 400 });
    }

    console.log('Tentando autenticar usuário:', username);

    const adminsCollection = collection(db, 'admins');
    
    // Tente buscar por username ou email
    const qUsername = query(adminsCollection, where("username", "==", username));
    let querySnapshot = await getDocs(qUsername);
    
    // Se não encontrou por username, tente pelo email
    if (querySnapshot.empty) {
      console.log('Não encontrado por username, tentando por email');
      const qEmail = query(adminsCollection, where("email", "==", username));
      querySnapshot = await getDocs(qEmail);
    }

    console.log('Resultado da consulta:', querySnapshot.size, 'documentos encontrados');
    
    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();

    // Verificar se temos o hash da senha
    if (!adminData.password) {
      console.error('Admin encontrado mas sem senha definida:', adminDoc.id);
      return NextResponse.json({ error: 'Conta de administrador inválida' }, { status: 401 });
    }

    // Use bcrypt para comparar a senha digitada com o hash salvo
    let passwordValid = false;
    try {
      passwordValid = await compare(password, adminData.password);
    } catch (compareError) {
      console.error('Erro ao comparar senhas:', compareError);
      return NextResponse.json({ error: 'Erro na validação da senha' }, { status: 500 });
    }
    
    console.log('Validação de senha:', passwordValid ? 'Sucesso' : 'Falha');

    if (!passwordValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Gerar token
    const tokenData = {
      id: adminDoc.id,
      role: adminData.role || 'viewer',
      timestamp: Date.now()
    };
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    // Configurar cookie de sessão
    const cookieStore = await cookies();
    cookieStore.set('adminSession', token, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/'
    });

    // Retornar resposta com token e dados do admin
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
    console.error('Erro durante autenticação:', error);
    return NextResponse.json({ error: 'Falha na autenticação. Tente novamente.' }, { status: 500 });
  }
}
