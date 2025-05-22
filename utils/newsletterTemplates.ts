// Newsletter template utilities for job alerts

export function generateUnsubscribeLink(email: string): string {
  // Use your production domain here
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gate33.net";
  return `${baseUrl}/api/job-alerts/unsubscribe?email=${encodeURIComponent(email)}`;
}

export function jobAlertNewsletterHtml({ jobs, email }:{ jobs: any[], email: string }): string {
  const unsubscribeUrl = generateUnsubscribeLink(email);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #18181b; color: #fff; border-radius: 8px; overflow: hidden;">
      <div style="background: #FF6B00; padding: 24px 24px 12px 24px;">
        <h1 style="margin: 0; color: #fff; font-size: 2rem;">🚀 New Blockchain Jobs for You</h1>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 1.1rem; color: #ffb97a;">Highlighted jobs this week:</p>
        <ul style="padding: 0; list-style: none;">
          ${jobs.map(job => `
            <li style="margin-bottom: 24px; border-bottom: 1px solid #333; padding-bottom: 16px;">
              <h2 style="margin: 0 0 8px 0; color: #FF6B00; font-size: 1.2rem;">${job.jobTitle}</h2>
              <div style="color: #ffb97a; font-weight: bold;">${job.companyName}</div>
              <div style="color: #fff; margin: 6px 0 8px 0;">${job.location} | ${job.jobType}</div>
              <div style="color: #fff; font-size: 0.95rem; margin-bottom: 8px;">${job.jobDescription?.slice(0, 180) || ''}${job.jobDescription && job.jobDescription.length > 180 ? '...' : ''}</div>
              <a href="${job.applyLink ? job.applyLink : `https://gate33.net/jobs/apply/${job.id}` }" style="display: inline-block; background: #FF6B00; color: #fff; padding: 8px 18px; border-radius: 4px; text-decoration: none; font-weight: bold;">Apply Now</a>
            </li>
          `).join('')}
        </ul>
        <p style="font-size: 0.95rem; color: #aaa; margin-top: 32px;">You are receiving this email because you subscribed to job alerts at Gate33.<br>
        If you no longer wish to receive these emails, <a href="${unsubscribeUrl}" style="color: #FF6B00; text-decoration: underline;">unsubscribe here</a>.</p>
      </div>
    </div>
  `;
}
