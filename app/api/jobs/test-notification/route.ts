import { NextRequest, NextResponse } from 'next/server';
import { sendEmail as sendEmailService } from '../../../../utils/emailService';

/**
 * Test endpoint to send application notification emails to info@gate33.net.
 * This simulates the job application notification process.
 */
export async function POST(request: NextRequest) {
  try {
    // Create test data that mimics a job application
    const testApplicationData = {
      jobId: "test-job-id",
      jobTitle: "Test Developer Position",
      companyId: "test-company-id",
      companyName: "Test Company",
      seekerId: "test-seeker-id",
      seekerName: "Test Applicant",
      seekerEmail: "test@example.com",
      seekerPhone: "123-456-7890",
      phoneCountry: "+1-US",
      resumeLetter: "This is a test cover letter for the job application notification system test.",
      cvUrl: "https://gate33.net/fake-resume.pdf",
      videoUrl: "https://vimeo.com/test",
      linkedinProfile: "https://linkedin.com/in/test-user",
      githubProfile: "https://github.com/test-user",
      telegramHandle: "@testuser",
      portfolioUrl: "https://test-user.com",
      yearsOfExperience: "5",
      web3Experience: "3 years in blockchain development",
      currentSalary: "$90,000",
      screeningAnswers: ["Test answer 1", "Test answer 2", "Test answer 3"],
      screeningQuestions: ["What is your experience with React?", "Describe your blockchain knowledge.", "Why do you want to work with us?"]
    };

    // Prepare company email HTML - similar to the real application notification route
    const emailHtmlCompany = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
        <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">TEST NOTIFICATION - New Application Received for: ${testApplicationData.jobTitle}</h2>
        
        <div style="margin-bottom: 20px; background-color: #fff7f2; padding: 10px; border-radius: 5px;">
          <p style="color: #FF6B00; font-weight: bold;">⚠️ This is a test notification. No actual application was submitted.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Candidate Information:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Name:</strong> ${testApplicationData.seekerName}</li>
            <li><strong>Email:</strong> ${testApplicationData.seekerEmail}</li>
            <li><strong>Phone:</strong> ${testApplicationData.phoneCountry} ${testApplicationData.seekerPhone}</li>
            <li><strong>Years of Experience:</strong> ${testApplicationData.yearsOfExperience}</li>
            <li><strong>Web3 Experience:</strong> ${testApplicationData.web3Experience || 'Not provided'}</li>
            <li><strong>Current Salary:</strong> ${testApplicationData.currentSalary || 'Not provided'}</li>
          </ul>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Social Profiles and Portfolio:</h3>
          <ul style="list-style: none; padding-left: 0;">
            ${testApplicationData.linkedinProfile ? `<li><strong>LinkedIn:</strong> <a href="${testApplicationData.linkedinProfile}" target="_blank">${testApplicationData.linkedinProfile}</a></li>` : ''}
            ${testApplicationData.githubProfile ? `<li><strong>GitHub:</strong> <a href="${testApplicationData.githubProfile}" target="_blank">${testApplicationData.githubProfile}</a></li>` : ''}
            ${testApplicationData.telegramHandle ? `<li><strong>Telegram:</strong> ${testApplicationData.telegramHandle}</li>` : ''}
            ${testApplicationData.portfolioUrl ? `<li><strong>Portfolio:</strong> <a href="${testApplicationData.portfolioUrl}" target="_blank">${testApplicationData.portfolioUrl}</a></li>` : ''}
          </ul>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Cover Letter:</h3>
          <p style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #FF6B00;">${testApplicationData.resumeLetter.replace(/\n/g, '<br>')}</p>
        </div>
        
        ${testApplicationData.cvUrl ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Attached CV:</h3>
          <p><a href="${testApplicationData.cvUrl}" target="_blank" style="color: #FF6B00; font-weight: bold;">Download CV</a></p>
        </div>
        ` : ''}
        
        ${testApplicationData.videoUrl ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Introduction Video:</h3>
          <p><a href="${testApplicationData.videoUrl}" target="_blank" style="color: #FF6B00; font-weight: bold;">Watch video</a></p>
        </div>
        ` : ''}
        
        ${testApplicationData.screeningQuestions && testApplicationData.screeningQuestions.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Screening Questions & Answers:</h3>
          <ul style="background-color: #f9f9f9; padding: 15px;">
            ${testApplicationData.screeningQuestions.map((question: string, index: number) => `
              <li style="margin-bottom: 10px;">
                <p style="font-weight: bold; margin-bottom: 5px;">${question}</p>
                <p style="color: #444;">${testApplicationData.screeningAnswers[index] || 'No answer'}</p>
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #777; font-size: 14px;">
          <p>This is a test email from the Gate33 notification system. You are receiving this because a test was requested.</p>
          <p>Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
    
    // Send test email to info@gate33.net
    const emailResult = await sendEmailService({
      to: 'info@gate33.net',
      subject: '[TEST] New application received: Test Developer Position',
      text: "This is a test email to verify job application notifications.",
      html: emailHtmlCompany
    });
    
    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: "Test notification email sent successfully to info@gate33.net",
        details: emailResult.message
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Failed to send test notification email",
        error: emailResult.message
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Error sending test application notification:", error);
    return NextResponse.json({
      success: false,
      message: "Error processing test notification",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
