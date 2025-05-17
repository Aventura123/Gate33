import { NextRequest, NextResponse } from "next/server";
import { storage, db, handleStorageError } from "../../../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/company/photo - Iniciando requisição");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const companyId = formData.get("companyId") as string | null;

    if (!file || !companyId) {
      console.log("POST /api/company/photo - Dados inválidos:", { hasFile: !!file, hasCompanyId: !!companyId });
      return NextResponse.json({ 
        error: "Invalid request", 
        message: "File and companyId are required",
        success: false
      }, { status: 400 });
    }

    console.log("POST /api/company/photo - Iniciando upload de foto para empresa:", companyId);
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
      const buffer = Buffer.from(arrayBuffer);      if (!storage) {
        console.error("POST /api/company/photo - Firebase Storage não inicializado");
        return NextResponse.json({
          error: "Storage not initialized",
          message: "Firebase Storage connection failed",
          success: false
        }, { status: 500 });
      }

      console.log("POST /api/company/photo - Referência ao Firebase Storage criada");
      const storageRef = ref(storage, filePath);
      
      console.log("POST /api/company/photo - Iniciando upload do buffer");
      const snapshot = await uploadBytes(storageRef, buffer);

      console.log("Upload concluído, obtendo URL de download...");
      const downloadURL = await getDownloadURL(snapshot.ref);      if (!db) {
        console.error("POST /api/company/photo - Firestore não inicializado");
        return NextResponse.json({
          error: "Database not initialized",
          message: "Firestore connection failed",
          success: false
        }, { status: 500 });
      }

      console.log("POST /api/company/photo - Referência ao Firestore criada");
      const companyRef = doc(db, "companies", companyId);
      const companyDoc = await getDoc(companyRef);

      if (companyDoc.exists()) {
        console.log("POST /api/company/photo - Atualizando documento da empresa no Firestore...");
        await updateDoc(companyRef, {
          photoURL: downloadURL,
          updatedAt: new Date().toISOString()
        });
      } else {
        console.log("POST /api/company/photo - Criando novo documento de empresa no Firestore...");
        await setDoc(companyRef, {
          companyId: companyId,
          photoURL: downloadURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      console.log("POST /api/company/photo - Operação concluída com sucesso, retornando URL:", downloadURL);
      return NextResponse.json({ 
        success: true, 
        url: downloadURL,
        photoURL: downloadURL
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
    console.log("GET /api/company/photo - Iniciando requisição");
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");

    console.log("GET /api/company/photo - CompanyId:", companyId);

    if (!companyId) {
      console.log("GET /api/company/photo - CompanyId não fornecido");
      return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 });
    }

    if (!db) {
      console.error("GET /api/company/photo - Firestore não inicializado");
      // Em vez de lançar erro, vamos retornar uma resposta JSON
      return NextResponse.json({ 
        error: "Firestore not initialized", 
        message: "Database connection failed" 
      }, { status: 500 });
    }

    // Buscar informações da empresa no Firestore
    console.log("GET /api/company/photo - Buscando dados da empresa:", companyId);
    const companyRef = doc(db, "companies", companyId);
    const companyDoc = await getDoc(companyRef);    if (companyDoc.exists()) {
      const companyData = companyDoc.data();
      console.log("GET /api/company/photo - Empresa encontrada, dados:", {
        name: companyData.name,
        hasPhoto: !!companyData.photoURL
      });
      
      return NextResponse.json({ 
        photoUrl: companyData.photoURL || null,
        photoURL: companyData.photoURL || null,
        success: true
      });
    } else {
      console.log("GET /api/company/photo - Empresa não encontrada");
      return NextResponse.json({ 
        photoUrl: null, 
        photoURL: null,
        success: true,
        message: "Company not found"
      });
    }
  } catch (error: any) {
    console.error("Erro ao buscar foto da empresa:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      { 
        error: "Erro ao buscar foto da empresa", 
        message: error.message,
        success: false
      },
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