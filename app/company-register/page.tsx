"use client";

import React, { useState } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import "../../components/global.css";

const CompanyRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    employees: "",
    yearsActive: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!db) {
        throw new Error("Database is not initialized.");
      }
      const docRef = await addDoc(collection(db, "pendingCompanies"), {
        ...formData,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setMessage("Registration submitted successfully. Awaiting approval.");
      console.log("Document written with ID: ", docRef.id);
    } catch (error) {
      console.error("Error adding document: ", error);
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-900">
      <form onSubmit={handleSubmit} className="bg-orange-500 p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-black">Company Registration</h2>
        {message && <p className="text-green-500 text-sm mb-4">{message}</p>}
        <input
          type="text"
          name="companyName"
          placeholder="Company Name"
          value={formData.companyName}
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black"
          required
        />
        <input
          type="text"
          name="industry"
          placeholder="Industry"
          value={formData.industry}
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black"
          required
        />
        <input
          type="number"
          name="employees"
          placeholder="Number of Employees"
          value={formData.employees}
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black"
          required
        />
        <input
          type="number"
          name="yearsActive"
          placeholder="Years in Operation"
          value={formData.yearsActive}
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black"
          required
        />
        <button
          type="submit"
          className="w-full bg-black text-orange-500 p-2 rounded hover:bg-gray-800"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default CompanyRegisterPage;