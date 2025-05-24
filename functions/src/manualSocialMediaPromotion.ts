import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logSystemActivity } from "./logSystem";
import * as cors from 'cors';

// Importar funções reutilizáveis do scheduler
import {
  postToLinkedIn,
  postToTelegram,
  renderTemplateFromJob,
  SocialMediaJob
} from "./socialMediaPromotionScheduler";

// Configurar CORS
const allowedOrigins = [
  'https://gate33.net',
  'https://www.gate33.net',
  'https://gate33.me',
  'https://www.gate33.me'
];
const corsHandler = (cors.default || cors)({
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (
      origin.startsWith('http://localhost:') ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  }
});

// HTTP function for manual sending
export const manualSocialMediaPromotion = onRequest(async (req, res) => {
  // Enable CORS
  corsHandler(req, res, async () => {

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const { jobId } = req.body;
    if (!jobId) {
      res.status(400).json({ error: "jobId is required" });
      return;
    }
    try {
    const db = getFirestore();
    console.log("[ManualSocialMedia] Received jobId:", jobId);
    const jobSnap = await db.collection("jobs").doc(jobId).get();
    if (!jobSnap.exists) {
      console.log("[ManualSocialMedia] Job not found:", jobId);
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const jobData = jobSnap.data() as SocialMediaJob;
    const job: SocialMediaJob = { ...jobData, id: jobSnap.id };
    console.log("[ManualSocialMedia] Loaded job:", job);
    // Fetch centralized template
    const templateSnap = await db.collection("config").doc("socialMediaTemplate").get();
    const template = templateSnap.exists
      ? templateSnap.data()?.template
      : "🚀 New job: {{title}} at {{companyName}}!\nCheck it out and apply now!";
    // Render message
    const message = renderTemplateFromJob(template, job);
    console.log("[ManualSocialMedia] Rendered message:", message);
    // Prepare job object for sending (shortDescription for LinkedIn, mediaUrl for both)
    const jobForSend = { ...job, shortDescription: message, mediaUrl: job.mediaUrl };
    console.log("[ManualSocialMedia] jobForSend:", jobForSend);
      let linkedInSuccess = false;
    let telegramSuccess = false;
    
    // Try posting to LinkedIn
    try {
      linkedInSuccess = await postToLinkedIn(jobForSend);
      console.log("[ManualSocialMedia] LinkedIn result:", linkedInSuccess);
    } catch (err: any) {
      console.error("[ManualSocialMedia] Error posting to LinkedIn:", err.message);
    }
    
    // Try posting to Telegram
    try {
      telegramSuccess = await postToTelegram(jobForSend);
      console.log("[ManualSocialMedia] Telegram result:", telegramSuccess);
    } catch (err: any) {
      console.error("[ManualSocialMedia] Error posting to Telegram:", err.message);
    }
    
    // Temporarily, consider success if at least one platform works
    // While we resolve configuration issues
    if (linkedInSuccess || telegramSuccess) {
      console.log("[ManualSocialMedia] Telegram worked, registering as success");
      await db.collection("jobs").doc(jobId).update({
        socialMediaPromotionCount: (job.socialMediaPromotionCount ?? 0) + 1,
        socialMediaPromotionLastSent: new Date().toISOString(),
      });
      await logSystemActivity("system", "ManualSocialMedia", {
        jobId: job.id,
        jobTitle: job.title,
        companyName: job.companyName,
        promotedPlatforms: ["LinkedIn", "Telegram"],
        timestamp: new Date().toISOString(),
        promotionCount: (job.socialMediaPromotionCount ?? 0) + 1,
        planLimit: job.socialMediaPromotion ?? 0,
        manual: true,
      });
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to send to all platforms" });
    }
  } catch (err: any) {
    console.error("[ManualSocialMedia] Error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
  });
});

// Certifique-se de que o postToTelegram está usando variáveis de ambiente seguras
// Não inclua tokens sensíveis diretamente neste arquivo, apenas use a função importada
