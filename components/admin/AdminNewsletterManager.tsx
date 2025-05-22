import React, { useState, useEffect } from "react";
import { jobAlertNewsletterHtml } from "../../utils/newsletterTemplates";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const DEFAULT_INTRO = "Here are the top blockchain jobs highlighted for this week. Edit this text to customize the intro for your audience.";

const AdminNewsletterManager: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [intro, setIntro] = useState<string>(DEFAULT_INTRO);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  useEffect(() => {
    // Fetch jobs highlighted for newsletter
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const jobsSnapshot = await getDocs(collection(db, "jobs"));
        const highlighted = jobsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(job => (job as any).highlightedInNewsletter);
        setJobs(highlighted);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
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
      <div className="mb-4">
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-bold"
          onClick={handleSendNewsletter}
          disabled={loading}
        >
          Send Manually
        </button>
        {sendStatus && <span className="ml-4 text-sm text-orange-300">{sendStatus}</span>}
      </div>
      <div className="border border-gray-700 rounded bg-gray-950 p-4 overflow-x-auto">
        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </div>
  );
};

export default AdminNewsletterManager;
