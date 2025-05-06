import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { sendResetPasswordEmail } from "@/utils/emailService";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { emailOrUsername } = await req.json();
    if (!emailOrUsername) {
      return NextResponse.json({ error: "Email or username is required." }, { status: 400 });
    }

    // Find user (seeker or company)
    let user = null;
    let userType = null;
    let userId = null;
    // Search seeker by email
    const seekersRef = collection(db, "seekers");
    const seekersQ = query(seekersRef, where("email", "==", emailOrUsername));
    const seekersSnap = await getDocs(seekersQ);
    if (!seekersSnap.empty) {
      user = seekersSnap.docs[0].data();
      userType = "seeker";
      userId = seekersSnap.docs[0].id;
    }
    // Search company by username or email
    if (!user) {
      const companiesRef = collection(db, "companies");
      const companiesQ = query(companiesRef, where("username", "==", emailOrUsername));
      const companiesSnap = await getDocs(companiesQ);
      if (!companiesSnap.empty) {
        user = companiesSnap.docs[0].data();
        userType = "company";
        userId = companiesSnap.docs[0].id;
      }
    }
    // Search admin by username or email
    if (!user) {
      const adminsRef = collection(db, "admins");
      // Try by username
      const adminsQ1 = query(adminsRef, where("username", "==", emailOrUsername));
      const adminsSnap1 = await getDocs(adminsQ1);
      if (!adminsSnap1.empty) {
        user = adminsSnap1.docs[0].data();
        userType = "admin";
        userId = adminsSnap1.docs[0].id;
      }
      // Try by email if not found by username
      if (!user) {
        const adminsQ2 = query(adminsRef, where("email", "==", emailOrUsername));
        const adminsSnap2 = await getDocs(adminsQ2);
        if (!adminsSnap2.empty) {
          user = adminsSnap2.docs[0].data();
          userType = "admin";
          userId = adminsSnap2.docs[0].id;
        }
      }
    }
    if (!user) {
      // Do not reveal if user exists or not
      return NextResponse.json({ ok: true });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 60; // 1 hour
    // Save token in 'passwordResets' collection
    await setDoc(doc(db, "passwordResets", token), {
      userId,
      userType,
      expires,
      used: false,
    });

    // Send email
    await sendResetPasswordEmail(user.email || user.username, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Error processing request." }, { status: 500 });
  }
}
