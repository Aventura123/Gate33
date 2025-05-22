import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

// PATCH: Atualizar um candidato (seeker)
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
