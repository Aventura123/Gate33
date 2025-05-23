import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logSystemActivity } from "./logSystem";

// Importar funções reutilizáveis do scheduler
import {
  postToLinkedIn,
  postToTelegram,
  renderTemplateFromJob,
  SocialMediaJob
} from "./socialMediaPromotionScheduler";

// Função HTTP para envio manual
export const manualSocialMediaPromotion = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const { jobId } = req.body;
  if (!jobId) {
    res.status(400).json({ error: "jobId obrigatório" });
    return;
  }
  try {
    const db = getFirestore();
    const jobSnap = await db.collection("jobs").doc(jobId).get();
    if (!jobSnap.exists) {
      res.status(404).json({ error: "Job não encontrado" });
      return;
    }
    const jobData = jobSnap.data() as SocialMediaJob;
    const job: SocialMediaJob = { ...jobData, id: jobSnap.id };
    // Buscar template centralizado
    const templateSnap = await db.collection("config").doc("socialMediaTemplate").get();
    const template = templateSnap.exists
      ? templateSnap.data()?.template
      : "🚀 Nova vaga: {{title}} na {{companyName}}!\nConfira e candidate-se agora!";
    // Renderizar mensagem
    const message = renderTemplateFromJob(template, job);
    // Preparar objeto de job para envio (shortDescription para LinkedIn, mediaUrl para ambos)
    const jobForSend = { ...job, shortDescription: message, mediaUrl: job.mediaUrl };
    const linkedInSuccess = await postToLinkedIn(jobForSend);
    const telegramSuccess = await postToTelegram(jobForSend);
    if (linkedInSuccess && telegramSuccess) {
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
      res.status(500).json({ error: "Falha ao enviar para todas as plataformas" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});
