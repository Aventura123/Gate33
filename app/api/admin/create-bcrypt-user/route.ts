import { NextResponse } from "next/server";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import bcrypt from "bcryptjs";

export async function GET() {
  // Cria um novo admin com username Aventura77 e senha Aventura88 (bcrypt)
  try {
    const adminsCollection = collection(db, "admins");
    const adminId = "aventura77-bcrypt-" + Date.now();
    const adminDoc = doc(adminsCollection, adminId);
    const passwordHash = await bcrypt.hash("Aventura88", 10);
    await setDoc(adminDoc, {
      id: adminId,
      name: "Aventura Teste Bcrypt",
      username: "Aventura77",
      email: "aventura77@gate33.com",
      role: "admin",
      password: passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, message: "Admin criado com bcrypt!", username: "Aventura77", password: "Aventura88" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error) }, { status: 500 });
  }
}