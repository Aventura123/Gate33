import React, { useState, useEffect, useRef } from "react";
import { jobAlertNewsletterHtml } from "../../app/api/job-alerts/newsletterTemplates";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const DEFAULT_INTRO = "Here are the top blockchain jobs highlighted for this week.";

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  website: string;
}

const AdminNewsletterManager: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [intro, setIntro] = useState<string>(DEFAULT_INTRO);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  // Track which jobs are selected for the newsletter
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
    // Load the introductory text saved in localStorage
  useEffect(() => {
    try {
      const savedIntro = localStorage.getItem('newsletterIntroText');
      if (savedIntro) {
        setIntro(savedIntro);
        console.log('Loaded saved intro text from localStorage:', savedIntro);
      } else {
        console.log('No saved intro text found in localStorage');
      }
    } catch (error) {
      console.error('Error loading intro text from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    // Fetch jobs highlighted for newsletter and partners
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch jobs
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
          // Fetch partners
        const partnersSnapshot = await getDocs(collection(db, "partners"));
        const partnersList = partnersSnapshot.docs.map(doc => ({ 
          ...(doc.data() as Partner),
          id: doc.id
        }));
        setPartners(partnersList);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);  useEffect(() => {
    // Only include selected jobs in the preview
    const selectedJobs = jobs.filter(job => selectedJobIds.includes(job.id));
    
    // Format intro text with paragraphs (same as in sendJobAlertsNewsletter.ts)
    let formattedIntro = intro;
    if (intro) {
      const paragraphs = intro.split(/\n/);
      if (paragraphs.length > 0) {
        formattedIntro = paragraphs.map(p => {
          if (p.trim()) { 
            return `<p style="font-size: 1.1rem; color: #FF6B00; margin-bottom: 16px;">${p.trim()}</p>`;
          }
          return ''; 
        }).join('');
      }
    }
    
    // Include all partners
    setPreviewHtml(
      jobAlertNewsletterHtml({ 
        jobs: selectedJobs, 
        partners: partners, 
        email: "preview@gate33.net", 
        intro: formattedIntro 
      })
    );
  }, [jobs, partners, intro, selectedJobIds]);

  const handleToggleJob = (jobId: string) => {
    setSelectedJobIds(ids =>
      ids.includes(jobId) ? ids.filter(id => id !== jobId) : [...ids, jobId]
    );
  };    const handleSendNewsletter = async () => {
    if (!window.confirm("Are you sure you want to send the newsletter to all selected jobs subscribers?")) return;
    setSendStatus("Sending...");
    try {
      // Save the current intro text before sending
      localStorage.setItem('newsletterIntroText', intro);
      localStorage.setItem('lastSentNewsletterText', intro);
      
      // Only send selected jobs but include all partners
      const selectedJobs = jobs.filter(job => selectedJobIds.includes(job.id));
      const res = await fetch("/api/job-alerts/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          intro, 
          jobs: selectedJobs,
          partners: partners
        })
      });
      if (res.ok) {
        setSendStatus("Newsletter sent successfully!");
        
        // Opcionalmente, pode salvar o último template enviado em um item separado
        localStorage.setItem('lastSentNewsletterDate', new Date().toISOString());
      }
      else setSendStatus("Failed to send newsletter.");
    } catch {
      setSendStatus("Failed to send newsletter.");
    }
    setTimeout(() => setSendStatus(null), 5000);
  };
  return (
    <div className="p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Newsletter Preview &amp; Editor</h2>
      
      <div className="space-y-4 md:space-y-6">        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-1">Intro Text</label>          <textarea
            className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
            rows={4}
            value={intro}
            onChange={e => {
              const newText = e.target.value;
              setIntro(newText);
              // Salvar no localStorage a cada mudança
              try {
                localStorage.setItem('newsletterIntroText', newText);
                console.log('Saved intro text to localStorage:', newText);
              } catch (error) {
                console.error('Error saving intro text to localStorage:', error);
              }
            }}
            placeholder="Type your text here. Press Enter to create a new paragraph."
          /><p className="text-xs text-gray-400 mt-1">
            Press Enter to start a new paragraph. Each line break will automatically be converted into a new paragraph in the newsletter. The text is automatically saved in your browser.
          </p>
        </div>        <div className="border border-gray-700 rounded-lg bg-black/40 p-4 overflow-hidden">
          <div className="max-h-[500px] overflow-auto custom-scrollbar">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>        </div>
          {/* Info about partners */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-bold text-orange-400">Partners</h3>
            {partners.length === 0 && (
              <span className="text-xs text-gray-400 bg-black/20 py-1 px-2 rounded-md">
                No partners available. Add partners in the Partners Manager.
              </span>
            )}
            {partners.length > 0 && (
              <span className="text-xs text-gray-400 bg-black/20 py-1 px-2 rounded-md">
                {partners.length} partner{partners.length !== 1 ? 's' : ''} will appear as "Backed by" at the bottom of the newsletter
              </span>
            )}
          </div>
        </div>

        {/* Highlighted jobs list with expiration and send status */}
        <div>
          <h3 className="text-base font-bold text-orange-400 mb-2">Jobs for the Newsletter</h3>
          <div className="space-y-2 custom-scrollbar max-h-96 overflow-y-auto pr-1">
            {jobs.length === 0 && (
              <div className="text-gray-400 bg-black/20 p-3 rounded-lg text-center">
                No highlighted jobs available for the newsletter.
              </div>
            )}
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
                <div key={job.id} className="bg-black/40 rounded-lg p-3 border border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleJob(job.id)}
                        className={`rounded-full border w-6 h-6 min-w-[24px] min-h-[24px] flex items-center justify-center text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 ${isSelected ? 'border-green-400 bg-green-900/40 text-green-300 hover:bg-green-700/40' : 'border-gray-500 bg-gray-800 text-gray-400 hover:bg-red-900/40'}`}
                        title={isSelected ? 'Remove from newsletter' : 'Include in newsletter'}
                        aria-label={isSelected ? 'Remove from newsletter' : 'Include in newsletter'}
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
                      <span className="text-gray-400">({job.company})</span>
                      {job.planName && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-900/50 text-orange-300 border border-orange-700">
                          {job.planName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {expiresAt && (
                        <span className={expired ? "px-1.5 py-0.5 rounded-full text-xs bg-red-900/50 text-red-300 border border-red-700" : "px-1.5 py-0.5 rounded-full text-xs bg-green-900/50 text-green-300 border border-green-700"}>
                          {expired ? "Expired" : `Expires in ${daysLeft} day(s)`}
                        </span>
                      )}
                      {job.sentInNewsletter ? (
                        <span className="px-1.5 py-0.5 rounded-full text-xs bg-orange-900/50 text-orange-300 border border-orange-700">Already sent</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm"
          onClick={handleSendNewsletter}
          disabled={loading || selectedJobIds.length === 0}
        >
          Send Newsletter
        </button>
        
        <button
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-semibold shadow text-sm"
          onClick={() => {
            if (window.confirm('Tem certeza que deseja redefinir o texto da introdução para o padrão?')) {
              setIntro(DEFAULT_INTRO);
              localStorage.setItem('newsletterIntroText', DEFAULT_INTRO);
            }
          }}
        >
          Reset Text
        </button>
        
        {sendStatus && (
          <div className={`ml-4 px-3 py-1 rounded-lg text-sm ${
            sendStatus === "Sending..." 
              ? "bg-yellow-900/50 border border-yellow-500 text-yellow-200"
              : sendStatus.includes("success") 
                ? "bg-green-900/50 border border-green-500 text-green-200" 
                : "bg-red-900/50 border border-red-500 text-red-200"
          }`}>
            {sendStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNewsletterManager;
