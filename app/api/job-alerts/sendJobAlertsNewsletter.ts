import { db } from '../../../lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { jobAlertNewsletterHtml } from './newsletterTemplates';
import { sendEmail } from '../../../utils/emailService';

// Fetch all active emails from job alert subscribers, seekers, and companies with marketing opt-in
async function getAllNewsletterEmails() {
  const emails = new Set<string>();

  // Job alert subscribers
  const jobAlertSnap = await getDocs(query(collection(db, 'jobAlertSubscribers'), where('active', '==', true)));
  jobAlertSnap.docs.forEach(doc => {
    const email = doc.data().email;
    if (email) emails.add(email);
  });

  // Seekers with marketing opt-in
  const seekersSnap = await getDocs(collection(db, 'seekers'));
  seekersSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.email && data.notificationPreferences?.marketing) {
      emails.add(data.email);
    }
  });

  // Companies with marketing opt-in
  const companiesSnap = await getDocs(collection(db, 'companies'));
  companiesSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.email && data.notificationPreferences?.marketing) {
      emails.add(data.email);
    }
  });

  return Array.from(emails);
}

// Fetch all jobs highlighted for the newsletter and not yet sent
async function getHighlightedJobs() {
  // Query jobs that are highlighted
  const snapshot = await getDocs(query(
    collection(db, 'jobs'), 
    where('highlightedInNewsletter', '==', true)
  ));
  const jobs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as any) }));

  // Buscar o logo real da empresa para cada job (sempre pelo companyId)
  for (const job of jobs) {
    const j = job as any;
    if (j.companyId) {
      const companyRef = doc(db, 'companies', j.companyId);
      const companySnap = await getDoc(companyRef);
      if (companySnap.exists()) {
        const companyData = companySnap.data();
        j.companyPhotoURL = companyData.photoURL || '';
      } else {
        j.companyPhotoURL = '';
      }
    } else {
      j.companyPhotoURL = '';
    }
  }

  return jobs.filter(job => {
    const j = job as any;
    return j.sentInNewsletter !== true && 
           j.newsletterSent !== true && 
           j[' newsletterSent'] !== true;
  });
}

// Mark jobs as sent
async function markJobsAsSent(jobIds: string[]) {
  for (const id of jobIds) {
    // Atualiza todos os campos para garantir consistência e compatibilidade
    const updateData = { 
      sentInNewsletter: true,
      newsletterSent: true,
      ' newsletterSent': true // Também atualiza o campo com espaço, se existir
    };
    
    await updateDoc(doc(db, 'jobs', id), updateData);
    console.log(`Job ${id} marcado como enviado em todos os campos.`);
  }
}

// Send the newsletter to all emails
export async function sendJobAlertsNewsletter(intro?: string) {
  const emails = await getAllNewsletterEmails();
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
    const html = jobAlertNewsletterHtml({ jobs, email, intro });
    await sendEmail({
      to: email,
      subject: '🚀 New Blockchain Jobs for You – Gate33',
      html,
      text: 'See the latest blockchain jobs at Gate33.',
      from: 'noreply@gate33.net',
    });
    console.log(`Newsletter sent to ${email}`);
  }
  await markJobsAsSent(jobs.map(j => j.id));
  console.log('All newsletters sent and jobs marked as sent.');
}

// For manual run (node app/api/job-alerts/sendJobAlertsNewsletter.ts)
if (require.main === module) {
  sendJobAlertsNewsletter().catch(console.error);
}
