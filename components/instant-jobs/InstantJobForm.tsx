"use client";

import React, { useState, useEffect } from "react";
import instantJobsService, { InstantJobFormData, defaultInstantJobFormData } from "../../services/instantJobsService";

interface InstantJobFormProps {
  companyId: string;
  companyName: string;
  onJobCreated: () => void;
  onCancel: () => void;
}

const InstantJobForm: React.FC<InstantJobFormProps> = ({
  companyId,
  companyName,
  onJobCreated,
  onCancel
}) => {
  const [formData, setFormData] = useState<InstantJobFormData>({
    ...defaultInstantJobFormData,
    companyName: companyName
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const mobileByAgent = Boolean(
        userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i)
      );
      const mobileByWidth = window.innerWidth <= 768;
      setIsMobile(mobileByAgent || mobileByWidth);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Generic input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Number input change handler
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value ? Number(value) : 0 }));
  };

  // Handle comma-separated lists (tags)
  const handleArrayInput = (e: React.ChangeEvent<HTMLInputElement>, field: 'tags') => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      [field]: value.split(',').map(item => item.trim()).filter(Boolean)
    }));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      // Validate form data
      const validation = instantJobsService.validateInstantJobData(formData);
      
      if (!validation.isValid) {
        setErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }

      // Prepare data for submission
      const jobData = instantJobsService.prepareInstantJobData(formData, companyId);
      
      // Create the job
      const jobId = await instantJobsService.createInstantJob(jobData);
      
      // Notify parent component
      onJobCreated();
      
      // Reset form
      setFormData(defaultInstantJobFormData);
      
    } catch (error) {
      console.error("Error creating instant job:", error);
      setErrors([error instanceof Error ? error.message : "An unknown error occurred"]);
    } finally {
      setIsSubmitting(false);
    }  };
  return (
    <div>
      {errors.length > 0 && (
        <div className="bg-red-900/50 border border-red-500 p-4 mb-6 rounded-lg">
          <p className="text-red-400 font-medium mb-2">Please fix the following errors:</p>
          <ul className="list-disc pl-5">
            {errors.map((error, index) => (
              <li key={index} className="text-red-300">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Grid layout for form fields on larger screens */}
        <div className={`${isMobile ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}`}>
          {/* Job Title */}
          <div className={isMobile ? 'mb-4' : ''}>
            <label htmlFor="title" className="block text-white mb-2">
              Job Title<span className="text-orange-400">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Solidity Engineer"
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
              required
            />
          </div>

          {/* Company Name */}
          <div className={isMobile ? 'mb-4' : ''}>
            <label htmlFor="companyName" className="block text-white mb-2">
              Company Name<span className="text-orange-400">*</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder="e.g., CryptoCoin — Keep it short. Dont write Inc. Ltd."
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
              required
            />
          </div>
        </div>

        {/* Job Description */}
        <div>
          <label htmlFor="description" className="block text-white mb-2">
            Job Description<span className="text-orange-400">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe the job in detail..."
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white h-32"
            required
          />
        </div>        

        {/* Budget and Currency - Responsive layout */}
        <div>
          <label className="block text-white mb-2">
            Budget<span className="text-orange-400">*</span>
          </label>
          <div className="flex gap-2">
            <input
              name="budget"
              type="number"
              min="0"
              step="0.01"
              value={formData.budget || ""}
              onChange={handleNumberChange}
              placeholder="Budget amount"
              className="w-3/4 p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
              required
            />
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-1/4 p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
            >
              <option value="ETH">ETH</option>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="BNB">BNB</option>
              <option value="AVAX">AVAX</option>
            </select>
          </div>
        </div>

        {/* Category and Deadline in a grid for larger screens */}
        <div className={`${isMobile ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}`}>
          {/* Category */}
          <div className={isMobile ? 'mb-4' : ''}>
            <label htmlFor="category" className="block text-white mb-2">
              Category<span className="text-orange-400">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
              required
            >
              <option value="">Select a category</option>
              <option value="Development">Development</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Content">Content</option>
              <option value="Research">Research</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Deadline */}
          <div className={isMobile ? 'mb-4' : ''}>
            <label htmlFor="deadline" className="block text-white mb-2">
              Deadline<span className="text-orange-400">*</span>
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              value={formData.deadline instanceof Date ? formData.deadline.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : new Date();
                setFormData(prev => ({ ...prev, deadline: date }));
              }}
              className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
              required
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-white mb-2">Tags</label>
          <input
            type="text"
            value={formData.tags.join(', ')}
            onChange={(e) => handleArrayInput(e, 'tags')}
            placeholder="e.g., Web3, Solidity, Remote, Full Time"
            className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white"
          />
        </div>

        {/* Actions - Optimized for mobile with more touch area and flex layout */}
        <div className={`flex ${isMobile ? 'flex-col' : 'justify-end'} mt-6 gap-2`}>
          <button 
            type="button" 
            className={`${isMobile ? 'w-full mb-2 py-3' : 'py-2 px-4'} bg-gray-600 hover:bg-gray-700 text-white rounded text-center`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className={`${isMobile ? 'w-full py-3' : 'py-2 px-4'} bg-orange-500 hover:bg-orange-600 text-white rounded`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Micro-task'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InstantJobForm;
