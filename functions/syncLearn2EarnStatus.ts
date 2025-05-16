import * as admin from "firebase-admin";
import { scheduler } from "firebase-functions/v2";

export async function syncLearn2EarnStatusJob(): Promise<void> {
  const db = admin.firestore();
  const snapshot = await db.collection("learn2earn").get();
  const now = new Date();

  for (const docSnap of snapshot.docs) {
    const l2l = docSnap.data();
    let newStatus = l2l.status;

    // Parse dates
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    try {
      if (l2l.startDate) {
        startDate = l2l.startDate.toDate ? l2l.startDate.toDate() : new Date(l2l.startDate);
      }
      if (l2l.endDate) {
        endDate = l2l.endDate.toDate ? l2l.endDate.toDate() : new Date(l2l.endDate);
      }
    } catch {}

    const maxParticipants = typeof l2l.maxParticipants === "number" ? l2l.maxParticipants : undefined;
    const totalParticipants = typeof l2l.totalParticipants === "number" ? l2l.totalParticipants : 0;

    if (startDate && now < startDate) {
      newStatus = "draft";
    } else if (
      (endDate && now > endDate) ||
      (maxParticipants && totalParticipants >= maxParticipants)
    ) {
      newStatus = "completed";
    } else if (
      startDate && now >= startDate &&
      (!endDate || now <= endDate) &&
      (!maxParticipants || totalParticipants < maxParticipants)
    ) {
      newStatus = "active";
    } else {
      newStatus = "draft";
    }

    if (l2l.status !== newStatus) {
      await docSnap.ref.update({ status: newStatus });
      console.log(`Updated ${docSnap.id}: ${l2l.status} → ${newStatus}`);
      // Adiciona log no Firestore para painel de atividade (coleção correta: systemLogs)
      await db.collection("systemLogs").add({
        action: "learn2earn-status-sync",
        learn2earnId: docSnap.id,
        title: l2l.title || "",
        oldStatus: l2l.status,
        newStatus: newStatus,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        message: `Status sincronizado automaticamente: ${l2l.status} → ${newStatus}`
      });
    }
  }
  // No return needed for void function
}

export const syncLearn2EarnStatusV2 = scheduler.onSchedule({
  schedule: "0 0 * * *", // Executa à meia-noite todos os dias
  timeZone: "Europe/Lisbon", // Fuso horário de Lisboa
  retryCount: 3
}, async () => {
  await syncLearn2EarnStatusJob();
});