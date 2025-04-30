import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { doc, getDoc, collection, getDocs, query, limit, updateDoc, setDoc } from "firebase/firestore";

// GET: Buscar foto de perfil de um usuário com ou sem ID
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    console.log("API userProfile GET - userId recebido:", userId);

    // Se não tiver userId, buscar o primeiro admin disponível
    if (!userId) {
      console.log("Nenhum userId fornecido, buscando o primeiro admin disponível");
      
      if (!db) {
        throw new Error("Firestore não está inicializado");
      }
      
      // Buscar o primeiro admin disponível
      try {
        const adminsCollection = collection(db, "admins");
        const adminsQuery = query(adminsCollection, limit(1));
        const adminsSnapshot = await getDocs(adminsQuery);
        
        if (adminsSnapshot.empty) {
          console.log("Nenhum admin encontrado no banco de dados");
          return NextResponse.json({ 
            error: "Nenhum administrador encontrado" 
          }, { status: 404 });
        }
        
        // Pegar o primeiro admin
        const firstAdmin = adminsSnapshot.docs[0];
        const adminId = firstAdmin.id;
        const adminData = firstAdmin.data();
        
        console.log("Admin encontrado:", adminId);
        
        return NextResponse.json({ 
          userId: adminId,
          photoUrl: adminData.photoURL || null,
          userData: adminData
        });
      } catch (error) {
        console.error("Erro ao buscar admin:", error);
        return NextResponse.json({ 
          error: "Erro ao buscar administrador" 
        }, { status: 500 });
      }
    }

    // Caso tenha userId, buscar nas coleções normalmente
    console.log("Buscando foto para userId:", userId);

    if (!db) {
      throw new Error("Firestore não está inicializado");
    }

    // Verificar todas as coleções que podem conter o usuário
    const collections = ["admins", "employers", "seekers", "users"];
    
    for (const collection of collections) {
      const userRef = doc(db, collection, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.photoURL) {
          console.log(`Foto encontrada na coleção '${collection}':`, userData.photoURL);
          return NextResponse.json({ 
            photoUrl: userData.photoURL,
            collection: collection,
            userData: userData
          });
        }
      }
    }
    
    // Se não encontrou em nenhuma coleção
    console.log("Nenhuma foto encontrada para o usuário", userId);
    return NextResponse.json({ photoUrl: null });
  } catch (error: any) {
    console.error("Erro ao buscar foto do usuário:", error);
    return NextResponse.json(
      { error: "Erro ao buscar foto do usuário", message: error.message },
      { status: 500 }
    );
  }
}

// POST: Atualizar foto de perfil de um usuário
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, photoUrl, collection = "admins" } = body;

    if (!userId || !photoUrl) {
      return NextResponse.json({ 
        error: "Parâmetros inválidos", 
        message: "userId e photoUrl são obrigatórios" 
      }, { status: 400 });
    }

    console.log("Atualizando foto para usuário:", userId, "na coleção:", collection);

    if (!db) {
      throw new Error("Firestore não está inicializado");
    }

    // Referência ao documento do usuário na coleção especificada
    const userRef = doc(db, collection, userId);
    
    // Verificar se o documento existe
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Atualizar o documento existente
      await updateDoc(userRef, {
        photoURL: photoUrl,
        updatedAt: new Date().toISOString()
      });
      
      console.log("Foto do usuário atualizada com sucesso");
      return NextResponse.json({ 
        success: true,
        message: "Foto atualizada com sucesso"
      });
    } else {
      // Criar um novo documento
      await setDoc(userRef, {
        photoURL: photoUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log("Novo documento de usuário criado com a foto");
      return NextResponse.json({ 
        success: true,
        message: "Novo perfil criado com a foto"
      });
    }
  } catch (error: any) {
    console.error("Erro ao atualizar foto do usuário:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar foto do usuário", message: error.message },
      { status: 500 }
    );
  }
}