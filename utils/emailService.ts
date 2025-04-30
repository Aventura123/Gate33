import nodemailer, { Transporter } from 'nodemailer';

// Configuração do transporte de email
// Estas configurações devem ser ajustadas para seu provedor de email
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
  const text = `
Hello ${name},

We have received your message and thank you for contacting us!

Our team will review your message and respond as soon as possible.

Best regards,
Gate33 Team
  `;

  const html = `
<h2>Hello ${name},</h2>
<p>We have received your message and thank you for contacting us!</p>
<p>Our team will review your message and respond as soon as possible.</p>
<br>
<p>Best regards,<br>
<strong>Gate33 Team</strong></p>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}