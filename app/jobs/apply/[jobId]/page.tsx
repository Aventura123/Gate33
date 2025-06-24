"use client";

import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db, storage } from "../../../../lib/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "../../../../components/ui/button";
import { useToast } from "../../../../hooks/use-toast";
import Layout from "../../../../components/Layout";
import AdsSidebar from '../../AdsSidebar';

export default function ApplyJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { jobId } = use(params);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Seeker profile fields
  const [seeker, setSeeker] = useState<any>(null);  const [name, setName] = useState("");  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");  const [phoneCountry, setPhoneCountry] = useState("+1-US");
  const [resumeLetter, setResumeLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileName, setCvFileName] = useState("");
  const [cvUploading, setCvUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [linkedinProfile, setLinkedinProfile] = useState("");
  const [githubProfile, setGithubProfile] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [web3Experience, setWeb3Experience] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Fetch job data
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobRef = doc(db, "jobs", jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {          const jobData = jobSnap.data();
          console.log('Job data:', jobData); // Log para verificar a estrutura do objeto job
          setJob(jobData);
          
          // Initialize screening answers array with empty strings based on questions
          if (Array.isArray(jobData.screeningQuestions)) {
            setScreeningAnswers(new Array(jobData.screeningQuestions.length).fill(""));
          }
        } else {
          setError("Job not found.");
        }
      } catch (err) {
        setError("Error loading job.");
      } finally {
        setLoading(false);
      }    };
    fetchJob();
  }, [jobId]);

  // Fetch seeker profile (simulate auth)
  useEffect(() => {    const token = typeof window !== "undefined" ? localStorage.getItem("seekerToken") : null;
    if (!token) {
      router.replace("/login?redirect=/jobs/apply/" + jobId);
      return;
    }
    const seekerId = atob(token);    async function fetchProfile() {
      const seekerRef = doc(db, "seekers", seekerId);
      const seekerSnap = await getDoc(seekerRef);
      if (seekerSnap.exists()) {
        const data = seekerSnap.data();
        console.log('Seeker data:', data); // Log para verificar a estrutura dos dados do seeker
        setSeeker(data);

        // Basic contact data
        setName(data.fullName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.name || ""));
        setEmail(data.email || "");
        setPhone(data.phone || data.phoneNumber || "");        if (data.phoneCountry) {
          // Check if the format already contains the prefix
          if (data.phoneCountry.startsWith('+')) {
            setPhoneCountry(data.phoneCountry);
          } else {
            // Map old country codes to the new format
            const countryCodeMap: {[key: string]: string} = {
              "US": "+1-US",
              "GB": "+44-GB",
              "BR": "+55-BR",
              "DE": "+49-DE",
              "IN": "+91-IN",
              "JP": "+81-JP",
              "AU": "+61-AU",
              "FR": "+33-FR",
              "ES": "+34-ES",
              "IT": "+39-IT",
              "RU": "+7-RU",
              "CN": "+86-CN",
              "PT": "+351-PT"
            };
            setPhoneCountry(countryCodeMap[data.phoneCountry] || "+1-US");
          }
        }

        // Social and professional profiles
        setLinkedinProfile(data.linkedinProfile || data.linkedin || "");
        setGithubProfile(data.githubProfile || data.github || "");
        setTelegramHandle(data.telegramHandle || data.telegram || "");
        setPortfolioUrl(data.portfolioUrl || data.website || data.portfolio || "");
        // Professional data
        setWeb3Experience(data.web3Experience || "");
        setCurrentSalary(data.currentSalary || data.salary || "");
        setYearsOfExperience(data.yearsOfExperience || data.experience || "");
        if (data.resumeUrl) {
          // If seeker has a resume, show its name for reference
          const resumeFileName = data.resumeUrl.split('/').pop() || "Current resume";
          setCvFileName(resumeFileName);
        }
      }    }
    fetchProfile();
  }, [jobId, router]);

  // Handle CV file selection
  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCvFile(file);
      setCvFileName(file.name);
    }
  };

  // Handle screening answers
  const handleScreeningChange = (idx: number, value: string) => {
    setScreeningAnswers(prev => {
      const arr = [...prev];
      arr[idx] = value;
      return arr;
    });
  };

  // Upload CV file to Firebase Storage
  const uploadCV = async (file: File, seekerId: string): Promise<string> => {
    try {
      setCvUploading(true);
      const fileExt = file.name.split('.').pop() || "";
      const timestamp = Date.now();
      const fileName = `${seekerId}_${timestamp}.${fileExt}`;
      const filePath = `resumes/${fileName}`;
      
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update seeker profile with new CV URL
      const seekerRef = doc(db, "seekers", seekerId);
      await updateDoc(seekerRef, {
        resumeUrl: downloadURL
      });
      
      return downloadURL;
    } catch (err) {
      console.error("Error uploading CV:", err);
      throw new Error("Failed to upload CV");
    } finally {
      setCvUploading(false);
    }
  };
  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    
    try {
      // Get seeker ID from token
      const token = localStorage.getItem("seekerToken");
      if (!token) {
        setError("Authentication error. Please login again.");
        setSubmitting(false);
        return;
      }
      
      const seekerId = atob(token);
      
      // CV Upload handling
      let cvUrl = seeker?.resumeUrl || "";
      
      // If a new CV file was selected, upload it
      if (cvFile) {
        try {
          cvUrl = await uploadCV(cvFile, seekerId);
          toast({ 
            title: "CV Uploaded",
            description: "Your CV was uploaded successfully",
            variant: "success"
          });
        } catch (err) {
          setError("Failed to upload CV. Please try again.");
          setSubmitting(false);
          return;
        }
      }
      
      // Criar o documento de aplicação no Firestore
      const applicationData = {
        jobId: jobId,
        jobTitle: job?.title,
        companyId: job?.companyId,
        companyName: job?.companyName,
        seekerId,
        seekerName: name,
        seekerEmail: email,
        seekerPhone: phone,
        phoneCountry: phoneCountry,
        resumeLetter,
        whyIdealCandidate: resumeLetter, // Unified with cover letter
        cvUrl,
        videoUrl,
        linkedinProfile,
        githubProfile,
        telegramHandle,
        portfolioUrl,
        yearsOfExperience,
        web3Experience,
        currentSalary,
        screeningAnswers,
        appliedAt: serverTimestamp(),
        status: "pending", // Initial status
      };
      
      // Salvar na coleção applications
      const applicationRef = await addDoc(collection(db, "applications"), applicationData);
      
      // Update seeker profile with the new information
      try {
        const seekerRef = doc(db, "seekers", seekerId);
        await updateDoc(seekerRef, {
          fullName: name,
          email: email,
          phone: phone,
          phoneCountry: phoneCountry,
          linkedinProfile: linkedinProfile,
          githubProfile: githubProfile,
          telegramHandle: telegramHandle,
          portfolioUrl: portfolioUrl,
          web3Experience: web3Experience, 
          currentSalary: currentSalary,
          yearsOfExperience: yearsOfExperience,
          lastUpdated: serverTimestamp()
        });
      } catch (error) {
        console.error("Error updating seeker profile:", error);
        // We don't want to block the application process if profile update fails
      }
        // Enviar e-mail de notificação e criar notificação no sistema
      try {
        const notificationResponse = await fetch('/api/jobs/application-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...applicationData,
            screeningQuestions: job?.screeningQuestions || [],
          }),
        });
        
        const notificationData = await notificationResponse.json();
        
        if (!notificationData.success) {
          console.warn("Notification emails could not be sent:", notificationData.message);
        } else {
          console.log("Application notification sent successfully");
          
          // Se os emails foram enviados, mostrar notificação de sucesso para o usuário
          toast({ 
            title: "Application Submitted Successfully",
            description: "The company has been notified of your application",
            variant: "success"
          });
        }
      } catch (notificationErr) {
        console.error("Failed to send application notification:", notificationErr);
        // Não bloquear o processo de aplicação se o envio de e-mail falhar
      }
      
      setSuccess(true);
    } catch (err) {
      console.error("Application submission error:", err);
      setError("Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };
  const renderContent = () => {
    if (loading) return <div className="text-center text-gray-300 py-12">Loading...</div>;
    if (error) return <div className="text-center text-red-400 py-12">{error}</div>;
    if (success) return (
      <div className="bg-black/70 rounded-lg p-8 text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-orange-400 mb-4">Application Submitted!</h2>
        <p className="text-gray-200 mb-4">Your application was sent successfully.</p>
        <Button onClick={() => router.push("/seeker-dashboard")}>Go to Dashboard</Button>
      </div>
    );
    return (
      <div className="bg-black/70 rounded-lg p-5 lg:p-8 shadow-lg border border-orange-500/30 w-full">{/* Job header */}
        <div className="border-b border-orange-500/20 pb-5 mb-6">
          <h1 className="text-3xl font-bold text-orange-400 mb-3">Apply for: {job?.title || "Job"}</h1>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center">
              <span className="inline-flex items-center bg-orange-500/20 text-orange-300 text-sm px-3 py-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {job?.companyName || "Company"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center bg-black/40 text-gray-300 text-sm px-3 py-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                </svg>
                {job?.location || "Remote"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center bg-black/40 text-gray-300 text-sm px-3 py-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {job?.jobType || job?.type || "Full-time"}
              </span>
            </div>            {(job?.salary || job?.salaryRange || job?.salaryMin || job?.salaryMax) && (
              <div className="flex items-center">
                <span className="inline-flex items-center bg-green-500/20 text-green-300 text-sm px-3 py-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {job?.salary ? job.salary : 
                   job?.salaryRange ? job.salaryRange : 
                   (job?.salaryMin && job?.salaryMax) ? `${job.salaryMin} - ${job.salaryMax}` :
                   job?.salaryMin ? `From ${job.salaryMin}` :
                   job?.salaryMax ? `Up to ${job.salaryMax}` : 
                   "Competitive Salary"}
                </span>
              </div>
            )}
          </div>          <div className="text-gray-300 mt-4 mb-4 bg-black/30 p-4 rounded-md border border-orange-500/10">
            {job?.description}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {job?.requirements && (
              <div className="bg-black/30 p-4 rounded-md border border-orange-500/10">
                <h3 className="text-orange-300 text-lg font-semibold mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Requirements
                </h3>
                <div className="text-gray-300">
                  {typeof job.requirements === 'string' ? job.requirements : 
                    Array.isArray(job.requirements) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {job.requirements.map((req: string, idx: number) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    ) : null
                  }
                </div>
              </div>
            )}
            {job?.responsibilities && (
              <div className="bg-black/30 p-4 rounded-md border border-orange-500/10">
                <h3 className="text-orange-300 text-lg font-semibold mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Responsibilities
                </h3>
                <div className="text-gray-300">
                  {typeof job.responsibilities === 'string' ? job.responsibilities : 
                    Array.isArray(job.responsibilities) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {job.responsibilities.map((resp: string, idx: number) => (
                          <li key={idx}>{resp}</li>
                        ))}
                      </ul>
                    ) : null
                  }
                </div>
              </div>
            )}
          </div>
          {/* Ideal Candidate Section */}
          {job?.idealCandidate && (
            <div className="bg-black/30 p-4 rounded-md border border-orange-500/10 mb-4">
              <h3 className="text-orange-300 text-lg font-semibold mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Ideal Candidate
              </h3>
              <div className="text-gray-300">
                {job.idealCandidate}
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-orange-300 mb-1 font-semibold">Name *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-orange-300 mb-1 font-semibold">Email *</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="Your email address"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">            <div>
              <label className="block text-orange-300 mb-1 font-semibold">Phone Number</label>
              <div className="flex">                <select
                  value={phoneCountry}
                  onChange={e => setPhoneCountry(e.target.value)}
                  className="p-3 rounded-l bg-black/40 border border-orange-500/30 text-white min-w-[100px]"
                >
                  <option value="+1-US">🇺🇸 +1</option>
                  <option value="+44-GB">🇬🇧 +44</option>
                  <option value="+55-BR">🇧🇷 +55</option>
                  <option value="+49-DE">🇩🇪 +49</option>
                  <option value="+91-IN">🇮🇳 +91</option>
                  <option value="+81-JP">🇯🇵 +81</option>
                  <option value="+61-AU">🇦🇺 +61</option>
                  <option value="+33-FR">🇫🇷 +33</option>
                  <option value="+34-ES">🇪🇸 +34</option>
                  <option value="+39-IT">🇮🇹 +39</option>
                  <option value="+7-RU">🇷🇺 +7</option>
                  <option value="+86-CN">🇨🇳 +86</option>
                  <option value="+351-PT">🇵🇹 +351</option>
                  <option value="+971-AE">🇦🇪 +971</option>
                  <option value="+27-ZA">🇿🇦 +27</option>
                  <option value="+52-MX">🇲🇽 +52</option>
                  <option value="+1-CA">🇨🇦 +1</option>
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-3 rounded-r bg-black/40 border-y border-r border-orange-500/30 text-white"
                  placeholder="Your phone number"
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div>
              <label className="block text-orange-300 mb-1 font-semibold">LinkedIn Profile</label>
              <input
                type="url"
                value={linkedinProfile}
                onChange={e => setLinkedinProfile(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-orange-300 mb-1 font-semibold">GitHub Profile</label>
              <input
                type="url"
                value={githubProfile}
                onChange={e => setGithubProfile(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="https://github.com/yourusername"
              />
            </div>
            <div>
              <label className="block text-orange-300 mb-1 font-semibold">Telegram Handle</label>
              <input
                type="text"
                value={telegramHandle}
                onChange={e => setTelegramHandle(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="@yourusername"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">            <div>
              <label className="block text-orange-300 mb-1 font-semibold">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={yearsOfExperience}
                onChange={e => setYearsOfExperience(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-orange-300 mb-1 font-semibold">Web3 Experience (years)</label>
              <input
                type="number"
                min="0"
                max="20"
                value={web3Experience}
                onChange={e => setWeb3Experience(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="2"
              />
            </div>
            <div>
              <label className="block text-orange-300 mb-1 font-semibold">Current Salary (USD)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={currentSalary}
                onChange={e => setCurrentSalary(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="80000"
              />
            </div>
          </div>
          <div>
            <label className="block text-orange-300 mb-1 font-semibold">Portfolio/Website</label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={e => setPortfolioUrl(e.target.value)}
              className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
              placeholder="https://your-portfolio.com"
            />
          </div>
          <div>
            <label className="block text-orange-300 mb-1 font-semibold">
              {job?.requireCV ? "Upload CV/Resume * (PDF, DOC, DOCX)" : "Upload CV/Resume (PDF, DOC, DOCX)"}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleCvFileChange}
                className="w-full text-white"
                required={job?.requireCV && !seeker?.resumeUrl}
              />
              {cvUploading && <div className="text-orange-400">Uploading...</div>}
            </div>
            {seeker?.resumeUrl && !cvFile && (
              <div className="text-xs text-orange-400 mt-1">
                Current CV: <span className="font-semibold">{cvFileName}</span>
                <a href={seeker.resumeUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline">
                  View
                </a>
              </div>
            )}
          </div>
          <div>
            <label className="block text-orange-300 mb-1 font-semibold">Cover Letter *</label>
            <textarea
              required
              value={resumeLetter}
              onChange={e => setResumeLetter(e.target.value)}
              className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white min-h-[150px]"
              placeholder="Write your cover letter here explaining your background, skills, and why you're interested in this position..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Introduce yourself, highlight your relevant experience, and explain your interest in this role
            </p>
          </div>
          {job?.requireVideo && (
            <div>
              <label className="block text-orange-300 mb-1 font-semibold">Video Application (URL) *</label>
              <input
                type="url"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="w-full p-3 rounded bg-black/40 border border-orange-500/30 text-white"
                placeholder="YouTube, Loom, etc."
                required={job.requireVideo}
              />
              <p className="text-xs text-gray-400 mt-1">
                Upload a short video introduction to YouTube, Loom, or other video platform and paste the link here
              </p>
            </div>
          )}
          {Array.isArray(job?.screeningQuestions) && job.screeningQuestions.length > 0 && false && (
            <div>
              <label className="block text-orange-300 mb-2 font-semibold">Screening Questions</label>
              {job.screeningQuestions.map((q: string, idx: number) => (
                <div key={idx} className="mb-4 bg-black/30 p-3 rounded border border-orange-500/20">
                  <div className="text-gray-300 mb-2 font-medium">{q}</div>
                  <textarea
                    value={screeningAnswers[idx] || ""}
                    onChange={e => handleScreeningChange(idx, e.target.value)}
                    className="w-full p-2 rounded bg-black/50 border border-orange-500/30 text-white min-h-[80px]"
                    placeholder="Your answer"
                    required
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-8">
            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg shadow-md" 
              disabled={submitting || cvUploading}
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting Application...
                </span>
              ) : "Submit Application"}
            </Button>
            <div className="mt-4 flex justify-center">
              <button 
                type="button" 
                onClick={() => router.push('/jobs')}
                className="text-orange-400 hover:text-orange-300 text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Not interested? Back to job listings
              </button>
            </div>
          </div>
          {error && <div className="text-red-400 mt-3 text-center p-2 bg-red-900/20 rounded border border-red-500/20">{error}</div>}
        </form>
      </div>
    );
  };  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black via-[#18181b] to-black pt-16 md:pt-20 pb-12 px-3 sm:px-5 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-14 gap-4 lg:gap-6">
          {/* Ads column (left) */}
          <div className="lg:col-span-2 xl:col-span-2 order-2 lg:order-1">
            <AdsSidebar />
          </div>
          {/* Main Content */}
          <div className="lg:col-span-7 xl:col-span-9 order-1 lg:order-2">
            {renderContent()}
          </div>
          {/* Coluna de vagas relacionadas (à direita do formulário) */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-2 order-2 lg:order-3">
            <AdsSidebar currentJobId={jobId} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
