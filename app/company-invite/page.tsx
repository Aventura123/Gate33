"use client";

import React, { useState, useEffect } from "react";
import Layout from '../../components/Layout';

const CompanyInvitePage: React.FC = () => {
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection effect
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    employees: "",
    yearsActive: "",
    email: "",
    password: "",
    confirmPassword: "",
    responsibleName: "",
    responsibleEmail: "",
    responsiblePhone: "",
    responsiblePosition: "",
    website: "",
    comments: "",
    taxId: "",
    registrationNumber: "",
    description: "",
    country: "",
    address: "",
    linkedin: "",
    telegram: "",
    twitter: "",
    facebook: "",
    instagram: ""
  });  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocFile(e.target.files[0]);
    }
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {      // Enhanced validation for VIP companies
      if (formData.password !== formData.confirmPassword) {
        setMessage("ERROR: Passwords do not match.");
        setIsSubmitting(false);
        return;
      }

      if (formData.password.length < 6) {
        setMessage("ERROR: Password must be at least 6 characters long.");
        setIsSubmitting(false);
        return;
      }

      if (!formData.companyName || !formData.email || !formData.taxId || !formData.responsibleName) {
        setMessage("ERROR: Please fill in all required fields.");
        setIsSubmitting(false);
        return;
      }

      if (!logoFile) {
        setMessage("ERROR: Company logo is required for VIP registration.");
        setIsSubmitting(false);
        return;
      }

      // Prepare data for API
      const submitData = {
        ...formData,
        logoFile: logoFile ? logoFile.name : "",
        docFile: docFile ? docFile.name : "",
      };

      // Call VIP registration API
      const response = await fetch('/api/company/vip-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        setShowSuccessCard(true);
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            companyName: "", industry: "", employees: "", yearsActive: "", email: "", password: "", confirmPassword: "",
            responsibleName: "", responsibleEmail: "", responsiblePhone: "", responsiblePosition: "", website: "",
            comments: "", taxId: "", registrationNumber: "", description: "", country: "", address: "",
            linkedin: "", telegram: "", twitter: "", facebook: "", instagram: ""
          });
          setLogoFile(null);
          setDocFile(null);
        }, 2000);
      } else {
        setMessage(`ERROR: ${result.message}`);
      }

      console.log("VIP Company registration result: ", result);    } catch (error) {
      console.error("Error submitting VIP company registration: ", error);
      setMessage("An error occurred. Please try again or contact our support team.");
    } finally {
      setIsSubmitting(false);
    }
  };return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-orange-900 to-black">        {showSuccessCard ? (
          // Success Card - Thank You Message
          <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className={`bg-black/40 border border-green-500/50 rounded-xl ${isMobile ? 'p-4' : 'p-6 lg:p-8'} backdrop-blur-sm`}>
                <div className={`${isMobile ? 'text-4xl mb-4' : 'text-6xl mb-6'}`}>🎉</div>
                  <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl md:text-4xl lg:text-5xl'} font-bold text-green-400 ${isMobile ? 'mb-4' : 'mb-6'}`}>
                  Registration Complete!
                </h1>
                  <div className={`bg-green-900/30 border border-green-500/30 rounded-lg ${isMobile ? 'p-4 mb-6' : 'p-6 mb-8'}`}>                  <h2 className={`${isMobile ? 'text-lg' : 'text-xl lg:text-2xl'} font-bold text-green-300 ${isMobile ? 'mb-3' : 'mb-4'}`}>
                    Welcome to Gate33 VIP! 🏆
                  </h2>
                  <p className={`text-white ${isMobile ? 'text-sm' : 'text-base lg:text-lg'} leading-relaxed ${isMobile ? 'mb-3' : 'mb-4'}`}>
                    Congratulations! Your registration as one of the <span className="text-green-400 font-bold">first 10 founding partners</span> has been successfully approved.
                  </p>
                  <p className={`text-gray-300 ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                    You will soon receive a confirmation email with all the details of your exclusive benefits, 
                    including the <span className="text-orange-400 font-bold">lifetime 20% discount</span> and your commemorative NFT.
                  </p>
                </div><div className={`bg-orange-500/20 border border-orange-400/30 rounded-lg ${isMobile ? 'p-4 mb-6' : 'p-6 mb-8'}`}>
                  <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-orange-400 mb-3`}>
                    ⏳ Next Steps
                  </h3>
                  <p className={`text-gray-300 ${isMobile ? 'text-sm' : 'text-sm'} leading-relaxed mb-3`}>                    Your account is temporarily blocked until the official platform launch. 
                    Once Gate33 is launched, you will receive an email to activate your full access.
                  </p>
                  <div className={`bg-orange-900/30 border border-orange-500/50 rounded ${isMobile ? 'p-2 mt-2' : 'p-3 mt-3'}`}>
                    <p className={`text-orange-200 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                      📧 <strong>Email sent to:</strong> {formData.email}<br/>
                      🏢 <strong>Company:</strong> {formData.companyName}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">                  <button 
                    onClick={() => window.location.href = '/'}
                    className={`w-full bg-gradient-to-r from-green-500 to-green-600 text-white ${isMobile ? 'p-3 text-base' : 'p-4 text-lg'} rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105`}
                  >
                    Back to Homepage
                  </button>
                  
                  <p className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Thank you for being part of the Web3 employment revolution! 🚀
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Original Registration Form
          <>        {/* Hero Section */}
        <div className={`relative ${isMobile ? 'py-6 px-4' : 'py-8 sm:py-12 lg:py-16 px-4'}`}>
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-6">
              <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'} font-bold mb-4`}>
                Exclusive Invitation
              </h1>
              <p className={`${isMobile ? 'text-base' : 'text-lg sm:text-xl md:text-2xl'} font-semibold`}>
                Join the First 10 Verified Companies
              </p>            </div>
            
            <div className={`bg-black/40 border border-orange-500/20 rounded-xl ${isMobile ? 'p-4 mb-6' : 'p-4 sm:p-6 lg:p-8 mb-8 lg:mb-12'} backdrop-blur-sm`}>
              <p className={`text-white ${isMobile ? 'text-sm' : 'text-base sm:text-lg md:text-xl'} leading-relaxed ${isMobile ? 'mb-4' : 'mb-4 lg:mb-6'}`}>
                You are being invited to become one of the first 10 verified companies on Gate33, 
                the revolutionary Web3 job platform where you can:
              </p>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6'} text-center`}>
                <div className={`bg-orange-500/20 rounded-lg ${isMobile ? 'p-3' : 'p-4 lg:p-6'}`}>
                  <div className={`${isMobile ? 'text-xl mb-2' : 'text-2xl lg:text-3xl mb-2 lg:mb-3'}`}>💼</div>
                  <h3 className={`text-orange-400 font-bold mb-2 ${isMobile ? 'text-sm' : 'text-sm lg:text-base'}`}>Post Job Offers</h3>
                  <p className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-xs lg:text-sm'}`}>Reach top Web3 talent and find the perfect candidates for your team</p>
                </div>
                
                <div className={`bg-orange-500/20 rounded-lg ${isMobile ? 'p-3' : 'p-4 lg:p-6'}`}>
                  <div className={`${isMobile ? 'text-xl mb-2' : 'text-2xl lg:text-3xl mb-2 lg:mb-3'}`}>🎓</div>
                  <h3 className={`text-orange-400 font-bold mb-2 ${isMobile ? 'text-sm' : 'text-sm lg:text-base'}`}>Learn2Earn Opportunities</h3>
                  <p className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-xs lg:text-sm'}`}>Create educational programs and reward participants with tokens</p>
                </div>
                
                <div className={`bg-orange-500/20 rounded-lg ${isMobile ? 'p-3' : 'p-4 lg:p-6'}`}>
                  <div className={`${isMobile ? 'text-xl mb-2' : 'text-2xl lg:text-3xl mb-2 lg:mb-3'}`}>⚡</div>
                  <h3 className={`text-orange-400 font-bold mb-2 ${isMobile ? 'text-sm' : 'text-sm lg:text-base'}`}>Hire Freelancers</h3>
                  <p className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-xs lg:text-sm'}`}>Access instant micro-tasks and skilled freelancers for quick projects</p>
                </div>
                
                <div className={`bg-orange-500/20 rounded-lg ${isMobile ? 'p-3' : 'p-4 lg:p-6'}`}>
                  <div className={`${isMobile ? 'text-xl mb-2' : 'text-2xl lg:text-3xl mb-2 lg:mb-3'}`}>🔧</div>
                  <h3 className={`text-orange-400 font-bold mb-2 ${isMobile ? 'text-sm' : 'text-sm lg:text-base'}`}>Crypto Tools</h3>
                  <p className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-xs lg:text-sm'}`}>Access advanced crypto trading tools and portfolio management features</p>
                </div>
              </div>
            </div>
          </div>
        </div>{/* Registration Form */}
        <div className={`max-w-6xl mx-auto px-4 ${isMobile ? 'pb-8' : 'pb-16'}`}>
          <div className={`bg-black/40 border border-orange-500/20 rounded-xl ${isMobile ? 'p-4' : 'p-8'} backdrop-blur-sm`}>
            <h2 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-orange-400 text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
              VIP Company Registration
            </h2>
            
            <form onSubmit={handleSubmit} className={`flex ${isMobile ? 'flex-col gap-6' : 'flex-col lg:flex-row gap-8'}`}>
              {/* Company Data */}
              <div className="flex-1 space-y-4">
                <h3 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-500 mb-4`}>Company Information</h3>
                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>                  <input 
                    type="text" 
                    name="companyName" 
                    placeholder="Company Name *" 
                    value={formData.companyName} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="text" 
                    name="industry" 
                    placeholder="Industry *" 
                    value={formData.industry} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="text" 
                    name="taxId" 
                    placeholder="Tax ID / VAT *" 
                    value={formData.taxId} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="text" 
                    name="registrationNumber" 
                    placeholder="Registration Number *" 
                    value={formData.registrationNumber} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="text" 
                    name="country" 
                    placeholder="Country *" 
                    value={formData.country} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="text" 
                    name="address" 
                    placeholder="Address *" 
                    value={formData.address} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="number" 
                    name="employees" 
                    placeholder="Number of Employees *" 
                    value={formData.employees} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="number" 
                    name="yearsActive" 
                    placeholder="Years Active *" 
                    value={formData.yearsActive} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="Company Email *" 
                    value={formData.email} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="url" 
                    name="website" 
                    placeholder="Website *" 
                    value={formData.website} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-700 rounded-lg text-white bg-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none`} 
                    required 
                  />
                </div>                <textarea 
                  name="description" 
                  placeholder="Company Description *" 
                  value={formData.description} 
                  onChange={handleChange} 
                  className={`w-full ${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none h-24`} 
                  required 
                />                <div className="space-y-3">
                  <label className="block text-sm font-medium text-orange-400">Company Logo (Required)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className={`w-full ${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600`} 
                    required 
                  />
                </div>                {/* Social Media Links */}
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                  <input type="url" name="linkedin" placeholder="LinkedIn (optional)" value={formData.linkedin} onChange={handleChange} className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} />
                  <input type="text" name="telegram" placeholder="Telegram (optional)" value={formData.telegram} onChange={handleChange} className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} />
                  <input type="text" name="twitter" placeholder="Twitter (optional)" value={formData.twitter} onChange={handleChange} className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} />
                  <input type="text" name="facebook" placeholder="Facebook (optional)" value={formData.facebook} onChange={handleChange} className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} />
                </div>
              </div>

              {/* Responsible Person Data */}
              <div className="flex-1 space-y-4">
                <h3 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-500 mb-4`}>Responsible Person</h3>
                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                  <input 
                    type="text" 
                    name="responsibleName" 
                    placeholder="Full Name *" 
                    value={formData.responsibleName} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="email" 
                    name="responsibleEmail" 
                    placeholder="Email *" 
                    value={formData.responsibleEmail} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="text" 
                    name="responsiblePosition" 
                    placeholder="Position *" 
                    value={formData.responsiblePosition} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="password" 
                    name="password" 
                    placeholder="Password *" 
                    value={formData.password} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} 
                    required 
                  />
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    placeholder="Confirm Password *" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    className={`${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`} 
                    required 
                  />
                </div>                <div className="space-y-3">
                  <label className="block text-sm font-medium text-orange-400">Phone Number *</label>
                  <input
                    type="tel"
                    name="responsiblePhone"
                    placeholder="Phone Number *"
                    value={formData.responsiblePhone}
                    onChange={handleChange}
                    className={`w-full ${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none`}
                    required
                  />
                </div>                <textarea 
                  name="comments" 
                  placeholder="Additional Comments (optional)" 
                  value={formData.comments} 
                  onChange={handleChange} 
                  className={`w-full ${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 placeholder-gray-400 focus:border-orange-500 focus:outline-none h-24`} 
                />                <div className="space-y-3">
                  <label className="block text-sm font-medium text-orange-400">Official Document (Optional)</label>
                  <input 
                    type="file" 
                    accept="application/pdf,image/*" 
                    onChange={handleDocFileChange} 
                    className={`w-full ${isMobile ? 'p-2 text-sm' : 'p-3'} border border-gray-600 rounded-lg text-white bg-black/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600`} 
                  />
                </div>

                {message && (
                  <div className="mt-4 p-4 rounded-lg">
                    {message.startsWith("ERROR:") ? (
                      <div className="bg-red-900/50 border border-red-500 text-red-300">
                        <p>{message.replace("ERROR: ", "")}</p>
                      </div>
                    ) : (
                      <div className="bg-green-900/50 border border-green-500 text-green-300">
                        <p>{message}</p>
                      </div>
                    )}
                  </div>
                )}                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white ${isMobile ? 'p-3 text-base' : 'p-4 text-lg'} rounded-lg font-bold hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105`}
                >
                  {isSubmitting ? 'Submitting...' : 'Join as VIP Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>        {/* CEO Message Section */}
        <div className={`max-w-5xl mx-auto px-4 ${isMobile ? 'pb-8' : 'pb-16'}`}>
          <div className={`bg-black/40 border border-orange-500/20 rounded-xl ${isMobile ? 'p-4' : 'p-8'} backdrop-blur-sm`}>
            <h2 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-orange-400 text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
              Message from our CEO
            </h2>
              <div className={`flex ${isMobile ? 'flex-col items-center gap-6' : 'flex-col lg:flex-row items-start gap-8'}`}>
              {/* CEO Photo - Better positioned and sized */}
              <div className="flex-shrink-0 lg:self-start">
                <div className={`text-center ${!isMobile ? 'lg:text-left' : ''}`}>
                  <img
                    src="/1747260152226.jpeg"
                    alt="André Ventura - CEO & Founder"
                    className={`${isMobile ? 'w-32 h-32' : 'w-48 h-48 lg:w-56 lg:h-56'} rounded-full object-cover border-4 border-orange-400/50 shadow-xl mx-auto ${!isMobile ? 'lg:mx-0' : ''}`}
                  />
                  <div className={`${isMobile ? 'mt-3' : 'mt-4'}`}>
                    <p className={`text-orange-400 font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>André Ventura</p>
                    <p className={`text-gray-400 font-medium ${isMobile ? 'text-sm' : ''}`}>CEO & Founder</p>
                    <p className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Gate33</p>
                  </div>
                </div>
              </div>
              
              {/* CEO Message */}
              <div className={`flex-1 text-white ${!isMobile ? 'lg:pt-4' : ''}`}>
                <blockquote className={`${isMobile ? 'text-sm' : 'text-lg lg:text-xl'} leading-relaxed ${isMobile ? 'mb-4' : 'mb-6'}`}>
                  "At Gate33, we are committed to bringing security, transparency, and innovation to the Web3 employment ecosystem. Your participation in this foundational phase is instrumental to our mission, which is why we are honored to offer you a <span className="text-orange-400 font-bold">lifetime 20% discount</span> on all platform services."
                </blockquote>
                  <blockquote className={`${isMobile ? 'text-sm' : 'text-lg lg:text-xl'} leading-relaxed ${isMobile ? 'mb-4' : 'mb-6'}`}>
                  "In a rapidly evolving industry that values innovation and integrity, we strive to partner with organizations that share our commitment to excellence and positive impact. Your company represents the caliber of leadership we believe will shape the future of work in the Web3 ecosystem."
                </blockquote>
                
                <div className={`${isMobile ? 'mt-6 pt-4' : 'mt-8 pt-6'} border-t border-orange-400/30 ${isMobile ? 'text-center' : 'lg:text-right'}`}>
                  <p className={`text-orange-400 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>With sincere gratitude,</p>
                  <p className={`text-orange-400 font-bold ${isMobile ? 'text-lg' : 'text-2xl'} italic ${isMobile ? 'mt-1' : 'mt-2'}`}>André Ventura</p>
                </div>
              </div>
            </div>
              {/* Special Benefits Highlight */}
            <div className={`${isMobile ? 'mt-6' : 'mt-8'} bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-400/50 rounded-xl ${isMobile ? 'p-4' : 'p-6'}`}>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-orange-400 ${isMobile ? 'mb-4' : 'mb-6'} text-center`}>
                Exclusive Founding Partner Benefits
              </h3>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'md:grid-cols-4 gap-4'} text-center`}>                <div className="text-white">
                  <div className={`${isMobile ? 'text-xl mb-1' : 'text-2xl mb-2'}`}>🎯</div>
                  <p className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Lifetime 20% Discount</p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-300`}>On all platform services</p>
                </div>
                <div className="text-white">
                  <div className={`${isMobile ? 'text-xl mb-1' : 'text-2xl mb-2'}`}>⚡</div>
                  <p className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Priority Support</p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-300`}>24h response guarantee</p>
                </div>
                <div className="text-white">
                  <div className={`${isMobile ? 'text-xl mb-1' : 'text-2xl mb-2'}`}>👑</div>
                  <p className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Verified Founder Badge</p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-300`}>Exclusive recognition</p>
                </div>
                <div className="text-white">
                  <div className={`${isMobile ? 'text-xl mb-1' : 'text-2xl mb-2'}`}>🖼️</div>
                  <p className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Exclusive NFT Collection</p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-300`}>"First 10" commemorative NFT</p>
                </div>
              </div>
                {/* NFT Collection Details */}              <div className={`${isMobile ? 'mt-4' : 'mt-6'} bg-black/30 border border-orange-400/30 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                <h4 className={`text-orange-400 font-bold ${isMobile ? 'mb-1 text-sm' : 'mb-2'} text-center`}>🏆 "Gate33 Founding Partners" NFT Collection</h4>
                <p className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'} text-center leading-relaxed`}>
                  As one of our first 10 verified companies, you'll have an NFT with your logo in the collection that represents your foundational role in Gate33's journey. 
                  This limited collection not only serves as a digital certificate of your pioneering status but can help finance Gate33's initial development phase. 
                  <span className="text-orange-400 font-semibold"> Your NFT will be a valuable piece of Web3 employment history.</span>
                </p>
              </div>            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default CompanyInvitePage;
