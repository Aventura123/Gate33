import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, updateDoc, doc as firestoreDoc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface SocialMediaJob {
  id: string;
  title?: string;
  companyName?: string;
  socialMediaPromotion?: number;
  socialMediaPromotionCount?: number;
  socialMediaPromotionLastSent?: string | null;
  location?: string;
  salary?: string;
  shortDescription?: string;
  jobType?: string;
  mediaUrl?: string;
  // other relevant fields
}

const TEMPLATE_DOC_PATH = { collection: 'config', doc: 'socialMediaTemplate' };

const defaultTemplate = `🔥 NEW OPPORTUNITY: {{title}} 🔥

🏢 Company: {{companyName}}
📍 See all details and apply: {{jobUrl}}

#job #employment #opportunity #gate33`;

const AdminSocialMediaManager: React.FC = () => {
  const [jobs, setJobs] = useState<SocialMediaJob[]>([]);
  const [template, setTemplate] = useState<string>(defaultTemplate);
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Load jobs with pending Social Media Promotion
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const jobsRef = collection(db, 'jobs');
      const jobsSnapshot = await getDocs(jobsRef);
      const jobsList = jobsSnapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as SocialMediaJob[];
      setJobs(jobsList.filter(j => (j.socialMediaPromotion ?? 0) > 0 && (j.socialMediaPromotionCount ?? 0) < (j.socialMediaPromotion ?? 0)));
      setLoading(false);
    };
    fetchJobs();
  }, []);
  // Load template and mediaUrl from Firestore
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const templateDoc = await getDoc(firestoreDoc(db, TEMPLATE_DOC_PATH.collection, TEMPLATE_DOC_PATH.doc));
        if (templateDoc.exists()) {
          setTemplate(templateDoc.data().template || defaultTemplate);
          setMediaUrl(templateDoc.data().mediaUrl || "");
        } else {
          setTemplate(defaultTemplate);
          setMediaUrl("");
        }
      } catch (err) {
        setTemplate(defaultTemplate);
        setMediaUrl("");
      }
    };
    fetchTemplate();
  }, []);

  // Upload image to Firebase Storage and get URL
  const handleMediaUpload = async (file: File) => {
    setUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `socialMediaTemplates/${file.name}-${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setMediaUrl(url);
      setMessage('Image uploaded!');
    } catch (err) {
      setMessage('Error uploading image');
    }
    setUploading(false);
  };
  // Save template and mediaUrl to Firestore
  const saveTemplate = async () => {
    setSaving(true);
    await setDoc(firestoreDoc(db, TEMPLATE_DOC_PATH.collection, TEMPLATE_DOC_PATH.doc), { template, mediaUrl });
    setSaving(false);
    setMessage('Template saved!');
    setTimeout(() => setMessage(null), 2000);
  };

  // Manual send function
  const sendManualPost = async (job: SocialMediaJob) => {
    setMessage('Sending...');
    try {
      // Call the actual endpoint (example: /api/socialMediaManualPost)
      const res = await fetch('/api/socialMediaManualPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      });
      if (!res.ok) throw new Error('Error sending post');
      setMessage('Post sent!');
    } catch (err) {
      setMessage('Error sending post!');
    }
    setTimeout(() => setMessage(null), 2000);
  };
  // Utility function to render the template with job data
  function renderTemplate(template: string, job: SocialMediaJob): string {
    return template
      .replace(/{{\s*title\s*}}/gi, job.title || "")
      .replace(/{{\s*companyName\s*}}/gi, job.companyName || "")
      .replace(/{{\s*id\s*}}/gi, job.id || "")
      .replace(/{{\s*location\s*}}/gi, job.location || "")
      .replace(/{{\s*salary\s*}}/gi, job.salary || "")
      .replace(/{{\s*jobType\s*}}/gi, job.jobType || "")
      .replace(/{{\s*shortDescription\s*}}/gi, job.shortDescription || "")
      .replace(/{{\s*mediaUrl\s*}}/gi, job.mediaUrl || "");
  }

  return (
    <div className="p-6 bg-black/80 rounded-lg">
      <h2 className="text-2xl font-bold text-orange-400 mb-4">Social Media Promotion Manager</h2>
      <div className="mb-6">
        <label className="block text-orange-300 font-semibold mb-1">Post Template:</label>
        <div className="mb-2 bg-black/40 rounded-lg p-2 border border-gray-700">
          <div className="text-xs text-gray-300 mb-1 font-medium">Available placeholders:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
            <div><code className="bg-black/60 px-1 rounded">{'{{title}}'}</code> - Job title</div>
            <div><code className="bg-black/60 px-1 rounded">{'{{companyName}}'}</code> - Company name</div>
            <div><code className="bg-black/60 px-1 rounded">{'{{jobUrl}}'}</code> - Complete job URL</div>
            <div><code className="bg-black/60 px-1 rounded">{'{{id}}'}</code> - Job ID</div>
            <div><code className="bg-black/60 px-1 rounded">{'{{location}}'}</code> - Location</div>
            <div><code className="bg-black/60 px-1 rounded">{'{{salary}}'}</code> - Salary range</div>
            <div><code className="bg-black/60 px-1 rounded">{'{{jobType}}'}</code> - Job type</div>
            <div><code className="bg-black/60 px-1 rounded">{'{{shortDescription}}'}</code> - Short description</div>
          </div>
        </div>
        <textarea
          className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white mb-2"
          rows={4}
          value={template}
          onChange={e => setTemplate(e.target.value)}
        />
        <label className="block text-orange-300 font-semibold mb-1 mt-2">Media (image for all posts):</label>
        <input
          className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white mb-2"
          type="file"
          accept="image/*"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              setMediaFile(e.target.files[0]);
              handleMediaUpload(e.target.files[0]);
            }
          }}
          disabled={uploading}
        />
        {mediaUrl && (
          <div className="mt-2"><img src={mediaUrl} alt="media preview" className="rounded max-w-[200px]" /></div>
        )}
        <button onClick={saveTemplate} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 mt-2" disabled={saving || uploading}>
          {uploading ? 'Uploading...' : 'Save Template'}
        </button>
        {message && <span className="ml-4 text-green-400">{message}</span>}
        <div className="mt-4 bg-black/40 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-medium text-orange-300 mb-2">💡 Tips for effective posts:</h4>
          <ul className="text-xs text-gray-400 list-disc pl-4 space-y-1">
            <li>Use emojis to highlight important information</li>
            <li>Always include the job link with <code className="bg-black/60 px-1 rounded">{'{{jobUrl}}'}</code></li>
            <li>Use relevant hashtags to increase reach</li>
            <li>Add an image to increase engagement</li>
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <h5 className="text-xs font-medium text-orange-300 mb-1">LinkedIn:</h5>
              <p className="text-xs text-gray-400">Character limit: ~1300 characters <br/>Best format: text with links</p>
            </div>
            <div>
              <h5 className="text-xs font-medium text-orange-300 mb-1">Telegram:</h5>
              <p className="text-xs text-gray-400">Supports HTML: <code className="bg-black/60 px-1 rounded">&lt;b&gt;text&lt;/b&gt;</code>, <code className="bg-black/60 px-1 rounded">&lt;a href=&quot;&quot;&gt;&lt;/a&gt;</code><br/>Hashtags work great</p>
            </div>
          </div>
        </div>
      </div>
      <h3 className="text-xl text-orange-300 mb-3 mt-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
        </svg>
        Pending Jobs for Promotion
      </h3>
      {loading ? (
        <div className="flex justify-center p-6">
          <div className="w-10 h-10 border-4 border-orange-500 rounded-full animate-spin border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-black/30 rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-white">
            <thead>
              <tr className="bg-black/60">
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-center">Promotions</th>
                <th className="p-3 text-left">Last Sent</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">
                    There are no jobs pending for promotion at this moment.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-t border-gray-800 hover:bg-black/40 transition-colors">
                    <td className="p-3 font-medium">{String(job.title ?? '')}</td>
                    <td className="p-3 text-gray-300">{String(job['companyName'] ?? '')}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full">
                        {job.socialMediaPromotionCount ?? 0} / {job.socialMediaPromotion}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 text-sm">
                      {job.socialMediaPromotionLastSent ? new Date(job.socialMediaPromotionLastSent).toLocaleString() : '—'}
                    </td>
                    <td className="p-3">
                      <button 
                        onClick={() => sendManualPost(job)} 
                        className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-1 rounded-lg hover:from-blue-700 hover:to-blue-600 shadow-sm shadow-blue-500/20 transition-all flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                        </svg>
                        Send
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSocialMediaManager;
