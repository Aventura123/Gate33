import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "../../../../lib/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/seeker/photo - Starting request");
    
    // Initialize Firebase Admin
    await initAdmin();
    const storage = getStorage();
    const db = getFirestore();
    
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const seekerId = formData.get("seekerId") as string | null;

    if (!file || !seekerId) {
    console.log("POST /api/seeker/photo - Invalid data:", { hasFile: !!file, hasSeekerId: !!seekerId });
      return NextResponse.json({ 
        error: "Invalid request", 
        message: "File and seekerId are required",
        success: false
      }, { status: 400 });
    }

    console.log("POST /api/seeker/photo - Starting photo upload for seeker:", seekerId);
    console.log("File type:", file.type);
    console.log("File size:", file.size, "bytes");

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: "File too large", 
        message: "File size must be less than 5MB" 
      }, { status: 400 });
    }

    // Check file type (only images allowed)
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

      console.log("Generating reference for Firebase Storage:", filePath);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log("POST /api/seeker/photo - Upload using Firebase Admin SDK");
      
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
      
      console.log("Upload finished, generating download URL...");
      // Generate public URL for Firebase Storage
      const downloadURL = `https://storage.googleapis.com/${bucketName}/${filePath}`;
      console.log("POST /api/seeker/photo - Generated URL:", downloadURL);

      console.log("POST /api/seeker/photo - Updating Firestore");
      const seekerRef = db.collection("seekers").doc(seekerId);
      const seekerDoc = await seekerRef.get();

      // Update seeker document in Firestore
      if (seekerDoc.exists) {
        console.log("POST /api/seeker/photo - Updating seeker document in Firestore...");
        console.log("POST /api/seeker/photo - Current document data:", seekerDoc.data());
        await seekerRef.update({
          photoURL: downloadURL,
          updatedAt: new Date().toISOString()
        });
        console.log("POST /api/seeker/photo - Document updated successfully with photoURL:", downloadURL);
        
        // Verify the update
        const updatedDoc = await seekerRef.get();
        if (updatedDoc.exists) {
          const updatedData = updatedDoc.data();
          console.log("POST /api/seeker/photo - Verification - Updated photoURL:", updatedData?.photoURL);
        }
      } else {
        console.log("POST /api/seeker/photo - Creating new seeker document in Firestore...");
        await seekerRef.set({
          seekerId: seekerId,
          photoURL: downloadURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log("POST /api/seeker/photo - New document created successfully with photoURL:", downloadURL);
      }
      
      console.log("POST /api/seeker/photo - Operation completed successfully, returning URL:", downloadURL);
      return NextResponse.json({ 
        success: true, 
        url: downloadURL,
        photoURL: downloadURL,
        message: "Profile photo uploaded successfully"
      }, { status: 200 });
    } catch (storageError: any) {
      console.error("Error during upload to Firebase Storage:", storageError);
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
    console.log("GET /api/seeker/photo - Starting request");
    const url = new URL(req.url);
    const seekerId = url.searchParams.get("seekerId");

    console.log("GET /api/seeker/photo - SeekerId:", seekerId);

    if (!seekerId) {
      console.log("GET /api/seeker/photo - SeekerId not provided");
      return NextResponse.json({ error: "seekerId is required" }, { status: 400 });
    }

    // Initialize Firebase Admin
    await initAdmin();
    const db = getFirestore();

    // Fetch seeker information from Firestore
    console.log("GET /api/seeker/photo - Fetching seeker data:", seekerId);
    const seekerRef = db.collection("seekers").doc(seekerId);
    const seekerDoc = await seekerRef.get();

    if (seekerDoc.exists) {
      const seekerData = seekerDoc.data();
      console.log("GET /api/seeker/photo - Seeker found, full data:", seekerData);
      console.log("GET /api/seeker/photo - Photo URL check:", {
        hasPhotoURL: !!seekerData?.photoURL,
        photoURLValue: seekerData?.photoURL,
        photoURLType: typeof seekerData?.photoURL
      });
      
      return NextResponse.json({ 
        photoUrl: seekerData?.photoURL || null,
        photoURL: seekerData?.photoURL || null,
        success: true
      });
    } else {
      console.log("GET /api/seeker/photo - Seeker not found in Firestore");
      return NextResponse.json({ 
        photoUrl: null, 
        photoURL: null,
        success: true,
        message: "Seeker not found"
      });
    }
  } catch (error: any) {
    console.error("Error fetching seeker photo:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      { 
        error: "Error fetching seeker photo", 
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
      return NextResponse.json({ error: "seekerId is required" }, { status: 400 });
    }

    // Initialize Firebase Admin
    await initAdmin();
    const storage = getStorage();
    const db = getFirestore();

    const seekerRef = db.collection("seekers").doc(seekerId);
    const seekerDoc = await seekerRef.get();

    if (seekerDoc.exists && seekerDoc.data()?.photoURL) {
      const existingPhotoURL = seekerDoc.data()?.photoURL;
      // Delete photo from Firebase Storage
      try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (bucketName) {
          const bucket = storage.bucket(bucketName);
          // Extract file path from URL
          const urlParts = existingPhotoURL.split('/');
          const filePathIndex = urlParts.findIndex((part: string) => part === 'seekers');
          if (filePathIndex !== -1 && filePathIndex < urlParts.length - 2) {
            const filePath = urlParts.slice(filePathIndex, filePathIndex + 3).join('/');
            console.log("DELETE /api/seeker/photo - Deleting file:", filePath);
            const fileRef = bucket.file(filePath);
            const [exists] = await fileRef.exists();
            if (exists) {
              await fileRef.delete();
              console.log("DELETE /api/seeker/photo - File deleted successfully");
            } else {
              console.log("DELETE /api/seeker/photo - File not found in storage");
            }
          }
        }
      } catch (deleteError) {
        console.error("DELETE /api/seeker/photo - Error deleting file from storage:", deleteError);
        // Continue even if file deletion fails
      }
      // Update document to remove photo reference
      await seekerRef.update({
        photoURL: null,
        updatedAt: new Date().toISOString()
      });
    }
    return NextResponse.json(
      { success: true, message: "Seeker profile photo removed successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error removing seeker photo:", error);
    return NextResponse.json(
      { error: "Error removing seeker photo", message: error.message },
      { status: 500 }
    );
  }
}
