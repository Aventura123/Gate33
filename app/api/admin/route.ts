import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, DocumentData } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// Interface para tipar os dados do administrador
interface AdminData extends DocumentData {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

// GET: Buscar todos os administradores
export async function GET(req: NextRequest) {
  try {
    if (!db) {
      console.error("Firestore is not initialized.");
      return NextResponse.json(
        { error: "Database connection is not initialized" },
        { status: 500 }
      );
    }

    const adminsCollection = collection(db, "admins");
    const adminsSnapshot = await getDocs(adminsCollection);
    
    const admins = adminsSnapshot.docs.map(doc => {
      const data = doc.data() as Omit<AdminData, 'id'>;
      // Remover dados sensíveis
      delete data.password;
      
      return {
        id: doc.id,
        ...data
      };
    });
    
    return NextResponse.json(admins);
  } catch (error: any) {
    console.error("Erro ao buscar administradores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar administradores", message: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new administrator
export async function POST(req: NextRequest) {
  try {
    if (!db) {
      console.error("Firestore is not initialized.");
      return NextResponse.json(
        { error: "Database connection is not initialized" },
        { status: 500 }
      );
    }

    const { name, username, password, email, role } = await req.json();
    
    // Basic validation
    if (!name || !username || !password || !email || !role) {
      return NextResponse.json(
        { error: "Incomplete data" },
        { status: 400 }
      );
    }
    
    // Check if username already exists
    const usernameQuery = query(
      collection(db, "admins"),
      where("username", "==", username)
    );
    
    const usernameSnapshot = await getDocs(usernameQuery);
    
    if (!usernameSnapshot.empty) {
      return NextResponse.json(
        { error: "Username is already in use" },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const emailQuery = query(
      collection(db, "admins"),
      where("email", "==", email)
    );
    
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate unique ID
    const adminId = uuidv4();
    
    // Create document in Firestore
    const adminRef = doc(db, "admins", adminId);
    
    await setDoc(adminRef, {
      id: adminId,
      name,
      username,
      email,
      role,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Administrator created successfully",
        admin: {
          id: adminId,
          name,
          username,
          email,
          role
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating administrator:", error);
    return NextResponse.json(
      { error: "Error creating administrator", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remover um administrador
export async function DELETE(req: NextRequest) {
  try {
    if (!db) {
      console.error("Firestore is not initialized.");
      return NextResponse.json(
        { error: "Database connection is not initialized" },
        { status: 500 }
      );
    }

    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "ID do administrador é obrigatório" },
        { status: 400 }
      );
    }
    
    const adminRef = doc(db, "admins", id);
    await deleteDoc(adminRef);
    
    return NextResponse.json(
      { success: true, message: "Administrador removido com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao remover administrador:", error);
    return NextResponse.json(
      { error: "Erro ao remover administrador", message: error.message },
      { status: 500 }
    );
  }
}
