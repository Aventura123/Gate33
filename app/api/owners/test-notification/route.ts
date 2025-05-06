import { NextRequest, NextResponse } from 'next/server';
import { logSystem } from '../../../../utils/logSystem';

async function sendEmail(to: string, subject: string, message: string) {
  try {
    const { sendEmail: sendEmailService } = await import('../../../../utils/emailService');
    
    await sendEmailService({
      to,
      subject,
      text: "Your email notifications for the Gate33 Owners Portal have been successfully set up.",
      html: message
    });
    
    return true;
  } catch (error) {
    console.error("Error sending test notification email:", error);
    await logSystem.error(`Failed to send test notification email: ${error}`, { 
      service: 'email',
      error: String(error)
    });
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, walletAddress } = body;
    
    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Format email for confirmation
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
        <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">✅ Email Notifications Enabled</h2>
        
        <p style="font-size: 16px; color: #333;">Your email notifications for the Gate33 Owners Portal have been successfully set up.</p>
        
        ${walletAddress ? `
        <div style="background-color: #f9f9f9; border-left: 4px solid #FF6B00; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">Your Wallet Address:</p>
          <p style="margin: 5px 0; font-family: monospace; word-break: break-all;">${walletAddress}</p>
        </div>
        ` : ''}
        
        <p style="font-size: 14px; margin-top: 20px;">
          You will now receive notifications when there are unread messages from administrators in the Owners Portal.
        </p>
        
        <p style="font-size: 14px; margin-top: 20px;">
          <a href="http://localhost:3000/owners" style="color: #FF6B00;">Access the Owners Portal</a> at any time to update your preferences.
        </p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
          <p>This is a confirmation email. If you did not request this change, please contact us immediately.</p>
        </div>
      </div>
    `;
    
    // Send confirmation email
    const emailSent = await sendEmail(
      email,
      'Gate33 - Email Notifications Enabled',
      emailHtml
    );
    
    await logSystem.info('Test notification email sent', {
      email: email.substring(0, 3) + '***' + email.substring(email.indexOf('@')),
      walletAddress: walletAddress ? walletAddress : 'not provided',
      success: emailSent,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent successfully',
      emailSent
    });
    
  } catch (error) {
    console.error('Error in test notification API:', error);
    
    await logSystem.error('Error in test notification API', {
      error: String(error),
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}