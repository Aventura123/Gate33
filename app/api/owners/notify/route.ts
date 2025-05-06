import { NextRequest, NextResponse } from 'next/server';
import { logSystem } from '../../../../utils/logSystem';
import { db } from '../../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Email configuration
const ADMIN_EMAIL = 'info@gate33.com'; // Main email to receive notifications
const ADMIN_EMAILS = ['info@gate33.com']; // List of additional emails for notification

// Function to send email using your existing implementation
async function sendEmail(to: string | string[], subject: string, message: string) {
  try {
    // Dynamically import to avoid SSR issues
    const { sendEmail: sendEmailService } = await import('../../../../utils/emailService');
    
    // If it's an array, send to each recipient
    if (Array.isArray(to)) {
      for (const recipient of to) {
        await sendEmailService({
          to: recipient,
          subject,
          text: "An NFT ownership holder has connected.",
          html: message
        });
      }
    } else {
      await sendEmailService({
        to,
        subject,
        text: "An NFT ownership holder has connected.",
        html: message
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    await logSystem.error(`Failed to send notification email: ${error}`, { 
      service: 'email',
      error: String(error)
    });
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerAddress, timestamp } = body;
    
    if (!ownerAddress) {
      return NextResponse.json(
        { success: false, message: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Record the event in Firebase
    await addDoc(collection(db, "ownerConnections"), {
      ownerAddress,
      timestamp: timestamp || serverTimestamp(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    // Log in the system logs
    await logSystem.info(`Owner wallet connected: ${ownerAddress}`, {
      ownerAddress,
      action: 'owner_connected',
      timestamp: new Date().toISOString()
    });
    
    // Format HTML email with wallet address
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
        <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">🔔 Gate33 Alert - Owner Access</h2>
        
        <p style="font-size: 16px; color: #333;">An ownership NFT holder has just connected their wallet to the portal.</p>
        
        <div style="background-color: #f9f9f9; border-left: 4px solid #FF6B00; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">Wallet Address:</p>
          <p style="margin: 5px 0; font-family: monospace; word-break: break-all;">${ownerAddress}</p>
        </div>
        
        <p style="font-size: 14px; color: #555;">Timestamp: ${new Date().toLocaleString()}</p>
        
        <p style="font-size: 14px; margin-top: 20px;">
          <a href="http://localhost:3000/owners" style="color: #FF6B00;">Access the owners portal for communication</a>
        </p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `;
    
    // Send email to administrators
    const emailSent = await sendEmail(
      ADMIN_EMAILS,
      'Gate33 - Owner Connection Detected',
      emailHtml
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent successfully',
      emailSent
    });
    
  } catch (error) {
    console.error('Error in owner notification API:', error);
    
    await logSystem.error('Error in owner notification API', {
      error: String(error),
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}