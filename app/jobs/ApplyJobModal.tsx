"use client";

import React, { useState } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "../../components/ui/button";

interface ApplyJobModalProps {
  jobId: string;
  open: boolean;
  onClose: () => void;
}

const ApplyJobModal: React.FC<ApplyJobModalProps> = ({ jobId, open, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await addDoc(collection(db, "applications"), {
        jobId,
        appliedAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError("Failed to submit application. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 rounded-lg shadow-lg p-8 max-w-md w-full relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-orange-400"
          onClick={onClose}
          disabled={isSubmitting}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-orange-400 mb-4">Apply for this Job</h2>
        {success ? (
          <div className="text-green-400 font-semibold text-center mb-4">Application submitted successfully!</div>
        ) : (
          <>
            <p className="mb-6 text-gray-300">Are you sure you want to apply for this job?</p>
            {error && <div className="text-red-400 mb-2">{error}</div>}
            <Button
              onClick={handleApply}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm Application"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ApplyJobModal;
