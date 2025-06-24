import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { doc, getDoc, collection, getDocs, query, limit, updateDoc, setDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";

// GET: Fetch user profile data with or without ID
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ 
        error: "User ID is required" 
      }, { status: 400 });
    }

    if (!db) {
      throw new Error("Firestore is not initialized");
    }

    // Check all collections that might contain the user
    const collections = ["admins", "employers", "seekers", "users"];
    
    for (const collection of collections) {
      const userRef = doc(db, collection, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return NextResponse.json({ 
          photoUrl: userData.photoURL || null,
          collection: collection,
          userData: userData
        });
      }
    }
    
    // If user not found in any collection
    return NextResponse.json({ photoUrl: null, userData: null });
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Error fetching user profile", message: error.message },
      { status: 500 }
    );
  }
}

// POST: Update user profile data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, photoUrl, collection = "admins", newPassword, ...otherFields } = body;

    if (!userId) {
      return NextResponse.json({ 
        error: "Invalid parameters", 
        message: "userId is required" 
      }, { status: 400 });
    }

    console.log("Updating user profile for:", userId, "in collection:", collection);

    if (!db) {
      throw new Error("Firestore is not initialized");
    }

    // Reference to the user document in the specified collection
    const userRef = doc(db, collection, userId);
    
    // Check if the document exists
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Update existing document with all fields from the request
      const updateData = {
        ...otherFields,
        updatedAt: new Date().toISOString()
      };
      
      // Only include photoUrl if it was provided
      if (photoUrl) {
        updateData.photoURL = photoUrl;
      }
      
      // Hash password if newPassword is provided
      if (newPassword) {
        console.log("Hashing new password for user");
        updateData.password = await bcrypt.hash(newPassword, 10);
      }
      
      await updateDoc(userRef, updateData);
      
      console.log("User profile updated successfully");
      return NextResponse.json({ 
        success: true,
        message: "Profile updated successfully"
      });
    } else {
      // Create a new document with all fields from the request
      const newData = {
        ...otherFields,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Only include photoUrl if it was provided
      if (photoUrl) {
        newData.photoURL = photoUrl;
      }
      
      // Hash password if newPassword is provided
      if (newPassword) {
        console.log("Hashing new password for new user");
        newData.password = await bcrypt.hash(newPassword, 10);
      }
      
      await setDoc(userRef, newData);
      
      console.log("New user document created with all profile data");
      return NextResponse.json({ 
        success: true,
        message: "New profile created successfully"
      });
    }
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Error updating user profile", message: error.message },
      { status: 500 }
    );
  }
}