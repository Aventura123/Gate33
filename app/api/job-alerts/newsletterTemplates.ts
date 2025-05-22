// Newsletter template utilities for job alerts

export function generateUnsubscribeLink(email: string): string {
  // Use your production domain here
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gate33.net";
  return `${baseUrl}/api/job-alerts/unsubscribe?email=${encodeURIComponent(email)}`;
}

export function jobAlertNewsletterHtml({ jobs, email, intro }:{ jobs: any[], email: string, intro?: string }): string {
  const unsubscribeUrl = generateUnsubscribeLink(email);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #18181b; color: #fff; border-radius: 8px; overflow: hidden;">
      <div style="background: #FF6B00; padding: 24px 24px 12px 24px;">
        <h1 style="margin: 0; color: #fff; font-size: 2rem;">🚀 New Blockchain Jobs for You</h1>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 1.1rem; color: #ffb97a;">${intro || 'Highlighted jobs this week:'}</p>
        <ul style="padding: 0; list-style: none;">
          ${jobs.map(job => {
            const logo = job.companyPhotoURL || job.photoURL || 'https://gate33.net/logo.png';
            const jobUrl = `https://gate33.net/jobs/${job.id}`;
            return `
              <li style="margin-bottom: 12px; padding: 0;">
                <a href="${jobUrl}" target="_blank" style="display: flex; align-items: center; text-decoration: none; background: #23232a; border-radius: 6px; padding: 12px 16px; color: #fff; max-width: 520px; margin: 0 auto;">
                  <img src='${logo}' alt='Logo' style='width:32px;height:32px;margin-right:14px;border-radius:4px;background:#18181b;flex-shrink:0;'>
                  <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 1.08rem; font-weight: bold; color: #FF6B00;">${job.title}</span>
                    <span style="font-size: 0.98rem; color: #ffb97a;">${job.company}</span>
                  </div>
                </a>
              </li>
            `;
          }).join('')}
        </ul>
        <p style="font-size: 0.95rem; color: #aaa; margin-top: 32px;">You are receiving this email because you subscribed to job alerts at Gate33.<br>
        If you no longer wish to receive these emails, <a href="${unsubscribeUrl}" style="color: #FF6B00; text-decoration: underline;">unsubscribe here</a>.</p>
      </div>
    </div>
  `;
}
