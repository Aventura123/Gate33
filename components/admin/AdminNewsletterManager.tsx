import React, { useState, useEffect } from "react";
import { jobAlertNewsletterHtml } from "../../app/api/job-alerts/newsletterTemplates";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const DEFAULT_INTRO = "Here are the top blockchain jobs highlighted for this week. Edit this text to customize the intro for your audience.";

const AdminNewsletterManager: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [intro, setIntro] = useState<string>(DEFAULT_INTRO);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  // New: Track which jobs are selected for the newsletter
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  useEffect(() => {
    // Fetch jobs highlighted for newsletter
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const jobsSnapshot = await getDocs(collection(db, "jobs"));
        const allJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        const highlightedJobs = allJobs.filter(job => job.highlightedInNewsletter === true);
        // Fetch the real company logo for each job (same as backend)
        const jobsWithLogo = await Promise.all(highlightedJobs.map(async job => {
          if (job.companyId) {
            try {
              const companySnap = await getDocs(collection(db, "companies"));
              const company = companySnap.docs.find(doc => doc.id === job.companyId);
              if (company) {
                const data = company.data();
                return { ...job, companyPhotoURL: data.photoURL || '' };
              }
            } catch {}
          }
          return { ...job };
        }));
        // Filter out expired jobs (fixed to accept Timestamp, string, or Date)
        const notExpiredJobs = jobsWithLogo.filter(job => {
          if (!job.expiresAt) return true;
          let expiresDate;
          if (typeof job.expiresAt.toDate === 'function') {
            expiresDate = job.expiresAt.toDate();
          } else {
            expiresDate = new Date(job.expiresAt);
          }
          return expiresDate > new Date();
        });
        const highlighted = notExpiredJobs.filter(job => job.sentInNewsletter === false || job.sentInNewsletter == null);
        setJobs(highlighted);
        // By default, select all jobs
        setSelectedJobIds(highlighted.map(job => job.id));
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    // Only include selected jobs in the preview
    const selectedJobs = jobs.filter(job => selectedJobIds.includes(job.id));
    setPreviewHtml(
      jobAlertNewsletterHtml({ jobs: selectedJobs, email: "preview@gate33.net" })
        .replace(
          /<div style="padding: 24px;">/,
          `<div style="padding: 24px;"><p style='font-size:1.1rem;color:#ffb97a;'>${intro}</p>`
        )
    );
  }, [jobs, intro, selectedJobIds]);

  const handleToggleJob = (jobId: string) => {
    setSelectedJobIds(ids =>
      ids.includes(jobId) ? ids.filter(id => id !== jobId) : [...ids, jobId]
    );
  };

  const handleSendNewsletter = async () => {
    if (!window.confirm("Are you sure you want to send the newsletter to all selected jobs subscribers?")) return;
    setSendStatus("Sending...");
    try {
      // Only send selected jobs
      const selectedJobs = jobs.filter(job => selectedJobIds.includes(job.id));
      const res = await fetch("/api/job-alerts/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intro, jobs: selectedJobs })
      });
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
            // Fix expiresAt conversion to Date
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
            const isSelected = selectedJobIds.includes(job.id);
            return (
              <li key={job.id} className="bg-gray-800 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleJob(job.id)}
                    className={`rounded-full border w-6 h-6 flex items-center justify-center text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 ${isSelected ? 'border-green-400 bg-green-900/40 text-green-300 hover:bg-green-700/40' : 'border-gray-500 bg-gray-800 text-gray-400 hover:bg-red-900/40'}`}
                    title={isSelected ? 'Remove from newsletter' : 'Include in newsletter'}
                    aria-label={isSelected ? 'Remove from newsletter' : 'Include in newsletter'}
                    style={{ minWidth: 24, minHeight: 24 }}
                  >
                    {isSelected ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 8.5L7 11.5L12 5.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="6.5" stroke="#888" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
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
