import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// GET: Buscar todos os candidatos a emprego ou um candidato específico por ID
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (id) {
      // Buscar um candidato específico
      if (!db) {
        return NextResponse.json(
          { error: "Database connection is not initialized" },
          { status: 500 }
        );
      }
      const seekerRef = doc(db, "seekers", id);
      const seekerSnapshot = await getDoc(seekerRef);
      
      if (!seekerSnapshot.exists()) {
        return NextResponse.json(
          { error: "Candidato não encontrado" },
          { status: 404 }
        );
      }
      
      const seekerData = seekerSnapshot.data() as { password?: string; [key: string]: any };
      const seeker = {
        id: seekerSnapshot.id,
        ...seekerData
      };
      
      // Remover dados sensíveis
      delete seeker.password;
      
      return NextResponse.json(seeker);
    } else {
      // Buscar todos os candidatos
      if (!db) {
        return NextResponse.json(
          { error: "Database connection is not initialized" },
          { status: 500 }
        );
      }
      const seekersCollection = collection(db, "seekers");
      const seekersSnapshot = await getDocs(seekersCollection);
      
      const seekers = seekersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Remover dados sensíveis
        delete data.password;
        
        return {
          id: doc.id,
          ...data
        };
      });
      
      return NextResponse.json(seekers);
    }
  } catch (error: any) {
    console.error("Erro ao buscar candidatos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar candidatos", message: error.message },
      { status: 500 }
    );
  }
}

// POST: Criar um novo candidato a emprego
export async function POST(req: NextRequest) {
  try {
    const { 
      name, 
      username, 
      password, 
      email, 
      skills = [], 
      experience = [], 
      education = [],
      resumeUrl = null
    } = await req.json();
    
    // Validação básica
    if (!name || !username || !password || !email) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }
    
    // Verificar se username já existe
    const usernameQuery = query(
      collection(db!, "seekers"),
      where("username", "==", username)
    );
    
    const usernameSnapshot = await getDocs(usernameQuery);
    
    if (!usernameSnapshot.empty) {
      return NextResponse.json(
        { error: "Username já está em uso" },
        { status: 400 }
      );
    }
    
    // Verificar se email já existe
    const emailQuery = query(
      collection(db, "seekers"),
      where("email", "==", email)
    );
    
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      return NextResponse.json(
        { error: "Email já está em uso" },
        { status: 400 }
      );
    }
    
    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Gerar ID único
    const seekerId = uuidv4();
    
    // Criar documento no Firestore
    const seekerRef = doc(db, "seekers", seekerId);
    
    await setDoc(seekerRef, {
      id: seekerId,
      name,
      username,
      email,
      skills,
      experience,
      education,
      resumeUrl,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Candidato criado com sucesso",
        seeker: {
          id: seekerId,
          name,
          username,
          email,
          skills,
          experience,
          education,
          resumeUrl
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao criar candidato:", error);
    return NextResponse.json(
      { error: "Erro ao criar candidato", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remover um candidato a emprego
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "ID do candidato é obrigatório" },
        { status: 400 }
      );
    }
    
    const seekerRef = doc(db, "seekers", id);
    await deleteDoc(seekerRef);
    
    return NextResponse.json(
      { success: true, message: "Candidato removido com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao remover candidato:", error);
    return NextResponse.json(
      { error: "Erro ao remover candidato", message: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Atualizar o status de bloqueio de um candidato
export async function PATCH(req: NextRequest) {
  try {
    const { id, blocked } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID do candidato é obrigatório" },
        { status: 400 }
      );
    }

    if (blocked === undefined) {
      return NextResponse.json(
        { error: "Campo 'blocked' é obrigatório" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database connection is not initialized" },
        { status: 500 }
      );
    }

    const seekerRef = doc(db, "seekers", id);
    const seekerSnapshot = await getDoc(seekerRef);

    if (!seekerSnapshot.exists()) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    await updateDoc(seekerRef, { blocked });

    return NextResponse.json(
      { 
        success: true, 
        message: `Candidato ${blocked ? 'bloqueado' : 'desbloqueado'} com sucesso`,
        blocked
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao atualizar candidato:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar candidato", message: error.message },
      { status: 500 }
    );
  }
}