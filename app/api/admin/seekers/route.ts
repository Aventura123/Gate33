import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// GET: Fetch all job seekers or a specific seeker by ID
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (id) {
      // Fetch a specific seeker
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
          { error: "Seeker not found" },
          { status: 404 }
        );
      }
      
      const seekerData = seekerSnapshot.data() as { password?: string; [key: string]: any };
      const seeker = {
        id: seekerSnapshot.id,
        ...seekerData
      };
      
      // Remove sensitive data
      delete seeker.password;
      
      return NextResponse.json(seeker);
    } else {
      // Fetch all seekers
      if (!db) {
        return NextResponse.json(
          { error: "Database connection is not initialized" },
          { status: 500 }
        );
      }
      const seekersCollection = collection(db, "seekers");
      const seekersSnapshot = await getDocs(seekersCollection);
      
      const seekers = seekersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Remove sensitive data
        delete data.password;
        
        return {
          id: doc.id,
          ...data
        };
      });
      
      return NextResponse.json(seekers);
    }
  } catch (error: any) {
    console.error("Error fetching seekers:", error);
    return NextResponse.json(
      { error: "Error fetching seekers", message: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new job seeker
export async function POST(req: NextRequest) {
  try {
    const { 
      name, 
      username, 
      password, 
      email, 
      skills = [], 
      experience = [], 
      education = [],
      resumeUrl = null
    } = await req.json();
    
    // Basic validation
    if (!name || !username || !password || !email) {
      return NextResponse.json(
        { error: "Incomplete data" },
        { status: 400 }
      );
    }
    
    // Check if username already exists
    const usernameQuery = query(
      collection(db!, "seekers"),
      where("username", "==", username)
    );
    
    const usernameSnapshot = await getDocs(usernameQuery);
    
    if (!usernameSnapshot.empty) {
      return NextResponse.json(
        { error: "Username is already in use" },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const emailQuery = query(
      collection(db, "seekers"),
      where("email", "==", email)
    );
    
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 400 }
      );
    }
    
    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate unique ID
    const seekerId = uuidv4();
    
    // Create document in Firestore
    const seekerRef = doc(db, "seekers", seekerId);
    
    await setDoc(seekerRef, {
      id: seekerId,
      name,
      username,
      email,
      skills,
      experience,
      education,
      resumeUrl,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Seeker created successfully",
        seeker: {
          id: seekerId,
          name,
          username,
          email,
          skills,
          experience,
          education,
          resumeUrl
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating seeker:", error);
    return NextResponse.json(
      { error: "Error creating seeker", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove a job seeker
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Seeker ID is required" },
        { status: 400 }
      );
    }
    
    const seekerRef = doc(db, "seekers", id);
    await deleteDoc(seekerRef);
    
    return NextResponse.json(
      { success: true, message: "Seeker removed successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error removing seeker:", error);
    return NextResponse.json(
      { error: "Error removing seeker", message: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Update the block status of a seeker
export async function PATCH(req: NextRequest) {
  try {
    const { id, blocked } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Seeker ID is required" },
        { status: 400 }
      );
    }

    if (blocked === undefined) {
      return NextResponse.json(
        { error: "'blocked' field is required" },
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
        { error: "Seeker not found" },
        { status: 404 }
      );
    }

    await updateDoc(seekerRef, { blocked });

    return NextResponse.json(
      { 
        success: true, 
        message: `Seeker ${blocked ? 'blocked' : 'unblocked'} successfully`,
        blocked
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating seeker:", error);
    return NextResponse.json(
      { error: "Error updating seeker", message: error.message },
      { status: 500 }
    );
  }
}