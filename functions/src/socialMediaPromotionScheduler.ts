import { db } from '../../lib/firebase.js';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { onSchedule } from "firebase-functions/v2/scheduler";

// Mocked social media posting functions (replace with real integrations)
async function postToLinkedIn(job: any) {
  console.log(`[SocialMedia] Posting job ${job.title} to LinkedIn...`);
  // TODO: Integrate with LinkedIn API
  return true;
}
async function postToTelegram(job: any) {
  console.log(`[SocialMedia] Posting job ${job.title} to Telegram...`);
  // TODO: Integrate with Telegram API
  return true;
}

// Adicione a interface para o tipo de job esperado
interface SocialMediaJob {
  id: string;
  title?: string;
  companyName?: string;
  socialMediaPromotion?: number;
  socialMediaPromotionCount?: number;
  socialMediaPromotionLastSent?: string | null;
  createdAt?: string | Date;
  expiresAt?: string | Date;
  duration?: number; // em dias, se existir
  // outros campos relevantes
}

function getJobLifetimeDays(job: SocialMediaJob): number {
  if (job.createdAt && job.expiresAt) {
    const start = new Date(job.createdAt);
    const end = new Date(job.expiresAt);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }
  if (job.duration) return job.duration;
  // fallback: 30 dias
  return 30;
}

function getMinIntervalHours(job: SocialMediaJob): number {
  const totalPosts = job.socialMediaPromotion ?? 1;
  const lifetimeDays = getJobLifetimeDays(job);
  // Distribui igualmente ao longo do tempo de vida
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
  const jobsRef = collection(db, 'jobs');
  const jobsSnapshot = await getDocs(jobsRef);
  const jobs = jobsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as SocialMediaJob[];

  for (const job of jobs) {
    if (
      (job.socialMediaPromotion ?? 0) > 0 &&
      (job.socialMediaPromotionCount ?? 0) < (job.socialMediaPromotion ?? 0) &&
      canSendAgainByPlan(job)
    ) {
      // Post to social media
      await postToLinkedIn(job);
      await postToTelegram(job);
      // Update job document
      const jobDoc = doc(db, 'jobs', job.id);
      await updateDoc(jobDoc, {
        socialMediaPromotionCount: (job.socialMediaPromotionCount ?? 0) + 1,
        socialMediaPromotionLastSent: new Date().toISOString(),
      });
      console.log(
        `[SocialMedia] Job ${job.title} promoted (` +
        `${(job.socialMediaPromotionCount ?? 0) + 1}/${job.socialMediaPromotion})`
      );
    }
  }
  console.log('[SocialMedia] Scheduler run complete.');
}

export const scheduledSocialMediaPromotion = onSchedule(
  {
    schedule: "every 8 hours",
    timeZone: "Europe/Lisbon", // Fuso horário de Lisboa
  },
  async (event) => {
    await runSocialMediaPromotionScheduler();
  }
);

// If run directly, execute:
if (require.main === module) {
  runSocialMediaPromotionScheduler().then(() => process.exit(0));
}
