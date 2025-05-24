import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import axios from 'axios';
import { logSystemActivity } from "./logSystem";

// Telegram and LinkedIn configuration - Using Firebase Functions config
// Moved config loading inside functions to avoid initialization timeouts

/**
 * Gets the LinkedIn person ID using the API
 * @param token LinkedIn API access token
 */
async function getLinkedInPersonId(token: string): Promise<string | null> {
  try {
    const response = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.id ? response.data.id : null;
  } catch (err: any) {
    if (err && err.response && err.response.data) {
      console.error('[SocialMedia] Error fetching LinkedIn person ID:', err.response.data);
    } else {
      console.error('[SocialMedia] Error fetching LinkedIn person ID:', err);
    }
    return null;
  }
}

/**
 * Posts a job on LinkedIn using the official API
 * @param job Job to be posted
 */
async function postToLinkedIn(job: SocialMediaJob): Promise<boolean> {
  try {
    // Use environment variables for Firebase Functions v2
    const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!job.title || !job.companyName) {
      console.error(`[SocialMedia] Cannot post job ${job.id} to LinkedIn: Missing title or companyName`);
      return false;
    }
    // Use custom message if present, else build default
    const postText = job.shortDescription ||
      `🚀 New job: ${job.title}\nCompany: ${job.companyName}` +
      (job.location ? `\nLocation: ${job.location}` : '') +
      (job.salary ? `\nSalary: ${job.salary}` : '') +
      `\n\nSee details: https://gate33.io/jobs/${job.id}`;
    const hasMedia = !!job.mediaUrl;

    // Fetch personId dynamically
    const personId = await getLinkedInPersonId(LINKEDIN_ACCESS_TOKEN!);
    if (!personId) {
      console.error('[SocialMedia] Could not fetch LinkedIn person ID.');
      return false;
    }

    // Build the payload for LinkedIn (personal profile)
    const payload: any = {
      author: `urn:li:person:${personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: postText
          },
          shareMediaCategory: hasMedia ? 'IMAGE' : 'NONE',
          ...(hasMedia ? {
            media: [{ status: 'READY', originalUrl: job.mediaUrl }]
          } : {})
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };
    // Log token status (not the actual token)
    console.log(`[SocialMedia] LinkedIn token exists: ${!!LINKEDIN_ACCESS_TOKEN}`);
    console.log(`[SocialMedia] LinkedIn token length: ${LINKEDIN_ACCESS_TOKEN ? LINKEDIN_ACCESS_TOKEN.length : 0}`);
    // Make the POST to LinkedIn API
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        }
      }
    );
    if (response.status === 201) {
      console.log(`[SocialMedia] Job "${job.title}" successfully posted to LinkedIn`);
      return true;
    } else {
      console.error(`[SocialMedia] Failed to post job to LinkedIn:`, response.data);
      return false;
    }
  } catch (error: any) {
    if (error?.response?.data) {
      console.error(`[SocialMedia] Error posting to LinkedIn:`, error.response.data);
    } else {
      console.error(`[SocialMedia] Error posting to LinkedIn:`, error);
    }
    return false;
  }
}

/**
 * Sends a message to the Telegram channel
 * @param job The job to be posted
 * @returns boolean indicating success or failure
 */
async function postToTelegram(job: SocialMediaJob): Promise<boolean> {
  try {
    // Use environment variables for Firebase Functions v2
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
    
    if (!job.title || !job.companyName) {
      console.error(`[SocialMedia] Cannot post job ${job.id} to Telegram: Missing title or companyName`);
      return false;
    }

    const message = formatTelegramMessage(job);
    const hasMedia = !!job.mediaUrl;
    // Log token and channel ID status (not the actual token)
    console.log(`[SocialMedia] Telegram bot token exists: ${!!TELEGRAM_BOT_TOKEN}`);
    console.log(`[SocialMedia] Telegram bot token length: ${TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.length : 0}`);
    console.log(`[SocialMedia] Telegram channel ID: ${TELEGRAM_CHANNEL_ID}`);
    
    // Try to verify bot is working first
    try {
      const botCheck = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
      console.log(`[SocialMedia] Telegram bot check:`, botCheck.data);
    } catch (e: any) {
      console.error(`[SocialMedia] Telegram bot check failed:`, e.response?.data || e.message);
    }
    
    // Telegram API endpoint to send messages
    const url = hasMedia
      ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
      : `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // Request parameters
    const data = hasMedia
      ? {
          chat_id: TELEGRAM_CHANNEL_ID,
          photo: job.mediaUrl,
          caption: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        }
      : {
          chat_id: TELEGRAM_CHANNEL_ID,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        };
    
    // Make the POST request to Telegram API
    const response = await axios.post(url, data);
    
    if (response.status === 200 && response.data.ok) {
      console.log(`[SocialMedia] Job "${job.title}" successfully posted to Telegram`);
      return true;
    } else {
      console.error(`[SocialMedia] Failed to post job to Telegram: ${response.data.description}`);
      return false;
    }
  } catch (error) {
    const err = error as any;
    if (err && err.response && err.response.data) {
      console.error(`[SocialMedia] Error posting to Telegram:`, err.response.data);
    } else {
      console.error(`[SocialMedia] Error posting to Telegram:`, error);
    }
    return false;
  }
}

