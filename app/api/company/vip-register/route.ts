import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { sendEmail } from '../../../../utils/emailService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    if (!db) {
      throw new Error("Database is not initialized.");
    }    // Validation for VIP companies
    if (formData.password !== formData.confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match." },
        { status: 400 }
      );
    }

    // Check for duplicate company by name, email, or taxId in pending companies
    const pendingRef = collection(db, "pendingCompanies");
    const q1 = query(pendingRef, where("companyName", "==", formData.companyName));
    const q2 = query(pendingRef, where("email", "==", formData.email));
    const q3 = query(pendingRef, where("taxId", "==", formData.taxId));
    const q4 = query(pendingRef, where("responsibleEmail", "==", formData.responsibleEmail));

    const [snap1, snap2, snap3, snap4] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
      getDocs(q3),
      getDocs(q4)
    ]);    if (!snap1.empty || !snap2.empty || !snap3.empty || !snap4.empty) {
      return NextResponse.json(
        { success: false, message: "A company with the same information is already registered. Contact support if you believe this is an error." },
        { status: 400 }
      );
    }

    // Check in approved companies as well
    const approvedRef = collection(db, "companies");
    const q5 = query(approvedRef, where("companyName", "==", formData.companyName));
    const q6 = query(approvedRef, where("email", "==", formData.email));
    const q7 = query(approvedRef, where("taxId", "==", formData.taxId));
    const q8 = query(approvedRef, where("responsibleEmail", "==", formData.responsibleEmail));

    const [snap5, snap6, snap7, snap8] = await Promise.all([
      getDocs(q5),
      getDocs(q6),
      getDocs(q7),
      getDocs(q8)
    ]);

    if (!snap5.empty || !snap6.empty || !snap7.empty || !snap8.empty) {
      return NextResponse.json(
        { success: false, message: "A company with the same information is already approved and registered." },
        { status: 400 }
      );
    }

    // Add document directly to companies collection with blocked status
    const docRef = await addDoc(collection(db, "companies"), {
      ...formData,
      logoUrl: formData.logoFile || "",
      docUrl: formData.docFile || "",
      status: "blocked", // VIP companies start as blocked until platform launch
      isVipInvite: true, // Special flag for VIP invites
      vipDiscount: 20, // 20% lifetime discount
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(), // Pre-approved but blocked
      notificationPreferences: { marketing: true },
    });

    // Send welcome email to VIP company
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #FF6B00 0%, #FFA500 100%); border-radius: 10px;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">            <h1 style="color: #FF6B00; margin: 0; font-size: 28px;">🎉 Welcome to Gate33 VIP!</h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Congratulations on becoming one of our founding partners</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B00;">            <h2 style="color: #FF6B00; margin: 0 0 15px 0; font-size: 22px;">✅ Registration Successfully Approved</h2>
            <p style="margin: 10px 0; color: #333; line-height: 1.6;">
              Your VIP company registration has been approved and your account has been successfully created. 
              As one of the <strong>first 10 founding partners</strong>, you will receive exclusive benefits including 
              a <strong style="color: #FF6B00;">lifetime 20% discount</strong> on all platform services.
            </p>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">            <h3 style="color: #d68910; margin: 0 0 15px 0; font-size: 18px;">🔒 Temporary Status: Account Blocked</h3>
            <p style="margin: 10px 0; color: #856404; line-height: 1.6;">
              Your account is temporarily blocked until the official launch of the Gate33 platform. 
              Once the platform is officially launched, you will receive a confirmation email to 
              unlock your login and start using all services.
            </p>
          </div>            <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bee5eb;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0; font-size: 18px;">🏆 Exclusive VIP Benefits</h3>
            <ul style="margin: 10px 0; color: #0c5460; line-height: 1.8; padding-left: 20px;">
              <li><strong>Lifetime 20% Discount</strong> on all platform services</li>
              <li><strong>Priority Support</strong> with guaranteed 24h response time</li>
              <li><strong>Verified Founder Badge</strong> with exclusive recognition</li>
              <li><strong>Commemorative NFT</strong> from the "Gate33 - First 10 Partners" collection</li>
              <li><strong>Early Access</strong> to new platform features</li>
              <li><strong>Personalized Consulting</strong> for platform usage optimization</li>
            </ul>
          </div>
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #b8daff;">
            <h3 style="color: #004085; margin: 0 0 15px 0; font-size: 18px;">🖼️ NFT "Gate33 - First 10 Partners"</h3>
            <p style="margin: 10px 0; color: #004085; line-height: 1.6;">
              You will receive an NFT featuring your company logo in the exclusive collection that represents your 
              fundamental role in Gate33's journey. This limited collection not only serves as a digital certificate 
              of your pioneer status, but may also help finance Gate33's initial development phase.
              <strong> Your NFT will be a valuable piece of Web3 employment history.</strong>
            </p>
          </div>
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6c3;">
            <h3 style="color: #2d5a2d; margin: 0 0 15px 0; font-size: 18px;">📋 Registered Company Information</h3>
            <ul style="margin: 10px 0; color: #2d5a2d; line-height: 1.6; list-style: none; padding: 0;">
              <li><strong>Company:</strong> ${formData.companyName}</li>
              <li><strong>Email:</strong> ${formData.email}</li>
              <li><strong>Responsible Person:</strong> ${formData.responsibleName}</li>
              <li><strong>Position:</strong> ${formData.responsiblePosition}</li>
            </ul>
          </div>
            <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              Stay tuned to your email for updates about the platform launch.
            </p>
          </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated email sent from <strong>noreply@gate33.net</strong><br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;    // Send confirmation email
    const emailSent = await sendEmail({
      to: formData.email,
      subject: "🎉 Gate33 VIP - Registration Successfully Approved!",
      text: `Congratulations! Your VIP registration at Gate33 has been successfully approved. Your account is temporarily blocked until the official platform launch.`,
      html: emailHtml,
      from: 'noreply@gate33.net'
    });    // Also send copy to responsible person if different email
    if (formData.responsibleEmail && formData.responsibleEmail !== formData.email) {
      await sendEmail({
        to: formData.responsibleEmail,
        subject: "🎉 Gate33 VIP - Registration Successfully Approved!",
        text: `Congratulations! Your VIP registration at Gate33 has been successfully approved. Your account is temporarily blocked until the official platform launch.`,
        html: emailHtml,
        from: 'noreply@gate33.net'
      });
    }

    console.log("VIP Company document written with ID: ", docRef.id);
    console.log("Email sent successfully:", emailSent.success);

    return NextResponse.json({
      success: true,
      message: "VIP registration completed successfully!",
      companyId: docRef.id,
      emailSent: emailSent.success
    });

  } catch (error) {
    console.error("Error processing VIP company registration: ", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again or contact our support team." },
      { status: 500 }
    );
  }
}
