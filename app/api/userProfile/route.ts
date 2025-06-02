import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { doc, getDoc, collection, getDocs, query, limit, updateDoc, setDoc } from "firebase/firestore";

// GET: Fetch user profile data with or without ID
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    console.log("API userProfile GET - userId received:", userId);

    // If no userId provided, fetch the first available admin
    if (!userId) {
      console.log("No userId provided, fetching the first available admin");
      
      if (!db) {
        throw new Error("Firestore is not initialized");
      }
      
      // Find the first available admin
      try {
        const adminsCollection = collection(db, "admins");
        const adminsQuery = query(adminsCollection, limit(1));
        const adminsSnapshot = await getDocs(adminsQuery);
        
        if (adminsSnapshot.empty) {
          console.log("No admin found in the database");
          return NextResponse.json({ 
            error: "No administrator found" 
          }, { status: 404 });
        }
        
        // Get the first admin
        const firstAdmin = adminsSnapshot.docs[0];
        const adminId = firstAdmin.id;
        const adminData = firstAdmin.data();
        
        console.log("Admin found:", adminId);
        
        return NextResponse.json({ 
          userId: adminId,
          photoUrl: adminData.photoURL || null,
          userData: adminData
        });
      } catch (error) {
        console.error("Error fetching admin:", error);
        return NextResponse.json({ 
          error: "Error fetching administrator" 
        }, { status: 500 });
      }
    }

    // If userId is provided, search in collections normally
    console.log("Searching for profile with userId:", userId);

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
        // Always return userData, even if photoURL is missing
        return NextResponse.json({ 
          photoUrl: userData.photoURL || null,
          collection: collection,
          userData: userData
        });
      }
    }
    
    // If user not found in any collection
    console.log("No user found for userId", userId);
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
    const { userId, photoUrl, collection = "admins", ...otherFields } = body;

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
      
      await setDoc(userRef, newData);
      
      console.log("New user document created with all profile data");
      return NextResponse.json({ 
        success: true,
        message: "New profile created successfully"
      });
    }  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Error updating user profile", message: error.message },
      { status: 500 }
    );
  }
}