// Function to format the message for Telegram with HTML
function formatTelegramMessage(job: SocialMediaJob): string {
  // Always use the correct domain for job links
  const baseUrl = 'https://gate33.net';
  const jobUrl = `${baseUrl}/jobs/${job.id}`;
  
  // Build the message with HTML formatting
  let message = `<b>🚀 New job: ${job.title}</b>\n\n`;
  message += `<b>Company:</b> ${job.companyName}\n`;
  
  // Add extra info if available
  if (job.location) {
    message += `<b>Location:</b> ${job.location}\n`;
  }
  
  if (job.salary) {
    message += `<b>Salary:</b> ${job.salary}\n`;
  }
  
  // Add a short description if available
  if (job.shortDescription) {
    message += `\n${job.shortDescription}\n\n`;
  }
  
  // Link to the full job
  message += `\n<a href="${jobUrl}">👉 See details and apply</a>`;
  message += `\n\n#${job.jobType || 'job'} #${job.companyName?.replace(/\s+/g, '')}`;
  
  return message;
}

// Export utility functions for external use
export { postToLinkedIn, postToTelegram };

// Function to render a custom template
export function renderTemplateFromJob(template: string, job: SocialMediaJob): string {
  return template
    .replace(/{{\s*title\s*}}/gi, job.title || "")
    .replace(/{{\s*companyName\s*}}/gi, job.companyName || "")
    .replace(/{{\s*mediaUrl\s*}}/gi, job.mediaUrl || "")
    .replace(/{{\s*id\s*}}/gi, job.id || "")
    .replace(/{{\s*jobUrl\s*}}/gi, `https://gate33.net/jobs/${job.id}`); // Fixed to .net
}

// SocialMediaJob interface with additional fields
export interface SocialMediaJob {
  id: string;
  title?: string;
  companyName?: string;
  socialMediaPromotion?: number;
  socialMediaPromotionCount?: number;
  socialMediaPromotionLastSent?: string | null;
  createdAt?: string | Date;
  expiresAt?: string | Date;
  duration?: number; // in days, if exists
  location?: string;
  salary?: string;
  shortDescription?: string;
  jobType?: string;
  mediaUrl?: string; // media/image URL for social post
  // other relevant fields
}

function getJobLifetimeDays(job: SocialMediaJob): number {
  if (job.createdAt && job.expiresAt) {
    const start = new Date(job.createdAt);
    const end = new Date(job.expiresAt);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }
  if (job.duration) return job.duration;
  // fallback: 30 days
  return 30;
}

function getMinIntervalHours(job: SocialMediaJob): number {
  const totalPosts = job.socialMediaPromotion ?? 1;
  const lifetimeDays = getJobLifetimeDays(job);
  // Distribute equally over the job's lifetime
  return (lifetimeDays / totalPosts) * 24;
}

function canSendAgainByPlan(job: SocialMediaJob): boolean {
  const lastSent = job.socialMediaPromotionLastSent ? new Date(job.socialMediaPromotionLastSent) : null;
  const minIntervalHours = getMinIntervalHours(job);
  if (!lastSent) return true;
  const now = new Date();
  const diff = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
  return diff >= minIntervalHours;
}

export async function runSocialMediaPromotionScheduler() {
  const db = getFirestore();
  const jobsRef = db.collection('jobs');
  const jobsSnapshot = await jobsRef.get();
  const jobs = jobsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as SocialMediaJob[];

  // Fetch centralized template and mediaUrl
  const templateSnap = await db.collection("config").doc("socialMediaTemplate").get();
  const templateData = (templateSnap && templateSnap.exists && typeof templateSnap.data === 'function') ? templateSnap.data() ?? {} : {};
  const template = templateData.template || "🚀 New job: {{title}} at {{companyName}}!\nCheck it out and apply now!\n{{jobUrl}}";
  const templateMediaUrl = templateData.mediaUrl || "";

  for (const job of jobs) {
    if (
      (job.socialMediaPromotion ?? 0) > 0 &&
      (job.socialMediaPromotionCount ?? 0) < (job.socialMediaPromotion ?? 0) &&
      canSendAgainByPlan(job)
    ) {
      // Render message and prepare standardized object
      const message = renderTemplateFromJob(template, job);
      const jobForSend = { ...job, shortDescription: message, mediaUrl: job.mediaUrl || templateMediaUrl };
      // Post to social media
      const linkedInSuccess = await postToLinkedIn(jobForSend);
      const telegramSuccess = await postToTelegram(jobForSend);

      if (linkedInSuccess && telegramSuccess) {
        // Update job document
        await jobsRef.doc(job.id).update({
          socialMediaPromotionCount: (job.socialMediaPromotionCount ?? 0) + 1,
          socialMediaPromotionLastSent: new Date().toISOString(),
        });
        console.log(
          `[SocialMedia] Job ${job.title} promoted (` +
          `${(job.socialMediaPromotionCount ?? 0) + 1}/${job.socialMediaPromotion})`
        );
        // Log system activity for auditing
        await logSystemActivity(
          "system",
          "SocialMediaScheduler",
          {
            jobId: job.id,
            jobTitle: job.title,
            companyName: job.companyName,
            promotedPlatforms: ["LinkedIn", "Telegram"],
            timestamp: new Date().toISOString(),
            promotionCount: (job.socialMediaPromotionCount ?? 0) + 1,
            planLimit: job.socialMediaPromotion ?? 0
          }
        );
      }
    }
  }
  console.log('[SocialMedia] Scheduler run complete.');
}

export const scheduledSocialMediaPromotion = onSchedule(
  {
    schedule: "every 8 hours",
    timeZone: "Europe/Lisbon" // Lisbon timezone
  },
  async (event) => {
    await runSocialMediaPromotionScheduler();
  }
);

// If run directly, execute:
if (require.main === module) {
  runSocialMediaPromotionScheduler().then(() => process.exit(0));
}
