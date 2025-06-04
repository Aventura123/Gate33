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

  // Search for the actual company logo for each job (always by companyId)
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
    // Updates all fields to ensure consistency and compatibility
    const updateData = { 
      sentInNewsletter: true,
      newsletterSent: true,
      ' newsletterSent': true // Also updates the field with space, if it exists
    };
    
    await updateDoc(doc(db, 'jobs', id), updateData);
    console.log(`Job ${id} marked as sent in all fields.`);
  }
}

// Interface for partner data
interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  website: string;
}

// Send the newsletter to all emails
export async function sendJobAlertsNewsletter(intro?: string, selectedJobs?: any[], selectedPartners?: Partner[]) {
  const emails = await getAllNewsletterEmails();
  if (!emails.length) {
    console.log('No active subscribers.');
    return;
  }
  
  // Use selected jobs if provided, otherwise fetch highlighted jobs
  const jobs = selectedJobs || await getHighlightedJobs();
  if (!jobs.length) {
    console.log('No jobs to send.');
    return;
  }
  
  // Get partners if not provided
  const partners = selectedPartners || [];
  
  for (const email of emails) {
    const html = jobAlertNewsletterHtml({ jobs, partners, email, intro });
    await sendEmail({
      to: email,
      subject: '🚀 New Blockchain Jobs for You – Gate33',
      html,
      text: 'See the latest blockchain jobs at Gate33.',
      from: 'noreply@gate33.net',
    });
    console.log(`Newsletter sent to ${email}`);
  }
  
  // Only mark jobs as sent if they were automatically selected (not manually provided)
  if (!selectedJobs) {
    await markJobsAsSent(jobs.map(j => j.id));
  }
  console.log('All newsletters sent and jobs marked as sent.');
}

// For manual run (node app/api/job-alerts/sendJobAlertsNewsletter.ts)
if (require.main === module) {
  sendJobAlertsNewsletter().catch(console.error);
}
