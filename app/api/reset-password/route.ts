import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection } from "firebase/firestore";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
    }
    // Find token in passwordResets collection
    const tokenDoc = await getDoc(doc(db, "passwordResets", token));
    if (!tokenDoc.exists()) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }
    const tokenData = tokenDoc.data();
    if (tokenData.used || Date.now() > tokenData.expires) {
      return NextResponse.json({ error: "Token expired or already used." }, { status: 400 });
    }
    // Update user password
    let userCol = "seekers";
    if (tokenData.userType === "company") userCol = "companies";
    else if (tokenData.userType === "admin") userCol = "admins";
    const userRef = doc(db, userCol, tokenData.userId);
    const hash = await bcrypt.hash(password, 10);
    await updateDoc(userRef, { password: hash });
    // Invalidate token
    await updateDoc(doc(db, "passwordResets", token), { used: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Error resetting password." }, { status: 500 });
  }
}
