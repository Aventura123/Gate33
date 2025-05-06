import nodemailer, { Transporter } from 'nodemailer';

// Email transport configuration
// These settings should be adjusted for your email provider
export const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Sends an email using the configured settings
 * @param to Recipient email
 * @param subject Email subject
 * @param text Email body in plain text
 * @param html Email body in HTML (optional)
 * @returns Promise with the sending result
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from = process.env.EMAIL_FROM || 'noreply@gate33.com',
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    // Verify if there are email settings
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Email settings not defined');
      return {
        success: false,
        message: 'Email settings not defined',
      };
    }

    // Send the email
    const info = await emailTransporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      message: `Email sent successfully: ${info.messageId}`,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: `Error sending email: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Sends a notification to support from a contact form
 */
export async function sendContactFormEmail({
  name,
  email,
  message,
  subject = 'New message from contact form',
  supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
}: {
  name: string;
  email: string;
  message: string;
  subject?: string;
  supportEmail?: string;
}): Promise<{ success: boolean; message: string }> {
  const text = `
Name: ${name}
Email: ${email}

Message:
${message}
  `;

  const html = `
<h2>New message from contact form</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<h3>Message:</h3>
<p>${message.replace(/\n/g, '<br>')}</p>
  `;

  return sendEmail({
    to: supportEmail!,
    subject,
    text,
    html,
  });
}

/**
 * Sends a confirmation to the user who submitted the contact form
 */
export async function sendContactFormConfirmation({
  name,
  email,
  subject = 'We received your message - Gate33',
}: {
  name: string;
  email: string;
  subject?: string;
}): Promise<{ success: boolean; message: string }> {
  const text = `Hello ${name},\n\nWe have received your message! Thank you for contacting Gate33.\n\nOur team will review and respond within 24/48 hours.\n\nIf you did not send this message, please ignore this email.\n\nBest regards,\nGate33 Team`;

  const html = `
    <h2>Hello ${name},</h2>
    <p>We have received your message! Thank you for contacting <strong>Gate33</strong>.</p>
    <p>Our team will review and respond within <strong>24/48 hours</strong>.</p>
    <p style="font-size:12px;color:#888;">If you did not send this message, please ignore this email.</p>
    <br>
    <p>Best regards,<br><strong>Gate33 Team</strong></p>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: 'noreply@gate33.net',
  });
}

/**
 * Sends a password reset email with a unique link
 */
export async function sendResetPasswordEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://gate33.net"}/reset-password?token=${token}`;
  const subject = "Password Reset - Gate33";
  const text = `You requested a password reset for your Gate33 account.\n\nClick the link below to create a new password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
      <h2 style="color: #FF6B00;">Password Reset</h2>
      <p>You requested a password reset for your Gate33 account.</p>
      <p><a href="${resetUrl}" style="color: #FF6B00; font-weight: bold;">Click here to reset your password</a></p>
      <p>Or copy and paste this link in your browser:<br/><span style="word-break: break-all;">${resetUrl}</span></p>
      <br/>
      <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
      <p style="font-size: 12px; color: #888;">This is an automated email, please do not reply.</p>
    </div>
  `;
  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: 'noreply@gate33.net',
  });
}