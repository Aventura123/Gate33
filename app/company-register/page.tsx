"use client";

import React, { useState } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import "../../components/global.css";
import Layout from '../../components/Layout';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const isProduction = process.env.NEXT_PUBLIC_DEPLOY_STAGE === "production";

const CompanyRegisterPage: React.FC = () => {
  if (isProduction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-orange-500">Coming Soon</h1>
          <p className="text-lg text-gray-300">This feature will be available soon.</p>
        </div>
      </div>
    );
  }

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
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      if (!db) {
        throw new Error("Database is not initialized.");
      }      // Check for duplicate company by name, email, or taxId
      const companiesRef = collection(db, "pendingCompanies");
      const q = query(
        companiesRef,
        where("companyName", "==", formData.companyName),
      );
      const q2 = query(
        companiesRef,
        where("email", "==", formData.email),
      );
      const q3 = query(
        companiesRef,
        where("taxId", "==", formData.taxId),
      );
      // Check also for responsible person's contact info
      const q7 = query(
        companiesRef,
        where("responsibleEmail", "==", formData.responsibleEmail),
      );
      const q8 = query(
        companiesRef,
        where("responsiblePhone", "==", formData.responsiblePhone),
      );
      
      const [snap1, snap2, snap3, snap7, snap8] = await Promise.all([
        getDocs(q),
        getDocs(q2),
        getDocs(q3),
        getDocs(q7),
        getDocs(q8)
      ]);
      
      if (!snap1.empty || !snap2.empty || !snap3.empty) {
        setMessage("ERROR: A company with the same name, email, or tax ID is already registered and pending approval.");
        return;
      }
      
      // Check if the responsible person is already registered
      if (!snap7.empty) {
        setMessage("ERROR: An account with the same responsible person's email already exists. Please use forgot password to recover access.");
        return;
      }
      
      if (!snap8.empty) {
        setMessage("ERROR: An account with the same responsible person's phone number already exists. Please use forgot password to recover access.");
        return;
      }
      
      // Optionally, check also in approved companies
      const approvedRef = collection(db, "companies");
      const q4 = query(approvedRef, where("companyName", "==", formData.companyName));
      const q5 = query(approvedRef, where("email", "==", formData.email));
      const q6 = query(approvedRef, where("taxId", "==", formData.taxId));
      const q9 = query(approvedRef, where("responsibleEmail", "==", formData.responsibleEmail));
      const q10 = query(approvedRef, where("responsiblePhone", "==", formData.responsiblePhone));
      
      const [snap4, snap5, snap6, snap9, snap10] = await Promise.all([
        getDocs(q4),
        getDocs(q5),
        getDocs(q6),
        getDocs(q9),
        getDocs(q10)
      ]);
      
      if (!snap4.empty || !snap5.empty || !snap6.empty) {
        setMessage("ERROR: A company with the same name, email, or tax ID is already approved and registered.");
        return;
      }
      
      // Check if the responsible person is already registered in approved companies
      if (!snap9.empty) {
        setMessage("ERROR: An account with the same responsible person's email already exists. Please use forgot password to recover access.");
        return;
      }
      
      if (!snap10.empty) {
        setMessage("ERROR: An account with the same responsible person's phone number already exists. Please use forgot password to recover access.");
        return;
      }
      // Add document to pendingCompanies
      const docRef = await addDoc(collection(db, "pendingCompanies"), {
        ...formData,
        logoUrl: logoFile ? logoFile.name : "", // Placeholder, should be URL after upload
        docUrl: docFile ? docFile.name : "", // Placeholder, should be URL after upload
        status: "pending",
        createdAt: new Date().toISOString(),
      });      setMessage("Registration submitted successfully. Awaiting approval.");
      // Instead of reloading the page, redirect to the login page after a short delay
      setTimeout(() => window.location.href = "/login", 1500);
      console.log("Document written with ID: ", docRef.id);
    } catch (error) {
      console.error("Error adding document: ", error);
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-900">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-xl w-full max-w-5xl flex flex-col md:flex-row gap-8">
          {/* Company Data */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <h2 className="text-2xl font-bold mb-2 text-orange-500">Company Data</h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" name="companyName" placeholder="Company Name" value={formData.companyName} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="text" name="industry" placeholder="Industry" value={formData.industry} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="text" name="taxId" placeholder="Tax ID / VAT" value={formData.taxId} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="text" name="registrationNumber" placeholder="Registration Number" value={formData.registrationNumber} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="text" name="country" placeholder="Country" value={formData.country} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="number" name="employees" placeholder="Employees" value={formData.employees} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="number" name="yearsActive" placeholder="Years Active" value={formData.yearsActive} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="email" name="email" placeholder="Company Email" value={formData.email} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="url" name="website" placeholder="Website" value={formData.website} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="url" name="linkedin" placeholder="LinkedIn (optional)" value={formData.linkedin} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" />
              <input type="text" name="telegram" placeholder="Telegram (optional)" value={formData.telegram} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" />
              <input type="text" name="twitter" placeholder="Twitter (optional)" value={formData.twitter} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" />
              <input type="text" name="facebook" placeholder="Facebook (optional)" value={formData.facebook} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" />
              <input type="text" name="instagram" placeholder="Instagram (optional)" value={formData.instagram} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" />
            </div>
            <textarea name="description" placeholder="Company Description" value={formData.description} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm mt-2" rows={2} required />
            <div className="flex flex-col mt-2">
              <label className="text-sm font-medium text-gray-700 mb-1">Company Logo (required, 1 file)</label>
              <input type="file" name="logo" accept="image/*" onChange={handleFileChange} className="p-2 border rounded text-black bg-white text-sm" required />
            </div>
          </div>
          {/* Responsible Person Data */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <h2 className="text-2xl font-bold mb-2 text-orange-500">Responsible Person</h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" name="responsibleName" placeholder="Full Name" value={formData.responsibleName} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="email" name="responsibleEmail" placeholder="Email" value={formData.responsibleEmail} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <div className="col-span-2">
                <PhoneInput
                  country={'pt'}
                  value={formData.responsiblePhone}
                  onChange={phone => setFormData({ ...formData, responsiblePhone: phone })}
                  inputClass="w-full p-2 border rounded text-black bg-white text-sm"
                  inputStyle={{ width: '100%' }}
                  inputProps={{ name: 'responsiblePhone', required: true }}
                  placeholder="Phone"
                />
              </div>
              <input type="text" name="responsiblePosition" placeholder="Position" value={formData.responsiblePosition} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
              <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm" required />
            </div>
            <textarea name="comments" placeholder="Observations / Comments (optional)" value={formData.comments} onChange={handleChange} className="p-2 border rounded text-black bg-white text-sm mt-2" rows={3} />            <div className="flex flex-col mt-2">
              <label className="text-sm font-medium text-gray-700 mb-1">Official Document (optional, PDF or image)</label>
              <input type="file" name="docFile" accept="application/pdf,image/*" onChange={handleDocFileChange} className="p-2 border rounded text-black bg-white text-sm" />
            </div>
            {message && (
              <div className="mt-2">
                {message.startsWith("ERROR:") ? (
                  <>
                    <p className="text-red-600 text-sm">{message.replace("ERROR: ", "")}</p>
                    <a href="/forgot-password" className="text-orange-500 text-sm hover:underline">
                      Click here to recover your password
                    </a>
                  </>
                ) : (
                  <p className="text-green-600 text-sm">{message}</p>
                )}
              </div>
            )}
            <button type="submit" className="w-full bg-orange-500 text-white p-3 rounded font-bold hover:bg-orange-600 mt-4">Register</button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CompanyRegisterPage;