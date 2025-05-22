import React, { useState, useEffect } from "react";
import { jobAlertNewsletterHtml } from "../../app/api/job-alerts/newsletterTemplates";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const DEFAULT_INTRO = "Here are the top blockchain jobs highlighted for this week. Edit this text to customize the intro for your audience.";

const AdminNewsletterManager: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [intro, setIntro] = useState<string>(DEFAULT_INTRO);
  const [previewHtml, setPreviewHtml] = useState<string>("");  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  useEffect(() => {
    // Fetch jobs highlighted for newsletter
    const fetchJobs = async () => {
      setLoading(true);
      try {        const jobsSnapshot = await getDocs(collection(db, "jobs"));
        
        // Diagnóstico de todos os jobs
        console.log("Total jobs found:", jobsSnapshot.docs.length);
        
        // Converter para objetos mais fáceis de trabalhar
        const allJobs = jobsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...(doc.data() as any) 
        }));
        
        // Diagnóstico dos jobs
        const highlightedJobs = allJobs.filter(job => job.highlightedInNewsletter === true);
        console.log("Jobs com highlightedInNewsletter===true:", highlightedJobs.length);
        highlightedJobs.forEach(job => console.log("Job destacado:", job.id, job.title, "expira em:", job.expiresAt));
        
        // Filtragem por não expirados (corrigido para aceitar Timestamp, string ou Date)
        const notExpiredJobs = highlightedJobs.filter(job => {
          if (!job.expiresAt) return true;
          let expiresDate;
          if (typeof job.expiresAt.toDate === 'function') {
            expiresDate = job.expiresAt.toDate(); // Firestore Timestamp
          } else {
            expiresDate = new Date(job.expiresAt); // string ou Date
          }
          return expiresDate > new Date();
        });
        console.log("Jobs destacados não expirados:", notExpiredJobs.length);
          // Filtragem final incluindo sentInNewsletter !== true
        const highlighted = notExpiredJobs.filter(job => {
          console.log("Verificando job:", job.id, "sentInNewsletter =", job.sentInNewsletter);
          // Aceitar explicitamente false ou undefined/null
          return job.sentInNewsletter === false || job.sentInNewsletter == null;
        });
        
        console.log("Found jobs for newsletter:", highlighted.length);
        highlighted.forEach(job => console.log("Job Final:", job.id, job.title, "sentInNewsletter:", job.sentInNewsletter));
        setJobs(highlighted);
      } finally {
        setLoading(false);
      }
    };    fetchJobs();
  }, []);

  useEffect(() => {
    // Generate preview HTML
    setPreviewHtml(
      jobAlertNewsletterHtml({ jobs, email: "preview@gate33.net" })
        .replace(
          /<div style="padding: 24px;">/, 
          `<div style="padding: 24px;"><p style='font-size:1.1rem;color:#ffb97a;'>${intro}</p>`
        )
    );
  }, [jobs, intro]);

  const handleSendNewsletter = async () => {
    if (!window.confirm("Are you sure you want to send the newsletter to all subscribers?")) return;
    setSendStatus("Sending...");
    try {
      const res = await fetch("/api/job-alerts/send-newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intro }) });
      if (res.ok) setSendStatus("Newsletter sent successfully!");
      else setSendStatus("Failed to send newsletter.");
    } catch {
      setSendStatus("Failed to send newsletter.");
    }
    setTimeout(() => setSendStatus(null), 5000);
  };

  return (
    <div className="bg-black/60 p-6 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-orange-400 mb-4">Newsletter Preview & Editor</h2>
      <label className="block mb-2 text-orange-300 font-semibold">Intro Text</label>
      <textarea
        className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 mb-4"
        rows={3}
        value={intro}
        onChange={e => setIntro(e.target.value)}
      />
      <div className="border border-gray-700 rounded bg-gray-950 p-4 overflow-x-auto mb-6">
        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
      {/* Highlighted jobs list with expiration and send status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-orange-300 mb-2">Jobs that will be included in the next newsletter:</h3>
        <ul className="space-y-2">
          {jobs.length === 0 && <li className="text-gray-400">No highlighted jobs available for the newsletter.</li>}
          {jobs.map(job => {
            // Corrigir conversão de expiresAt para Date
            let expiresAt: Date | null = null;
            if (job.expiresAt) {
              if (typeof job.expiresAt.toDate === 'function') {
                expiresAt = job.expiresAt.toDate();
              } else {
                expiresAt = new Date(job.expiresAt);
              }
            }
            const expired = expiresAt && expiresAt < new Date();
            const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            return (
              <li key={job.id} className="bg-gray-800 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-bold text-orange-200">{job.title}</span>
                  <span className="ml-2 text-gray-400">({job.company})</span>
                  {job.planName && <span className="ml-2 text-xs text-orange-400 bg-orange-900/30 px-2 py-1 rounded">{job.planName}</span>}
                </div>
                <div className="mt-1 md:mt-0 text-sm flex flex-col md:flex-row md:items-center gap-2">
                  {expiresAt && (
                    <span className={expired ? "text-red-400" : "text-green-400"}>
                      {expired ? "Expired" : `Expires in ${daysLeft} day(s)`}
                    </span>
                  )}                  {job.sentInNewsletter && (
                    <span className="text-orange-400 ml-2">Already sent</span>
                  )}
                  {!job.sentInNewsletter && (
                    <span className="text-orange-300 ml-2">Pending</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>      <div className="mb-4">
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-bold"
          onClick={handleSendNewsletter}
          disabled={loading}
        >
          Send Manually
        </button>
        {sendStatus && <span className="ml-4 text-sm text-orange-300">{sendStatus}</span>}
      </div>
    </div>
  );
};

export default AdminNewsletterManager;
