"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import "../../components/global.css"; // Ensure global styles are applied
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import bcrypt from "bcryptjs";
import Layout from '../../components/Layout';

function UnifiedLoginPage() {
  const [activeTab, setActiveTab] = useState<"seeker" | "company">("seeker");
  
  // Seeker State
  const [seekerEmail, setSeekerEmail] = useState("");
  const [seekerPassword, setSeekerPassword] = useState("");
  
  // Company State
  const [companyUsername, setCompanyUsername] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSeekerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!seekerEmail || !seekerPassword) {
      setError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    if (!db) {
      setError("Database connection is not available. Please try again later.");
      setIsLoading(false);
      console.error("Firestore not initialized in seeker login");
      return;
    }

    try {
      console.log("Starting login process for email:", seekerEmail);

      const seekersRef = collection(db, "seekers");
      const q = query(seekersRef, where("email", "==", seekerEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn("No seeker found with the provided email.");
        setError("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      const seekerDoc = querySnapshot.docs[0];
      const seekerData = seekerDoc.data();
      console.log("Seeker data retrieved:", seekerData);

      const storedHash = seekerData.password; // Use the correct field name
      if (!storedHash || typeof storedHash !== "string") {
        console.error("Password hash not found or invalid for seeker:", seekerEmail);
        setError("Invalid email or password."); // Avoid exposing internal errors to the user
        setIsLoading(false);
        return;
      }

      console.log("Comparing entered password with stored hash...");
      const passwordMatches = await bcrypt.compare(seekerPassword, storedHash);

      if (passwordMatches) {
        console.log("Password matches. Login successful.");
        const seekerId = seekerDoc.id;
        const token = btoa(seekerId); // Base64 encode the seeker ID
        localStorage.setItem("seekerToken", token);
        router.replace("/seeker-dashboard");
      } else {
        console.warn("Password does not match.");
        setError("Invalid email or password.");
      }
    } catch (err) {
      console.error("Error during login process:", err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      console.log("Trying to log in with:", { companyUsername });
      // Send email and password as expected by backend
      const res = await fetch("/api/company/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: companyUsername, password: companyPassword })
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response received:", data);

      if (res.ok) {
        console.log("Login successful!");

        // Save token in localStorage
        if (data.token) {
          localStorage.setItem("token", data.token);
          console.log("Token saved in localStorage");
          
          // Extract company ID from token if possible (it's often base64 encoded)
          try {
            const decodedToken = atob(data.token);
            localStorage.setItem("companyId", decodedToken);
            console.log("CompanyId extracted from token:", decodedToken);
          } catch (err) {
            console.warn("Couldn't decode token to extract companyId:", err);
          }
        }

        // FIX: Look for data in the 'company' property instead of 'userData'
        if (data.company) {
          console.log("Company data found:", data.company);
          localStorage.setItem("companyId", data.company.id);
          localStorage.setItem("companyName", data.company.name || companyUsername);
          
          if (data.company.photo) {
            localStorage.setItem("companyPhoto", data.company.photo);
          }
        } 
        // Also check the old userData format (for compatibility)
        else if (data.userData) {
          console.log("Company data found in userData:", data.userData);
          localStorage.setItem("companyId", data.userData.id);
          localStorage.setItem("companyName", data.userData.name || data.userData.username || companyUsername);
          
          if (data.userData.photoURL) {
            localStorage.setItem("companyPhoto", data.userData.photoURL);
          } else if (data.userData.photo) {
            localStorage.setItem("companyPhoto", data.userData.photo);
          }
        } 
        else {
          console.warn("User data not found in response - using username as fallback");
          // If we can't find structured data, at least save the username
          localStorage.setItem("companyName", companyUsername);
        }

        console.log("Data saved in localStorage:", {
          companyId: localStorage.getItem("companyId"),
          companyName: localStorage.getItem("companyName"),
          companyPhoto: localStorage.getItem("companyPhoto"),
        });

        document.cookie = "isAuthenticated=true; path=/; max-age=86400"; // 24 hours
        console.log("Authentication cookie set, redirecting to dashboard");
        router.replace("/company-dashboard");
      } else {
        console.error("Login error:", data.error);
        setError(data.error || "Username or password invalid");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-black to-orange-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-4 left-4">
          <Link href="/" className="flex items-center text-white hover:text-orange-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </div>
        
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Client Login</h2>
            <p className="mt-2 text-sm text-gray-200">Choose your account type to get started</p>
          </div>
          
          {/* Account Type Selection Cards */}
          <div className="flex justify-center gap-4 mb-6">
            <div 
              className={`cursor-pointer flex flex-col items-center p-4 rounded-lg ${
                activeTab === "seeker" 
                ? "bg-orange-500 text-white" 
                : "bg-white text-gray-800 hover:bg-orange-100"
              } transition-colors shadow-md w-1/2`}
              onClick={() => setActiveTab("seeker")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Job Seeker</span>
            </div>
            
            <div 
              className={`cursor-pointer flex flex-col items-center p-4 rounded-lg ${
                activeTab === "company" 
                ? "bg-orange-500 text-white" 
                : "bg-white text-gray-800 hover:bg-orange-100"
              } transition-colors shadow-md w-1/2`}
              onClick={() => setActiveTab("company")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H7a1 1 0 00-1 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Company</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="bg-orange-500 p-1"></div>
            
            {/* Seeker Login Form */}
            {activeTab === "seeker" && (
              <form onSubmit={handleSeekerLogin} className="p-8">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}
                
                <div className="mb-6">
                  <label htmlFor="seeker-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="seeker-email"
                    type="email"
                    placeholder="Enter your email"
                    value={seekerEmail}
                    onChange={(e) => setSeekerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="seeker-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="seeker-password"
                    type="password"
                    placeholder="Enter your password"
                    value={seekerPassword}
                    onChange={(e) => setSeekerPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
                    required
                  />
                </div>
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" className="text-xs text-orange-500 hover:text-orange-700 font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full bg-orange-500 text-white py-3 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors font-medium ${
                      isLoading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {isLoading ? "Logging in..." : "Login as Job Seeker"}
                  </button>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Don't have a seeker account?{" "}
                    <Link href="/seeker-signup" className="text-orange-500 hover:text-orange-700 font-medium">
                      Sign up
                    </Link>
                  </p>
                </div>
              </form>
            )}
            
            {/* Company Login Form */}
            {activeTab === "company" && (
              <form onSubmit={handleCompanyLogin} className="p-8">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}
                
                <div className="mb-6">
                  <label htmlFor="company-username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    id="company-username"
                    type="text"
                    placeholder="Enter your company username"
                    value={companyUsername}
                    onChange={(e) => setCompanyUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="company-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="company-password"
                    type="password"
                    placeholder="Enter your password"
                    value={companyPassword}
                    onChange={(e) => setCompanyPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
                    required
                  />
                </div>
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" className="text-xs text-orange-500 hover:text-orange-700 font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full bg-orange-500 text-white py-3 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors font-medium ${
                      isLoading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {isLoading ? "Logging in..." : "Login as Company"}
                  </button>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Don't have a company account?{" "}
                    <Link href="/company-register" className="text-orange-500 hover:text-orange-700 font-medium">
                      Sign up
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default UnifiedLoginPage;