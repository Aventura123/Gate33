import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    console.log("CV Upload - Starting process...");
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const seekerId = formData.get("seekerId") as string;

    console.log("CV Upload - File:", file?.name, "Size:", file?.size, "Type:", file?.type);
    console.log("CV Upload - Seeker ID:", seekerId);

    if (!file || !seekerId) {
      console.log("CV Upload - Missing file or seeker ID");
      return NextResponse.json(
        { error: "Missing file or seeker ID" },
        { status: 400 }
      );
    }

    // Check file type - accept PDF, DOC, DOCX, ODT, RTF, TXT
    const fileType = file.type;
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.oasis.opendocument.text",
      "application/rtf",
      "text/plain",
    ];

    if (!validTypes.includes(fileType)) {
      console.log("CV Upload - Invalid file type:", fileType);
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, DOC, DOCX, ODT, RTF or TXT" },
        { status: 400 }
      );
    }

    // Check file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      console.log("CV Upload - File too large:", file.size);
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Check if Firebase is properly initialized
    if (!storage || !db) {
      console.error("CV Upload - Firebase storage or db not initialized");
      return NextResponse.json(
        { error: "Firebase not properly configured" },
        { status: 500 }
      );
    }

    console.log("CV Upload - Firebase services available, proceeding with upload...");

    // Upload file to Firebase Storage
    const bytes = await file.arrayBuffer();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${seekerId}_cv_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `resumes/${fileName}`);

    console.log("CV Upload - Uploading file to Firebase Storage:", fileName);
    await uploadBytes(storageRef, new Uint8Array(bytes));

    // Get the download URL
    console.log("CV Upload - Getting download URL...");
    const downloadURL = await getDownloadURL(storageRef);

    // Update the seeker profile with the CV URL
    console.log("CV Upload - Updating seeker profile with URL:", downloadURL);
    const seekerRef = doc(db, "seekers", seekerId);
    await updateDoc(seekerRef, {
      resumeUrl: downloadURL,
    });

    console.log("CV Upload - Success! URL:", downloadURL);
    return NextResponse.json({ 
      success: true,
      url: downloadURL,
      message: "CV uploaded successfully"
    });
  } catch (error: any) {
    console.error("CV Upload - Error occurred:", error);
    
    // More detailed error response
    const errorMessage = error?.message || "Unknown error occurred";
    const errorCode = error?.code || "unknown";
    
    console.error("CV Upload - Error details:", {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to upload CV",
        message: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
