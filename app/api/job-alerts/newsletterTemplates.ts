// Newsletter template utilities for job alerts

export function generateUnsubscribeLink(email: string): string {
  // Use your production domain here
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gate33.net";
  return `${baseUrl}/api/job-alerts/unsubscribe?email=${encodeURIComponent(email)}`;
}

// Define Partner interface
interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  website: string;
}

export function jobAlertNewsletterHtml({ jobs, partners = [], email, intro }:{ jobs: any[], partners?: Partner[], email: string, intro?: string }): string {
  const unsubscribeUrl = generateUnsubscribeLink(email);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Gate33 - Blockchain Jobs Newsletter</title>    <style type="text/css">
        /* Base styles */
        body, html {
          margin: 0;
          padding: 0;
          width: 100% !important;
          background-color: #000000;
        }
        .ReadMsgBody {width: 100%;}
        .ExternalClass {width: 100%;}
        
        /* Media queries for responsiveness */
        @media screen and (max-width: 525px) {
          .container {
            width: 100% !important;
          }
          .mobile-padding {
            padding-left: 15px !important;
            padding-right: 15px !important;
          }
          .mobile-header {
            font-size: 1.5rem !important;
          }
          .job-item {
            padding: 10px !important;
          }
          .job-title {
            font-size: 1rem !important;
          }
          .job-company {
            font-size: 0.9rem !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #000000;">
      <!-- Main container - max width and centered -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" bgcolor="#000000">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="container" style="max-width: 600px; margin: 0 auto; background-color: rgba(0, 0, 0, 0.3); border: 1px solid #333; border-radius: 8px; overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td align="left" bgcolor="#FF6B00" class="mobile-padding" style="padding: 24px 24px 12px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                  <h1 class="mobile-header" style="margin: 0; color: #fff; font-size: 2rem; font-family: Arial, sans-serif;">🚀 New Blockchain Jobs For You</h1>
                </td>
              </tr>                <!-- Content -->
              <tr>                <td align="left" class="mobile-padding" style="font-family: Arial, sans-serif; padding: 24px;">
                  ${intro ? intro : `<p style="font-size: 1.1rem; color: #FF6B00; margin-top: 0;">Highlighted jobs this week:</p>`}
                  
                  <p style="font-size: 1.1rem; color: #FF6B00; margin-top: 24px; margin-bottom: 12px;">Highlighted Jobs:</p>
                  
                  <!-- Jobs list -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    ${jobs.map(job => {
                      const logo = job.companyPhotoURL || job.photoURL || 'https://gate33.net/logo.png';
                      const jobUrl = `https://gate33.net/jobs/${job.id}`;
                      return `
                        <tr>
                          <td style="padding-bottom: 12px;">
                            <a href="${jobUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block;">
                              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="job-item" style="background: rgba(0,0,0,0.4); border: 1px solid #333; border-radius: 8px; max-width: 520px; margin: 0 auto; transition: all 0.3s;">
                                <tr>
                                  <td style="padding: 16px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                      <tr>
                                        <td width="40">
                                          <img src="${logo}" alt="Logo" width="40" height="40" style="display: block; border-radius: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444;">
                                        </td>
                                        <td width="14" style="font-size: 1px;">&nbsp;</td>
                                        <td>
                                          <span class="job-title" style="display: block; font-size: 1.08rem; font-weight: bold; color: #FF6B00; font-family: Arial, sans-serif;">${job.title}</span>
                                          <span class="job-company" style="display: block; font-size: 0.98rem; color: #fff; font-family: Arial, sans-serif;">${job.company}</span>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </a>
                          </td>
                        </tr>
                      `;
                    }).join('')}</table>                  ${partners.length > 0 ? `
                  <!-- Partners Section -->
                  <div style="margin-top: 36px; border-top: 1px solid rgba(255, 107, 0, 0.3); padding-top: 24px;">
                    <p style="font-size: 1rem; color: #FF6B00; text-align: center; margin-bottom: 20px; font-family: Arial, sans-serif; font-weight: bold;">Backed by</p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <table border="0" cellpadding="0" cellspacing="0" style="max-width: 500px;">
                            <tr>
                              <td>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                  <tr style="display: flex; flex-wrap: wrap; justify-content: center;">
                                    ${partners.map(partner => {
                                      return `
                                        <td style="display: inline-block; padding: 10px; width: 80px; text-align: center;">
                                          <a href="${partner.website || '#'}" target="_blank" style="text-decoration: none; display: block;">
                                            <div style="width: 64px; height: 64px; margin: 0 auto 8px; border-radius: 8px; background: rgba(0,0,0,0.4); border: 1px solid #333; padding: 6px; display: flex; align-items: center; justify-content: center;">
                                              <img src="${partner.logoUrl}" alt="${partner.name}" style="max-width: 100%; max-height: 100%; display: block;">
                                            </div>
                                            <span style="display: block; color: #fff; font-size: 0.8rem; font-family: Arial, sans-serif; text-align: center;">${partner.name}</span>
                                          </a>
                                        </td>
                                      `;
                                    }).join('')}
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </div>
                  ` : ''}
                  
                  <!-- Footer -->
                  <p style="font-size: 0.95rem; color: #aaa; margin-top: 32px; font-family: Arial, sans-serif;">
                    You are receiving this email because you subscribed to job alerts at Gate33.<br>
                    If you no longer wish to receive these emails, <a href="${unsubscribeUrl}" style="color: #FF6B00; text-decoration: underline;">unsubscribe here</a>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
