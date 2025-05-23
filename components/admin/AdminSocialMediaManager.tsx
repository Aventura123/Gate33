import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

interface SocialMediaJob {
  id: string;
  title?: string;
  companyName?: string;
  socialMediaPromotion?: number;
  socialMediaPromotionCount?: number;
  socialMediaPromotionLastSent?: string | null;
  // outros campos relevantes
}

const SOCIAL_MEDIA_TEMPLATE_KEY = 'socialMediaPostTemplate';

const defaultTemplate = `🚀 Nova vaga: {{title}} na {{companyName}}!\nConfira e candidate-se agora!`;

const AdminSocialMediaManager: React.FC = () => {
  const [jobs, setJobs] = useState<SocialMediaJob[]>([]);
  const [template, setTemplate] = useState<string>(defaultTemplate);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Carregar jobs com Social Media Promotion pendente
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

  // Carregar/salvar template do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SOCIAL_MEDIA_TEMPLATE_KEY);
    if (saved) setTemplate(saved);
  }, []);

  const saveTemplate = () => {
    setSaving(true);
    localStorage.setItem(SOCIAL_MEDIA_TEMPLATE_KEY, template);
    setSaving(false);
    setMessage('Modelo salvo!');
    setTimeout(() => setMessage(null), 2000);
  };

  // Função mock para envio manual
  const sendManualPost = async (job: SocialMediaJob) => {
    setMessage('Enviando...');
    // Aqui você pode integrar com a função real de envio
    await new Promise(r => setTimeout(r, 1000));
    // Atualiza o job no Firestore
    const jobDoc = doc(db, 'jobs', job.id);
    await updateDoc(jobDoc, {
      socialMediaPromotionCount: (job.socialMediaPromotionCount ?? 0) + 1,
      socialMediaPromotionLastSent: new Date().toISOString(),
    });
    setMessage('Post enviado!');
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <div className="p-6 bg-black/80 rounded-lg">
      <h2 className="text-2xl font-bold text-orange-400 mb-4">Social Media Promotion Manager</h2>
      <div className="mb-6">
        <label className="block text-orange-300 font-semibold mb-1">Modelo do Post (use {'{{title}}'}, {'{{companyName}}'}):</label>
        <textarea
          className="w-full p-2 rounded bg-black/50 border border-gray-700 text-white mb-2"
          rows={4}
          value={template}
          onChange={e => setTemplate(e.target.value)}
        />
        <button onClick={saveTemplate} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600" disabled={saving}>
          Salvar Modelo
        </button>
        {message && <span className="ml-4 text-green-400">{message}</span>}
      </div>
      <h3 className="text-xl text-orange-300 mb-2">Vagas pendentes para promoção:</h3>
      {loading ? <div>Carregando...</div> : (
        <table className="w-full text-white border border-gray-700">
          <thead>
            <tr className="bg-black/60">
              <th className="p-2">Título</th>
              <th className="p-2">Empresa</th>
              <th className="p-2">Promoções</th>
              <th className="p-2">Último envio</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-gray-700">
                <td className="p-2">{String(job.title ?? '')}</td>
                <td className="p-2">{String(job['companyName'] ?? '')}</td>
                <td className="p-2">{job.socialMediaPromotionCount ?? 0} / {job.socialMediaPromotion}</td>
                <td className="p-2">{job.socialMediaPromotionLastSent ? new Date(job.socialMediaPromotionLastSent).toLocaleString() : '-'}</td>
                <td className="p-2">
                  <button onClick={() => sendManualPost(job)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Enviar Manual</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminSocialMediaManager;
