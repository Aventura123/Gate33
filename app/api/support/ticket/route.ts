import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/utils/emailService';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      ticketId,
      seekerEmail,
      companyEmail,
      area,
      subject,
      description,
      attachmentUrl,
      createdAt
    } = data;

    // Permitir tanto seekerEmail quanto companyEmail
    const recipientEmail = seekerEmail || companyEmail;
    if (!recipientEmail || !ticketId || !area || !subject || !description) {
      return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
    }

    // Montar corpo do e-mail (genérico para seeker/company)
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
        <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">🎫 Gate33 Support Ticket Confirmation</h2>
        <p style="font-size: 16px; color: #333;">Your support ticket has been received and is being processed. Here are the details:</p>
        <ul style="font-size: 15px; color: #222; list-style: none; padding: 0;">
          <li><strong>Ticket Number:</strong> ${ticketId}</li>
          <li><strong>Area:</strong> ${area}</li>
          <li><strong>Subject:</strong> ${subject}</li>
          <li><strong>Description:</strong> ${description}</li>
          <li><strong>Attachment:</strong> ${attachmentUrl ? `<a href='${attachmentUrl}' target='_blank'>View Attachment</a>` : 'None'}</li>
          <li><strong>Created At:</strong> ${createdAt ? new Date(createdAt).toLocaleString() : '-'}</li>
        </ul>
        <p style="font-size: 14px; color: #555; margin-top: 20px;">Our support team will contact you soon. We usually respond within 24 to 48 hours. Please do not reply to this email.</p>
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #777;">
          <p>This is an automated message from Gate33 Support &lt;noreply@gate33.net&gt;.</p>
        </div>
      </div>
    `;

    // Enviar para o usuário (seeker ou company) e cópia para info@gate33.net
    await sendEmail({
      to: `${recipientEmail},info@gate33.net`,
      subject: `Gate33 Support Ticket Confirmation (#${ticketId})`,
      html: emailHtml,
      text: `Your support ticket has been received. Ticket Number: ${ticketId}\nArea: ${area}\nSubject: ${subject}\nDescription: ${description}\nAttachment: ${attachmentUrl || 'None'}\nCreated At: ${createdAt}\n\nOur support team will contact you soon. We usually respond within 24 to 48 hours.`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending support ticket confirmation:', error);
    return NextResponse.json({ success: false, message: 'Failed to send confirmation email.' }, { status: 500 });
  }
}
