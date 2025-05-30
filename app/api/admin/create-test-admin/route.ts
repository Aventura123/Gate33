import { NextResponse } from "next/server";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { hash } from "bcryptjs";

export async function GET() {
  // Cria um novo admin com senha padrão
  try {
    const adminsCollection = collection(db, "admins");
    const adminId = "tester-admin-" + Date.now();
    const adminDoc = doc(adminsCollection, adminId);
    const plainPassword = "Test123";
    const passwordHash = await hash(plainPassword, 10);
    await setDoc(adminDoc, {
      id: adminId,
      name: "Test Admin",
      username: "testadmin",
      email: "test@example.com",
      role: "support",
      password: passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ 
      success: true, 
      message: "Test admin created successfully", 
      username: "testadmin", 
      password: plainPassword,
      adminId: adminId
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: typeof error === 'object' && error !== null && 'message' in error ? 
        (error as any).message : String(error) 
    }, { status: 500 });
  }
}
