import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Verificar se já existe algum administrador
    const adminsCollection = collection(db, 'admins');
    const adminsSnapshot = await getDocs(adminsCollection);

    if (!adminsSnapshot.empty) {
      // Já existem administradores, não precisamos criar um padrão
      return NextResponse.json({
        message: "Já existem administradores no sistema",
        count: adminsSnapshot.size
      });
    }

    // Se não existir nenhum administrador, criar um padrão
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    const defaultAdmin = {
      name: "Administrador",
      username: "admin",
      email: "admin@gate33.com",
      password: hashedPassword,
      role: "admin",
      photoURL: "/images/logo2.png",
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(adminsCollection, defaultAdmin);

    return NextResponse.json({
      message: "Administrador padrão criado com sucesso",
      adminId: docRef.id,
      credentials: {
        username: defaultAdmin.username,
        password: "admin123" // Mostrando apenas para fins de setup inicial
      }
    });
  } catch (error) {
    console.error("Erro ao inicializar administrador:", error);
    return NextResponse.json({
      error: `Erro ao inicializar administrador: ${error.message}`
    }, { status: 500 });
  }
}