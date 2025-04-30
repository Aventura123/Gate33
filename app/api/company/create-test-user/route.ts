import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const companiesCollection = collection(db, "companies");
    const companyId = "company-susana1-" + Date.now();
    const companyDoc = doc(companiesCollection, companyId);
    const passwordHash = await bcrypt.hash("susana1@teste.com", 10);
    await setDoc(companyDoc, {
      id: companyId,
      name: "company1 susana1",
      username: "susana1@teste.com",
      email: "susana1@teste.com",
      passwordHash,
      status: "approved",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, message: "Company user criado!", email: "susana1@teste.com", password: "susana1@teste.com" });
  } catch (error) {
    return NextResponse.json({ success: false, error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error) }, { status: 500 });
  }
}
