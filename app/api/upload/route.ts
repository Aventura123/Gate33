import { NextRequest, NextResponse } from "next/server";
import { storage, db } from "../../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import path from 'path';

// Ensure storage is properly initialized
if (!storage) {
  throw new Error("Firebase Storage is not initialized. Please check your Firebase configuration.");
}

// Ensure Firestore is properly initialized
if (!db) {
  throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
}

// Função de teste para o Firebase Storage
async function testUpload() {
  const testFile = new Blob(["Hello, world!"], { type: "text/plain" });
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }
  const storageRef = ref(storage, "test/test.txt");

  try {
    const snapshot = await uploadBytes(storageRef, testFile);
    console.log("Upload successful:", snapshot.metadata.fullPath);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}

// Ensure only one GET function exists
export async function GET(req: NextRequest) {
  console.log("--- Executing testUpload via API ---");
  try {
    await testUpload();
    return NextResponse.json({ success: true, message: "testUpload executed successfully." });
  } catch (error: any) {
    console.error("Error during testUpload execution via API:", error);
    return NextResponse.json({ success: false, error: error.message || "Unknown error occurred." });
  }
}

export async function POST(req: NextRequest) {
  // Adicionando logs detalhados para identificar problemas no upload
  console.log("Iniciando processo de upload...");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId) {
      console.error("Requisição inválida: file ou userId ausente.");
      return NextResponse.json({ 
        error: "Invalid request", 
        message: "File and userId are required" 
      }, { status: 400 });
    }

    console.log("Iniciando upload de foto para usuário:", userId);
    console.log("Tipo de arquivo:", file.type);
    console.log("Tamanho do arquivo:", file.size, "bytes");

    // Verificar tamanho do arquivo (limitar a 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error("Arquivo muito grande. Tamanho máximo permitido: 5MB.");
      return NextResponse.json({ 
        error: "File too large", 
        message: "File size must be less than 5MB" 
      }, { status: 400 });
    }

    // Verificar tipo de arquivo (apenas imagens)
    if (!file.type.startsWith("image/")) {
      console.error("Tipo de arquivo inválido. Apenas imagens são permitidas.");
      return NextResponse.json({ 
        error: "Invalid file type", 
        message: "Only image files are allowed" 
      }, { status: 400 });
    }

    // Convertendo o arquivo para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("Buffer gerado com sucesso.");

    // Gerando um nome único para o arquivo
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    console.log("Nome do arquivo gerado:", fileName);

    let downloadURL;

    try {
      // Revert to original file path structure
      const filePath = `user-photos/${userId}/${fileName}`;
      console.log("Gerando referência para:", filePath);

      // Explicitly check storage initialization again right before use
      if (!storage) {
        console.error("CRITICAL: Firebase Storage object is null right before creating ref.");
        throw new Error("Firebase Storage is not initialized.");
      }
      console.log("Verifying storage object immediately before ref():", storage ? 'Initialized' : 'Not Initialized');

      const storageRef = ref(storage, filePath);
      console.log("Storage reference created:", storageRef);

      console.log("Iniciando upload para Firebase Storage...");
      const snapshot = await uploadBytes(storageRef, buffer);
      console.log("Upload concluído, obtendo URL de download...");

      downloadURL = await getDownloadURL(snapshot.ref);
      console.log("URL de download obtida:", downloadURL);

    } catch (storageError: any) {
      // Log the full error object, including serverResponse if available
      console.error("Detailed Firebase Storage Error:", JSON.stringify(storageError, null, 2));
      console.error("Erro no Firebase Storage:", storageError.code, storageError.message, storageError.serverResponse, storageError.stack);
      // Re-throw with a more specific message if possible, otherwise keep the generic one
      throw new Error(`Falha ao fazer upload para o Firebase Storage. Code: ${storageError.code}. Message: ${storageError.message}. Verifique as configurações e permissões.`);
    }

    // Salvando a URL da imagem no Firestore associada ao usuário
    // Primeiro, verificar qual coleção contém o usuário (admin, employer ou seeker)
    const collections = ["admins", "employers", "seekers"];
    let userDoc = null;
    let collectionName = "";

    for (const collection of collections) {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      const userRef = doc(db!, collection, userId);
      const docSnapshot = await getDoc(userRef);
      
      if (docSnapshot.exists()) {
        userDoc = docSnapshot;
        collectionName = collection;
        break;
      }
    }

    // Se encontrou o usuário, atualiza o documento
    if (userDoc) {
      // Atualizar o documento com a URL da foto
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      const userRef = doc(db!, collectionName, userId);
      await updateDoc(userRef, {
        photoURL: downloadURL,
        photoPath: `user-photos/${userId}/${fileName}`,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`Foto do usuário atualizada no Firestore (coleção: ${collectionName})`);
    } else {
      console.log("Usuário não encontrado no Firestore, criando registro na coleção 'users'");
      // Criar um documento para o usuário na coleção users se ele não existir
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      const userRef = doc(db!, "users", userId);
      await setDoc(userRef, {
        photoURL: downloadURL,
        photoPath: `user-photos/${userId}/${fileName}`,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    }

    // Salvar a URL da foto no localStorage através do front-end
    return NextResponse.json({ 
      success: true, 
      url: downloadURL,
      storageMethod: "firebase"
    }, { status: 200 });
  } catch (error: any) {
    console.error("Erro durante o upload:", error.message, error.stack);
    return NextResponse.json({
      error: "Upload failed",
      message: error.message || "An unknown error occurred during file upload"
    }, { status: 500 });
  }
}