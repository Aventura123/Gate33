import { NextRequest, NextResponse } from 'next/server';
import { logSystem } from '../../../../utils/logSystem';
import { db } from '../../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Email configuration
const ADMIN_EMAILS = ['info@gate33.com']; // List of admin emails to notify

async function sendEmail(to: string | string[], subject: string, message: string) {
  try {
    const { sendEmail: sendEmailService } = await import('../../../../utils/emailService');
    
    if (Array.isArray(to)) {
      for (const recipient of to) {
        await sendEmailService({
          to: recipient,
          subject,
          text: "You have unread messages in the Owners Portal.",
          html: message
        });
      }
    } else {
      await sendEmailService({
        to,
        subject,
        text: "You have unread messages in the Owners Portal.",
        html: message
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error sending email notification:", error);
    await logSystem.error(`Failed to send message notification email: ${error}`, { 
      service: 'email',
      error: String(error)
    });
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      unreadCount, 
      walletAddress, 
      recipientEmail, 
      isAdmin,
      timestamp 
    } = body;
    
    // Validate required fields
    if (isAdmin === undefined || unreadCount === undefined) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // If this is notification for an admin
    if (isAdmin) {
      // Format email for admin
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
          <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">🔔 Gate33 Alert - Unread Owner Messages</h2>
          
          <p style="font-size: 16px; color: #333;">You have ${unreadCount} unread message(s) from NFT owners in the Owners Portal.</p>
          
          <p style="font-size: 14px; color: #555;">Timestamp: ${new Date().toLocaleString()}</p>
          
          <p style="font-size: 14px; margin-top: 20px;">
            <a href="http://localhost:3000/owners" style="color: #FF6B00;">Access the Owners Portal</a> to view the messages.
          </p>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
            <p>This is an automated notification. Please do not reply.</p>
          </div>
        </div>
      `;
      
      // Send email to all admin emails
      const emailSent = await sendEmail(
        ADMIN_EMAILS,
        `Gate33 - ${unreadCount} Unread Owner Message${unreadCount > 1 ? 's' : ''}`,
        emailHtml
      );
      
      await logSystem.info('Admin notification sent for unread owner messages', {
        unreadCount,
        adminEmails: ADMIN_EMAILS,
        success: emailSent,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Admin notification sent successfully',
        emailSent
      });
    } 
    // If this is notification for an NFT owner
    else if (recipientEmail && walletAddress) {
      // Format email for NFT owner
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
          <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">🔔 Gate33 Alert - Unread Messages</h2>
          
          <p style="font-size: 16px; color: #333;">You have ${unreadCount} unread message(s) from Gate33 administrators in the Owners Portal.</p>
          
          <div style="background-color: #f9f9f9; border-left: 4px solid #FF6B00; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Your Wallet Address:</p>
            <p style="margin: 5px 0; font-family: monospace; word-break: break-all;">${walletAddress}</p>
          </div>
          
          <p style="font-size: 14px; color: #555;">Timestamp: ${new Date().toLocaleString()}</p>
          
          <p style="font-size: 14px; margin-top: 20px;">
            <a href="http://localhost:3000/owners" style="color: #FF6B00;">Access the Owners Portal</a> to view the messages.
          </p>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
            <p>This is an automated notification. Please do not reply.</p>
            <p>To disable these notifications, visit the Owners Portal and update your email preferences.</p>
          </div>
        </div>
      `;
      
      // Send email to NFT owner
      const emailSent = await sendEmail(
        recipientEmail,
        `Gate33 - ${unreadCount} Unread Message${unreadCount > 1 ? 's' : ''}`,
        emailHtml
      );
      
      await logSystem.info('Owner notification sent for unread messages', {
        unreadCount,
        walletAddress,
        recipientEmail: recipientEmail.substring(0, 3) + '***',
        success: emailSent,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Owner notification sent successfully',
        emailSent
      });
    }
    
    // If we get here, we're missing required fields
    return NextResponse.json(
      { success: false, message: 'Invalid request format' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error in message notification API:', error);
    
    await logSystem.error('Error in message notification API', {
      error: String(error),
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}