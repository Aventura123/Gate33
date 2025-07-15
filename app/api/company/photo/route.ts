import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "../../../../lib/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/company/photo - Iniciando requisição");
    
    // Initialize Firebase Admin
    await initAdmin();
    const storage = getStorage();
    const db = getFirestore();
    
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
      const buffer = Buffer.from(arrayBuffer);

      console.log("POST /api/company/photo - Upload usando Firebase Admin SDK");
      
      // Upload using Firebase Admin SDK with bucket name
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) {
        throw new Error("Firebase Storage bucket not configured");
      }
      
      const bucket = storage.bucket(bucketName);
      
      console.log("POST /api/company/photo - Verificando documento no Firestore");
      const companyRef = db.collection("companies").doc(companyId);
      const companyDoc = await companyRef.get();

      // FAZER UPLOAD DA NOVA FOTO
      console.log(`POST /api/company/photo - Fazendo upload da nova foto: ${filePath}`);
      const fileRef = bucket.file(filePath);

      // Agora fazer o upload da nova foto
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
        },
      });

      // Make the file publicly readable
      await fileRef.makePublic();
      
      console.log("Upload concluído, gerando URL de download...");
      // Get signed URL that works with Firebase Storage rules
      const [downloadURL] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // Far future date for public access
      });

      // Atualizar ou criar documento no Firestore
      if (companyDoc.exists) {
        console.log("POST /api/company/photo - Atualizando documento da empresa no Firestore...");
        await companyRef.update({
          photoURL: downloadURL,
          updatedAt: new Date().toISOString()
        });
      } else {
        console.log("POST /api/company/photo - Criando novo documento de empresa no Firestore...");
        await companyRef.set({
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

    // Initialize Firebase Admin
    await initAdmin();
    const db = getFirestore();

    // Buscar informações da empresa no Firestore
    console.log("GET /api/company/photo - Buscando dados da empresa:", companyId);
    const companyRef = db.collection("companies").doc(companyId);
    const companyDoc = await companyRef.get();

    if (companyDoc.exists) {
      const companyData = companyDoc.data();
      console.log("GET /api/company/photo - Empresa encontrada, dados:", {
        name: companyData?.name,
        hasPhoto: !!companyData?.photoURL
      });
      
      return NextResponse.json({ 
        photoUrl: companyData?.photoURL || null,
        photoURL: companyData?.photoURL || null,
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