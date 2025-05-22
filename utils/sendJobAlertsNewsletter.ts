import { db } from '../lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { jobAlertNewsletterHtml } from './newsletterTemplates';
import { sendEmail } from './emailService';

// 1. Busca todos os e-mails ativos de job alert subscribers
async function getActiveJobAlertEmails() {
  const snapshot = await getDocs(query(collection(db, 'jobAlertSubscribers'), where('active', '==', true)));
  return snapshot.docs.map(doc => doc.data().email).filter(Boolean);
}

// 2. Busca todos os jobs destacados para newsletter e não enviados
async function getHighlightedJobs() {
  const snapshot = await getDocs(query(collection(db, 'jobs'), where('highlightedInNewsletter', '==', true), where('newsletterSent', '!=', true)));
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

// 3. Marca jobs como enviados
async function markJobsAsSent(jobIds: string[]) {
  for (const id of jobIds) {
    await updateDoc(doc(db, 'jobs', id), { newsletterSent: true });
  }
}

// 4. Envia a newsletter para todos os e-mails
export async function sendJobAlertsNewsletter() {
  const emails = await getActiveJobAlertEmails();
  if (!emails.length) {
    console.log('No active subscribers.');
    return;
  }
  const jobs = await getHighlightedJobs();
  if (!jobs.length) {
    console.log('No highlighted jobs to send.');
    return;
  }
  for (const email of emails) {
    const html = jobAlertNewsletterHtml({ jobs, email });
    await sendEmail({
      to: email,
      subject: '🚀 New Blockchain Jobs for You – Gate33',
      html,
      text: 'See the latest blockchain jobs at Gate33.'
    });
    console.log(`Newsletter sent to ${email}`);
  }
  await markJobsAsSent(jobs.map(j => j.id));
  console.log('All newsletters sent and jobs marked as sent.');
}

// Para rodar manualmente (node utils/sendJobAlertsNewsletter.ts)
if (require.main === module) {
  sendJobAlertsNewsletter().catch(console.error);
}
