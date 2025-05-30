import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// GET: Buscar um administrador específico pelo ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!db) {
      console.error("Firestore is not initialized.");
      return NextResponse.json(
        { error: "Database connection is not initialized" },
        { status: 500 }
      );
    }

    const adminId = params.id;
    
    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 }
      );
    }
    
    const adminRef = doc(db, "admins", adminId);
    const adminSnap = await getDoc(adminRef);
    
    if (!adminSnap.exists()) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }
    
    // Obtém os dados do administrador
    const adminData = adminSnap.data();

    // Cria um objeto de resposta incluindo apenas o hash da senha
    // para verificação de segurança
    const response = {
      id: adminSnap.id,
      password: adminData.password
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error fetching admin:", error);
    return NextResponse.json(
      { error: "Error fetching admin", message: error.message },
      { status: 500 }
    );
  }
}
