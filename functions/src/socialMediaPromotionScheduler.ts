import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import axios from 'axios';
import { defineString } from "firebase-functions/params";

// Configurações do Telegram - Usando variáveis de ambiente seguras com Firebase Functions
const TELEGRAM_BOT_TOKEN = defineString('TELEGRAM_BOT_TOKEN', {
  description: 'Token de autenticação do Bot do Telegram'
});
const TELEGRAM_CHANNEL_ID = defineString('TELEGRAM_CHANNEL_ID', { 
  default: '@gate33_tg_channel',
  description: 'ID do canal do Telegram para postagem de vagas'
});

// Mocked social media posting functions (replace with real integrations)
async function postToLinkedIn(job: any) {
  console.log(`[SocialMedia] Posting job ${job.title} to LinkedIn...`);
  // TODO: Integrate with LinkedIn API
  return true;
}

/**
 * Função que envia uma mensagem para o canal do Telegram
 * @param job A vaga de emprego a ser postada
 * @returns boolean indicando sucesso ou falha
 */
async function postToTelegram(job: SocialMediaJob): Promise<boolean> {
  try {
    if (!job.title || !job.companyName) {
      console.error(`[SocialMedia] Cannot post job ${job.id} to Telegram: Missing title or companyName`);
      return false;
    }

    // Formato da mensagem para o Telegram
    const message = formatTelegramMessage(job);
    
    // Endpoint da API do Telegram para enviar mensagens
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // Parâmetros da requisição
    const data = {
      chat_id: TELEGRAM_CHANNEL_ID,
      text: message,
      parse_mode: 'HTML', // Permite formatação HTML
      disable_web_page_preview: false
    };
    
    // Faz a requisição POST para a API do Telegram
    const response = await axios.post(url, data);
    
    if (response.status === 200 && response.data.ok) {
      console.log(`[SocialMedia] Job "${job.title}" successfully posted to Telegram`);
      return true;
    } else {
      console.error(`[SocialMedia] Failed to post job to Telegram: ${response.data.description}`);
      return false;
    }
  } catch (error) {
    console.error(`[SocialMedia] Error posting to Telegram:`, error);
    return false;
  }
}

/**
 * Formata a mensagem para o Telegram com HTML
 */
function formatTelegramMessage(job: SocialMediaJob): string {
  // URL base do seu site
  const baseUrl = 'https://gate33.io'; // Substitua pelo seu domínio real
  const jobUrl = `${baseUrl}/jobs/${job.id}`;
  
  // Construindo a mensagem com formatação HTML
  let message = `<b>🚀 Nova vaga: ${job.title}</b>\n\n`;
  message += `<b>Empresa:</b> ${job.companyName}\n`;
  
  // Adicionar informações extras se disponíveis
  if (job.location) {
    message += `<b>Local:</b> ${job.location}\n`;
  }
  
  if (job.salary) {
    message += `<b>Salário:</b> ${job.salary}\n`;
  }
  
  // Adicionar uma breve descrição se disponível
  if (job.shortDescription) {
    message += `\n${job.shortDescription}\n\n`;
  }
  
  // Link para a vaga completa
  message += `\n<a href="${jobUrl}">👉 Ver detalhes e candidatar-se</a>`;
  message += `\n\n#${job.jobType || 'vaga'} #${job.companyName?.replace(/\s+/g, '')}`;
  
  return message;
}

// Interface SocialMediaJob com campos adicionais
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
  location?: string;
  salary?: string;
  shortDescription?: string;
  jobType?: string;
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
  const db = getFirestore();
  const jobsRef = db.collection('jobs');
  const jobsSnapshot = await jobsRef.get();
  const jobs = jobsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as SocialMediaJob[];

  for (const job of jobs) {
    if (
      (job.socialMediaPromotion ?? 0) > 0 &&
      (job.socialMediaPromotionCount ?? 0) < (job.socialMediaPromotion ?? 0) &&
      canSendAgainByPlan(job)
    ) {
      // Post to social media
      await postToLinkedIn(job);
      const telegramSuccess = await postToTelegram(job);
      
      if (telegramSuccess) {
        // Update job document
        await jobsRef.doc(job.id).update({
          socialMediaPromotionCount: (job.socialMediaPromotionCount ?? 0) + 1,
          socialMediaPromotionLastSent: new Date().toISOString(),
        });
        console.log(
          `[SocialMedia] Job ${job.title} promoted (` +
          `${(job.socialMediaPromotionCount ?? 0) + 1}/${job.socialMediaPromotion})`
        );
      }
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
