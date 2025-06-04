// API Route for managing partners
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// GET: Fetch all partners
export async function GET(req: NextRequest) {
  try {
    if (!db) {
      console.error("Firestore is not initialized.");
      return NextResponse.json({ error: "Database connection is not initialized" }, { status: 500 });
    }

    const partnersCollection = collection(db, "partners");
    const partnersSnapshot = await getDocs(partnersCollection);
    const partners = partnersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json(partners);
  } catch (error: any) {
    console.error("Error fetching partners:", error);
    return NextResponse.json({ error: "Error fetching partners", message: error.message }, { status: 500 });
  }
}

// POST: Create a new partner
export async function POST(req: NextRequest) {
  try {
    if (!db) {
      console.error("Firestore is not initialized.");
      return NextResponse.json({ error: "Database connection is not initialized" }, { status: 500 });
    }

    const data = await req.json();
    const { name, logoUrl, description, website } = data;

    // Basic validation
    if (!name || !logoUrl) {
      return NextResponse.json({ error: "Partner name and logo are required" }, { status: 400 });
    }

    const partnersCollection = collection(db, "partners");
    const docRef = await addDoc(partnersCollection, {
      name,
      logoUrl,
      description: description || "",
      website: website || "",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      id: docRef.id,
      name,
      logoUrl,
      description: description || "",
      website: website || "",
      createdAt: new Date().toISOString()
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating partner:", error);
    return NextResponse.json({ error: "Error creating partner", message: error.message }, { status: 500 });
  }
}
