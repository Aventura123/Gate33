import { getFirestore } from "firebase-admin/firestore";
import axios from 'axios';
import { SocialMediaJob } from "./socialMediaPromotionScheduler";

/**
 * Alternative Social Media Posting Options
 * When LinkedIn API fails or has limitations
 */

// Option 1: Webhook/Zapier Integration
export async function postViaWebhook(job: SocialMediaJob): Promise<boolean> {
  try {
    const WEBHOOK_URL = process.env.SOCIAL_MEDIA_WEBHOOK_URL;
    
    if (!WEBHOOK_URL) {
      console.log('[AltSocialMedia] Webhook URL not configured, skipping');
      return false;
    }

    const payload = {
      platform: 'linkedin',
      content: job.shortDescription || `🚀 New job: ${job.title} at ${job.companyName}`,
      jobId: job.id,
      jobUrl: `https://gate33.net/jobs/${job.id}`,
      mediaUrl: job.mediaUrl,
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.WEBHOOK_API_KEY || ''
      },
      timeout: 10000
    });

    if (response.status === 200) {
      console.log('[AltSocialMedia] Job posted via webhook successfully');
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('[AltSocialMedia] Webhook posting failed:', error.message);
    return false;
  }
}

// Option 2: Email Notification to Admin for Manual Posting
export async function sendEmailNotificationForPosting(job: SocialMediaJob): Promise<boolean> {
  try {
    const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'https://api.emailjs.com/api/v1.0/email/send';
    const ADMIN_EMAIL = process.env.SUPPORT_EMAIL || 'info@gate33.net';

    const emailContent = {
      to: ADMIN_EMAIL,
      subject: `🚀 New Job Ready for Social Media: ${job.title}`,
      html: `
        <h2>New Job Ready for Social Media Promotion</h2>
        <p><strong>Job:</strong> ${job.title}</p>
        <p><strong>Company:</strong> ${job.companyName}</p>
        <p><strong>Location:</strong> ${job.location || 'Remote'}</p>
        <p><strong>Salary:</strong> ${job.salary || 'Not specified'}</p>
        
        <h3>Suggested Post Content:</h3>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
          ${job.shortDescription || `🚀 New job: ${job.title} at ${job.companyName}!\nCheck it out and apply now!`}
        </div>
        
        <p><strong>Job URL:</strong> <a href="https://gate33.net/jobs/${job.id}">https://gate33.net/jobs/${job.id}</a></p>
        
        ${job.mediaUrl ? `<p><strong>Media:</strong> <a href="${job.mediaUrl}">View Image</a></p>` : ''}
        
        <p><em>This email was generated automatically by the Gate33 social media promotion system.</em></p>
      `
    };

    // You can implement your preferred email service here
    console.log('[AltSocialMedia] Email notification prepared for manual posting');
    console.log('[AltSocialMedia] Email content:', emailContent);
    
    // For now, we'll log this to the system
    const db = getFirestore();
    await db.collection('socialMediaQueue').add({
      jobId: job.id,
      type: 'manual_notification',
      content: emailContent,
      status: 'pending',
      createdAt: new Date().toISOString(),
      jobData: job
    });

    return true;
  } catch (error: any) {
    console.error('[AltSocialMedia] Email notification failed:', error.message);
    return false;
  }
}

// Option 3: Discord/Slack Notification
export async function postToDiscord(job: SocialMediaJob): Promise<boolean> {
  try {
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    
    if (!DISCORD_WEBHOOK_URL) {
      console.log('[AltSocialMedia] Discord webhook not configured');
      return false;
    }

    const embed = {
      title: `🚀 New Job: ${job.title}`,
      description: job.shortDescription || `New opportunity at ${job.companyName}`,
      color: 0xF97316, // Gate33 orange color
      fields: [
        {
          name: 'Company',
          value: job.companyName || 'Not specified',
          inline: true
        },
        {
          name: 'Location',
          value: job.location || 'Remote',
          inline: true
        },
        {
          name: 'Salary',
          value: job.salary || 'Not specified',
          inline: true
        }
      ],
      url: `https://gate33.net/jobs/${job.id}`,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Gate33 Job Portal'
      }
    };

    if (job.mediaUrl) {
      embed['image'] = { url: job.mediaUrl };
    }

    const response = await axios.post(DISCORD_WEBHOOK_URL, {
      embeds: [embed]
    });

    if (response.status === 204) {
      console.log('[AltSocialMedia] Job posted to Discord successfully');
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('[AltSocialMedia] Discord posting failed:', error.message);
    return false;
  }
}

// Option 4: Social Media Queue for Manual Processing
export async function addToSocialMediaQueue(job: SocialMediaJob): Promise<boolean> {
  try {
    const db = getFirestore();
    
    const queueItem = {
      jobId: job.id,
      jobTitle: job.title,
      companyName: job.companyName,
      content: job.shortDescription || `🚀 New job: ${job.title} at ${job.companyName}!\nCheck it out and apply now!\nhttps://gate33.net/jobs/${job.id}`,
      mediaUrl: job.mediaUrl,
      platforms: ['linkedin', 'facebook', 'twitter'],
      status: 'pending',
      priority: 'normal',
      createdAt: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      attempts: 0,
      maxAttempts: 3
    };

    await db.collection('socialMediaQueue').add(queueItem);
    console.log('[AltSocialMedia] Job added to social media queue for manual processing');
    
    return true;
  } catch (error: any) {
    console.error('[AltSocialMedia] Failed to add to social media queue:', error.message);
    return false;
  }
}

// Main alternative posting function
export async function alternativeSocialMediaPost(job: SocialMediaJob): Promise<boolean> {
  console.log('[AltSocialMedia] Attempting alternative social media posting methods');
  
  let successCount = 0;
  
  // Try webhook first (if configured)
  if (await postViaWebhook(job)) successCount++;
  
  // Try Discord (if configured)
  if (await postToDiscord(job)) successCount++;
  
  // Always add to queue for manual processing
  if (await addToSocialMediaQueue(job)) successCount++;
  
  // Send email notification to admin
  if (await sendEmailNotificationForPosting(job)) successCount++;
  
  console.log(`[AltSocialMedia] Alternative posting completed with ${successCount} successful methods`);
  
  // Consider successful if at least one method worked
  return successCount > 0;
}
