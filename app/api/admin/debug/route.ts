import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, doc, getDoc, Firestore } from 'firebase/firestore';

export async function GET(req: Request) {
  try {
    // Tenta obter o documento específico da coleção "admin"
    console.log("Verificando documento específico na coleção 'admin'");
    if (!db) {
      throw new Error("Firestore instance is not initialized.");
    }
    const adminDocRef = doc(db as Firestore, 'admin', 'bd8HjeKL12vDlhzOEQQg');
    const adminDocSnapshot = await getDoc(adminDocRef);
    
    let results = [];
    
    if (adminDocSnapshot.exists()) {
      const adminData = adminDocSnapshot.data();
      console.log("Documento encontrado na coleção 'admin':", adminData);
      results.push({
        collection: 'admin',
        id: 'bd8HjeKL12vDlhzOEQQg',
        data: adminData
      });
    } else {
      console.log("Documento não encontrado na coleção 'admin'");
    }
    
    // Tenta listar todos os documentos na coleção "admins" (plural)
    console.log("Listando documentos na coleção 'admins'");
    try {
      const adminsCollection = collection(db, 'admins');
      const adminsSnapshot = await getDocs(adminsCollection);
      
      if (!adminsSnapshot.empty) {
        adminsSnapshot.forEach(doc => {
          console.log("Documento encontrado na coleção 'admins':", doc.id, doc.data());
          results.push({
            collection: 'admins',
            id: doc.id,
            data: doc.data()
          });
        });
      } else {
        console.log("Nenhum documento encontrado na coleção 'admins'");
      }
    } catch (error) {
      console.error("Erro ao listar documentos da coleção 'admins':", error);
    }
    
    return NextResponse.json({ 
      success: true, 
      results 
    });
  } catch (error) {
    console.error("Erro ao verificar dados do Firestore:", error);
    return NextResponse.json({ 
      success: false, 
      error: `Erro ao verificar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
    }, { status: 500 });
  }
}