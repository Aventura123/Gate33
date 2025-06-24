import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { sendResetPasswordEmail } from "@/utils/emailService";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { emailOrUsername } = await req.json();
    if (!emailOrUsername) {
      return NextResponse.json({ error: "Email or username is required." }, { status: 400 });
    }

    console.log(`Attempting password reset for: ${emailOrUsername}`);
    
    // If it looks like an email, try to send password reset directly
    if (emailOrUsername.includes('@')) {
      try {
        const auth = getAuth();
        await sendPasswordResetEmail(auth, emailOrUsername);
        console.log(`Password reset email sent directly to: ${emailOrUsername}`);
        return NextResponse.json({ ok: true });
      } catch (err: any) {
        console.error(`Direct password reset failed for ${emailOrUsername}:`, err);
        // If direct reset fails, continue with normal flow to find user
      }
    }

    // Find user email (seeker or company)
    let userEmail = null;
    
    // Search seeker by email
    const seekersRef = collection(db, "seekers");
    const seekersQ = query(seekersRef, where("email", "==", emailOrUsername));
    const seekersSnap = await getDocs(seekersQ);
    if (!seekersSnap.empty) {
      userEmail = seekersSnap.docs[0].data().email;
      console.log(`Found seeker with email: ${userEmail}`);
    }
      // Search company by username or email
    if (!userEmail) {
      const companiesRef = collection(db, "companies");
      // Try by username first
      const companiesQ1 = query(companiesRef, where("username", "==", emailOrUsername));
      const companiesSnap1 = await getDocs(companiesQ1);
      if (!companiesSnap1.empty) {
        userEmail = companiesSnap1.docs[0].data().email;
      }
      // Try by email if not found by username
      if (!userEmail) {
        const companiesQ2 = query(companiesRef, where("email", "==", emailOrUsername));
        const companiesSnap2 = await getDocs(companiesQ2);
        if (!companiesSnap2.empty) {
          userEmail = companiesSnap2.docs[0].data().email;
        }
      }
    }
      // Search admin by username or email
    let isAdmin = false;
    let adminUserId = null;
    if (!userEmail) {
      const adminsRef = collection(db, "admins");
      // Try by username
      const adminsQ1 = query(adminsRef, where("username", "==", emailOrUsername));
      const adminsSnap1 = await getDocs(adminsQ1);
      if (!adminsSnap1.empty) {
        userEmail = adminsSnap1.docs[0].data().email;
        isAdmin = true;
        adminUserId = adminsSnap1.docs[0].id;
      }
      // Try by email if not found by username
      if (!userEmail) {
        const adminsQ2 = query(adminsRef, where("email", "==", emailOrUsername));
        const adminsSnap2 = await getDocs(adminsQ2);
        if (!adminsSnap2.empty) {
          userEmail = adminsSnap2.docs[0].data().email;
          isAdmin = true;
          adminUserId = adminsSnap2.docs[0].id;
        }
      }
    }    if (!userEmail) {
      // Do not reveal if user exists or not
      return NextResponse.json({ ok: true });
    }

    // Handle admin password reset differently (custom system)
    if (isAdmin && adminUserId) {
      try {
        // Generate reset token
        const resetToken = uuidv4();
        const expires = Date.now() + (60 * 60 * 1000); // 1 hour
        
        // Save reset token to passwordResets collection
        await setDoc(doc(db, "passwordResets", resetToken), {
          userId: adminUserId,
          userType: "admin",
          email: userEmail,
          expires: expires,
          used: false,
          createdAt: Date.now()
        });
        
        // Send custom email for admin
        await sendResetPasswordEmail(userEmail, resetToken);
        
        console.log(`Custom password reset email sent to admin: ${userEmail}`);
        return NextResponse.json({ ok: true });
      } catch (error) {
        console.error("Error sending admin password reset:", error);
        return NextResponse.json({ error: "Error processing admin reset request." }, { status: 500 });
      }
    }

    // Use Firebase Auth for seekers and companies
    const auth = getAuth();
    await sendPasswordResetEmail(auth, userEmail);
    
    return NextResponse.json({ ok: true });} catch (err: any) {
    console.error("Error sending password reset:", err);
    
    // Provide better error messages
    let errorMessage = "Error processing request.";
    if (err.code === 'auth/user-not-found') {
      errorMessage = "If this email exists in our system, a password reset link has been sent.";
    } else if (err.code === 'auth/invalid-email') {
      errorMessage = "Invalid email format.";
    } else if (err.code === 'auth/too-many-requests') {
      errorMessage = "Too many requests. Please try again later.";
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
