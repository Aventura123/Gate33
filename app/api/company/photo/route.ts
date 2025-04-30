import { NextRequest, NextResponse } from "next/server";
import { storage, db, handleStorageError } from "../../../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const companyId = formData.get("companyId") as string | null;

    if (!file || !companyId) {
      return NextResponse.json({ 
        error: "Invalid request", 
        message: "File and companyId are required" 
      }, { status: 400 });
    }

    console.log("Iniciando upload de foto para empresa:", companyId);
    console.log("Tipo de arquivo:", file.type);
    console.log("Tamanho do arquivo:", file.size, "bytes");

    // Verificar tamanho do arquivo (limitar a 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: "File too large", 
        message: "File size must be less than 5MB" 
      }, { status: 400 });
    }

    // Verificar tipo de arquivo (apenas imagens)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ 
        error: "Invalid file type", 
        message: "Only image files are allowed" 
      }, { status: 400 });
    }

    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `company_${companyId}_${Date.now()}.${fileExtension}`;
      const filePath = `company-photos/${companyId}/${fileName}`;

      console.log("Gerando referência para Firebase Storage:", filePath);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (!storage) {
        throw new Error("Firebase Storage is not initialized. Please check your Firebase configuration.");
      }

      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, buffer);

      console.log("Upload concluído, obtendo URL de download...");
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (!db) {
        throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
      }

      const companyRef = doc(db, "companies", companyId);
      const companyDoc = await getDoc(companyRef);

      if (companyDoc.exists()) {
        console.log("Atualizando documento da empresa no Firestore...");
        await updateDoc(companyRef, {
          photoURL: downloadURL,
          updatedAt: new Date().toISOString()
        });
      } else {
        console.log("Criando novo documento de empresa no Firestore...");
        await setDoc(companyRef, {
          companyId: companyId,
          photoURL: downloadURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      return NextResponse.json({ 
        success: true, 
        url: downloadURL 
      }, { status: 200 });
    } catch (storageError: any) {
      console.error("Erro durante o upload para Firebase Storage:", storageError);
      return NextResponse.json({
        error: "Storage error",
        message: storageError.message || "Error during file upload",
        code: storageError.code || "unknown",
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Upload failed:", error);
    return NextResponse.json({
      error: "Upload failed",
      message: error.message || "An unknown error occurred during file upload"
    }, { status: 500 });
  }
}

// GET: Buscar foto de perfil de uma empresa específica
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 });
    }

    if (!db) {
      throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
    }

    // Buscar informações da empresa no Firestore
    const companyRef = doc(db, "companies", companyId);
    const companyDoc = await getDoc(companyRef);

    if (companyDoc.exists()) {
      const companyData = companyDoc.data();
      return NextResponse.json({ 
        photoUrl: companyData.photoURL || null,
        companyData: companyData
      });
    } else {
      return NextResponse.json({ photoUrl: null });
    }
  } catch (error: any) {
    console.error("Erro ao buscar foto da empresa:", error);
    return NextResponse.json(
      { error: "Erro ao buscar foto da empresa", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remover a foto de perfil de uma empresa
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 });
    }

    if (!db) {
      throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
    }

    const companyRef = doc(db, "companies", companyId);
    const companyDoc = await getDoc(companyRef);

    if (companyDoc.exists() && companyDoc.data().photoURL) {
      const existingPhotoURL = companyDoc.data().photoURL;
      
      // Atualizar o documento para remover a referência à foto
      await updateDoc(companyRef, {
        photoURL: null,
        updatedAt: new Date().toISOString()
      });
      
      // Tentar excluir a foto do sistema de arquivos local
      try {
        // Extrair o nome do arquivo da URL
        const fileName = existingPhotoURL.split('/').pop();
        if (fileName) {
          const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
          
          // Verificar se o arquivo existe antes de tentar excluí-lo
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Arquivo excluído com sucesso:", filePath);
          } else {
            console.log("Arquivo não encontrado para exclusão:", filePath);
          }
        }
      } catch (deleteError) {
        console.error("Erro ao excluir foto da empresa:", deleteError);
        // Não interrompe o fluxo se a exclusão falhar
      }
    }

    return NextResponse.json(
      { success: true, message: "Foto de perfil da empresa removida com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao remover foto da empresa:", error);
    return NextResponse.json(
      { error: "Erro ao remover foto da empresa", message: error.message },
      { status: 500 }
    );
  }
}