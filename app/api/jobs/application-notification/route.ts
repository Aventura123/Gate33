import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { createCompanyNotification } from '../../../../lib/notifications';

// Function to send emails using the existing email service
async function sendEmail(to: string | string[], subject: string, message: string) {
  try {
    const { sendEmail: sendEmailService } = await import('../../../../utils/emailService');
    
    // If it's an array, send to each recipient
    if (Array.isArray(to)) {
      for (const recipient of to) {
        await sendEmailService({
          to: recipient,
          subject,
          text: "A new job application has been received.",
          html: message
        });
      }
    } else {
      await sendEmailService({
        to,
        subject,
        text: "A new job application has been received.",
        html: message
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error sending application notification email:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      jobId,
      jobTitle,
      companyId,
      companyName,
      seekerId,
      seekerName,
      seekerEmail,
      seekerPhone,
      phoneCountry,
      resumeLetter,
      cvUrl,
      videoUrl,
      linkedinProfile,
      githubProfile,
      telegramHandle,
      portfolioUrl,
      yearsOfExperience,
      web3Experience,
      currentSalary,
      screeningAnswers,
      screeningQuestions
    } = body;
    
    // Validate required fields
    if (!jobId || !companyId || !seekerId || !seekerEmail) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get company email
    const companyRef = doc(db, "companies", companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      );
    }
    
    const companyData = companyDoc.data();
    const companyEmail = companyData.email;
    
    if (!companyEmail) {
      return NextResponse.json(
        { success: false, message: 'Company email not found' },
        { status: 400 }
      );
    }
    
    // Prepare company email HTML
    const emailHtmlCompany = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
        <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">New Application Received for: ${jobTitle}</h2>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Candidate Information:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Name:</strong> ${seekerName}</li>
            <li><strong>Email:</strong> ${seekerEmail}</li>
            <li><strong>Phone:</strong> ${phoneCountry} ${seekerPhone}</li>
            <li><strong>Years of Experience:</strong> ${yearsOfExperience}</li>
            <li><strong>Web3 Experience:</strong> ${web3Experience || 'Not provided'}</li>
            <li><strong>Current Salary:</strong> ${currentSalary || 'Not provided'}</li>
          </ul>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Social Profiles and Portfolio:</h3>
          <ul style="list-style: none; padding-left: 0;">
            ${linkedinProfile ? `<li><strong>LinkedIn:</strong> <a href="${linkedinProfile}" target="_blank">${linkedinProfile}</a></li>` : ''}
            ${githubProfile ? `<li><strong>GitHub:</strong> <a href="${githubProfile}" target="_blank">${githubProfile}</a></li>` : ''}
            ${telegramHandle ? `<li><strong>Telegram:</strong> ${telegramHandle}</li>` : ''}
            ${portfolioUrl ? `<li><strong>Portfolio:</strong> <a href="${portfolioUrl}" target="_blank">${portfolioUrl}</a></li>` : ''}
          </ul>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Cover Letter:</h3>
          <p style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #FF6B00;">${resumeLetter.replace(/\n/g, '<br>')}</p>
        </div>
        
        ${cvUrl ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Attached CV:</h3>
          <p><a href="${cvUrl}" target="_blank" style="color: #FF6B00; font-weight: bold;">Download CV</a></p>
        </div>
        ` : ''}
        
        ${videoUrl ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Introduction Video:</h3>
          <p><a href="${videoUrl}" target="_blank" style="color: #FF6B00; font-weight: bold;">Watch video</a></p>
        </div>
        ` : ''}
        
        ${screeningQuestions && screeningQuestions.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Screening Questions & Answers:</h3>
          <ul style="background-color: #f9f9f9; padding: 15px;">
            ${screeningQuestions.map((question: string, index: number) => `
              <li style="margin-bottom: 10px;">
                <p style="font-weight: bold; margin-bottom: 5px;">${question}</p>
                <p style="color: #444;">${screeningAnswers[index] || 'No answer'}</p>
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #777; font-size: 14px;">
          <p>This is an automatic email from the Gate33 system. To access all applications, log in to your dashboard.</p>
        </div>
      </div>
    `;
    
    // Prepare candidate email HTML
    const emailHtmlCandidate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
        <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">Your application was sent successfully!</h2>
        
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Thank you for applying to the position <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.
        </p>
        
        <div style="background-color: #f9f9f9; border-left: 4px solid #FF6B00; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0;"><strong>Application details:</strong></p>
          <ul>
            <li>Position: ${jobTitle}</li>
            <li>Company: ${companyName}</li>
            <li>Date: ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        
        <p style="color: #333;">The company will review your application and contact you if your profile matches the job requirements.</p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #777; font-size: 14px;">
          <p>This is an automatic email from the Gate33 system. To track your applications, log in to your dashboard.</p>
        </div>
      </div>
    `;
    
    // Send email to company
    const companyEmailSent = await sendEmail(
      companyEmail,
      `New application received: ${jobTitle} - ${seekerName}`,
      emailHtmlCompany
    );
      // Send copy to candidate
    const candidateEmailSent = await sendEmail(
      seekerEmail,
      `Your application for: ${jobTitle} - ${companyName}`,
      emailHtmlCandidate
    );

    // Create notification for company
    await createCompanyNotification({
      companyId,
      title: "New application",
      body: `${seekerName} applied for the job: ${jobTitle}`,
      type: "job_application",
      read: false,
      data: {
        jobId,
        seekerId,
        seekerName
      }
    });
    
  } catch (error) {
    console.error("Error processing application:", error);
    return NextResponse.json(
      { success: false, message: 'Error processing application' },
      { status: 500 }
    );
  }
}
