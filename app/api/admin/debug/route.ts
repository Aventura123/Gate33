import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, doc, getDoc, Firestore } from 'firebase/firestore';

export async function GET(req: Request) {
  try {
    // Get the userId from query parameters for security
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId parameter is required for security' 
      }, { status: 400 });
    }

    if (!db) {
      throw new Error("Firestore instance is not initialized.");
    }
    
    // Check only the specific user document in 'admins' collection
    try {
      const adminDocRef = doc(db as Firestore, 'admins', userId);
      const adminDocSnapshot = await getDoc(adminDocRef);
      
      if (adminDocSnapshot.exists()) {
        const adminData = adminDocSnapshot.data();
        // Remove sensitive data before returning
        const safeData = { ...adminData };
        delete safeData.password;
        
        return NextResponse.json({ 
          success: true, 
          userData: safeData,
          collection: 'admins',
          message: `Debug info for user: ${userId}`
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: `User document not found for userId: ${userId}`,
          collection: 'admins'
        }, { status: 404 });
      }
    } catch (error) {
      console.error("Erro ao verificar documento do usuário:", error);
      return NextResponse.json({ 
        success: false, 
        error: `Error checking user document: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Erro ao verificar dados do Firestore:", error);
    return NextResponse.json({ 
      success: false, 
      error: `Error checking Firestore data: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}