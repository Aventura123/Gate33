"use client";

import React, { useState } from 'react';

interface ContactFormProps {
  title?: string;
  submitButtonText?: string;
  className?: string;
  defaultSubject?: string;
  recipientEmail?: string;
  showSubjectField?: boolean;
  onSuccess?: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({
  title = "Contact Us",
  submitButtonText = "Send Message",
  className = "",
  defaultSubject = "",
  showSubjectField = true,
  onSuccess
}) => {
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim() || !email.trim() || !message.trim()) {
      setSubmitResult({
        success: false,
        message: "Please fill in all required fields."
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubmitResult({
        success: false,
        message: "Please provide a valid email address."
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject: subject || defaultSubject || "Contact form message",
          message
        }),
      });
      
      const data = await response.json();
      
      setSubmitResult({
        success: data.success,
        message: data.success ? "Message sent successfully" : (data.message || "Failed to send message")
      });
      
      // If successful, clear the form
      if (data.success) {
        setName("");
        setEmail("");
        setSubject(defaultSubject);
        setMessage("");
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Error sending form:", error);
      setSubmitResult({
        success: false,
        message: "An error occurred while sending your message. Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-black/50 rounded-lg p-6 ${className}`}>
      {title && <h2 className="text-2xl font-semibold text-blue-400 mb-4">{title}</h2>}
      
      {submitResult && (
        <div 
          className={`mb-4 p-3 rounded ${
            submitResult.success ? "bg-green-600/30 border border-green-500" : "bg-red-600/30 border border-red-500"
          }`}
        >
          <p className={submitResult.success ? "text-green-200" : "text-red-200"}>
            {submitResult.message}
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-gray-300 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-gray-300 mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        {showSubjectField && (
          <div>
            <label htmlFor="subject" className="block text-gray-300 mb-1">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        
        <div>
          <label htmlFor="message" className="block text-gray-300 mb-1">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={5}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Sending..." : submitButtonText}
        </button>
      </form>
    </div>
  );
};

export default ContactForm;