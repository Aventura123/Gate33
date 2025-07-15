import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "../../../../lib/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/seeker/photo - Iniciando requisição");
    
    // Initialize Firebase Admin
    await initAdmin();
    const storage = getStorage();
    const db = getFirestore();
    
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const seekerId = formData.get("seekerId") as string | null;

    if (!file || !seekerId) {
      console.log("POST /api/seeker/photo - Dados inválidos:", { hasFile: !!file, hasSeekerId: !!seekerId });
      return NextResponse.json({ 
        error: "Invalid request", 
        message: "File and seekerId are required",
        success: false
      }, { status: 400 });
    }

    console.log("POST /api/seeker/photo - Iniciando upload de foto para seeker:", seekerId);
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
      const fileName = `seeker_${seekerId}_${Date.now()}.${fileExtension}`;
      const filePath = `seekers/${seekerId}/${fileName}`;

      console.log("Gerando referência para Firebase Storage:", filePath);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log("POST /api/seeker/photo - Upload usando Firebase Admin SDK");
      
      // Upload using Firebase Admin SDK with bucket name
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) {
        throw new Error("Firebase Storage bucket not configured");
      }
      
      const bucket = storage.bucket(bucketName);
      const fileRef = bucket.file(filePath);
      
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

      console.log("POST /api/seeker/photo - Atualizando Firestore");
      const seekerRef = db.collection("seekers").doc(seekerId);
      const seekerDoc = await seekerRef.get();

      // Eliminar todas as fotos antigas deste seeker
      if (seekerDoc.exists) {
        const existingData = seekerDoc.data();
        const oldPhotoURL = existingData?.photoURL;
        
        console.log("POST /api/seeker/photo - Eliminando fotos antigas do seeker:", seekerId);
        try {
          // Listar e eliminar todos os ficheiros na pasta do seeker
          const seekerFolder = `seekers/${seekerId}/`;
          const [files] = await bucket.getFiles({
            prefix: seekerFolder
          });
          
          console.log(`POST /api/seeker/photo - Encontradas ${files.length} fotos antigas para eliminar`);
          
          // Eliminar todos os ficheiros encontrados
          for (const file of files) {
            try {
              await file.delete();
              console.log(`POST /api/seeker/photo - Foto eliminada: ${file.name}`);
            } catch (deleteError) {
              console.error(`POST /api/seeker/photo - Erro ao eliminar ${file.name}:`, deleteError);
            }
          }
          
          console.log("POST /api/seeker/photo - Limpeza de fotos antigas concluída");
        } catch (deleteError) {
          console.error("POST /api/seeker/photo - Erro ao eliminar fotos antigas:", deleteError);
          // Não interrompe o processo se a eliminação falhar
        }
        
        console.log("POST /api/seeker/photo - Atualizando documento do seeker no Firestore...");
        await seekerRef.update({
          photoURL: downloadURL,
          updatedAt: new Date().toISOString()
        });
      } else {
        console.log("POST /api/seeker/photo - Criando novo documento de seeker no Firestore...");
        await seekerRef.set({
          seekerId: seekerId,
          photoURL: downloadURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      console.log("POST /api/seeker/photo - Operação concluída com sucesso, retornando URL:", downloadURL);
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

// GET: Buscar foto de perfil de um seeker específico
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/seeker/photo - Iniciando requisição");
    const url = new URL(req.url);
    const seekerId = url.searchParams.get("seekerId");

    console.log("GET /api/seeker/photo - SeekerId:", seekerId);

    if (!seekerId) {
      console.log("GET /api/seeker/photo - SeekerId não fornecido");
      return NextResponse.json({ error: "seekerId é obrigatório" }, { status: 400 });
    }

    // Initialize Firebase Admin
    await initAdmin();
    const db = getFirestore();

    // Buscar informações do seeker no Firestore
    console.log("GET /api/seeker/photo - Buscando dados do seeker:", seekerId);
    const seekerRef = db.collection("seekers").doc(seekerId);
    const seekerDoc = await seekerRef.get();

    if (seekerDoc.exists) {
      const seekerData = seekerDoc.data();
      console.log("GET /api/seeker/photo - Seeker encontrado, dados:", {
        name: seekerData?.name,
        hasPhoto: !!seekerData?.photoURL
      });
      
      return NextResponse.json({ 
        photoUrl: seekerData?.photoURL || null,
        photoURL: seekerData?.photoURL || null,
        success: true
      });
    } else {
      console.log("GET /api/seeker/photo - Seeker não encontrado");
      return NextResponse.json({ 
        photoUrl: null, 
        photoURL: null,
        success: true,
        message: "Seeker not found"
      });
    }
  } catch (error: any) {
    console.error("Erro ao buscar foto do seeker:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      { 
        error: "Erro ao buscar foto do seeker", 
        message: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

// DELETE: Remover a foto de perfil de um seeker
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const seekerId = url.searchParams.get("seekerId");

    if (!seekerId) {
      return NextResponse.json({ error: "seekerId é obrigatório" }, { status: 400 });
    }

    // Initialize Firebase Admin
    await initAdmin();
    const storage = getStorage();
    const db = getFirestore();

    const seekerRef = db.collection("seekers").doc(seekerId);
    const seekerDoc = await seekerRef.get();

    if (seekerDoc.exists && seekerDoc.data()?.photoURL) {
      const existingPhotoURL = seekerDoc.data()?.photoURL;
      
      // Eliminar a foto do Firebase Storage
      try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (bucketName) {
          const bucket = storage.bucket(bucketName);
          
          // Extrair o caminho do ficheiro da URL
          const urlParts = existingPhotoURL.split('/');
          const filePathIndex = urlParts.findIndex((part: string) => part === 'seekers');
          
          if (filePathIndex !== -1 && filePathIndex < urlParts.length - 2) {
            const filePath = urlParts.slice(filePathIndex, filePathIndex + 3).join('/');
            console.log("DELETE /api/seeker/photo - Eliminando ficheiro:", filePath);
            
            const fileRef = bucket.file(filePath);
            const [exists] = await fileRef.exists();
            
            if (exists) {
              await fileRef.delete();
              console.log("DELETE /api/seeker/photo - Ficheiro eliminado com sucesso");
            } else {
              console.log("DELETE /api/seeker/photo - Ficheiro não encontrado no storage");
            }
          }
        }
      } catch (deleteError) {
        console.error("DELETE /api/seeker/photo - Erro ao eliminar ficheiro do storage:", deleteError);
        // Continua mesmo se a eliminação do ficheiro falhar
      }
      
      // Atualizar o documento para remover a referência à foto
      await seekerRef.update({
        photoURL: null,
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { success: true, message: "Foto de perfil do seeker removida com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao remover foto do seeker:", error);
    return NextResponse.json(
      { error: "Erro ao remover foto do seeker", message: error.message },
      { status: 500 }
    );
  }
}
