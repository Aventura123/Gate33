"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "../../components/global.css";
import Link from "next/link";
import Layout from '../../components/Layout';
import { AuthProvider, useAuth } from '../../components/AuthProvider';

// Separate component for seekers login that uses Firebase Auth
function SeekerLoginForm() {
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const [seekerEmail, setSeekerEmail] = useState("");
  const [seekerPassword, setSeekerPassword] = useState("");
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

    try {
      await loginWithEmail(seekerEmail, seekerPassword, 'seeker');
      router.replace("/seeker-dashboard");
    } catch (err: any) {
      console.error("Error during login process:", err);
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSeekerLogin} className="p-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="mb-6">
        <label htmlFor="seeker-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>        <input
          id="seeker-email"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={seekerEmail}
          onChange={(e) => setSeekerEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
          autoComplete="email"
          required
        />
      </div>
      
      <div className="mb-6">
        <label htmlFor="seeker-password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>        <input
          id="seeker-password"
          type="password"
          name="password"
          placeholder="Enter your password"
          value={seekerPassword}
          onChange={(e) => setSeekerPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
          autoComplete="current-password"
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
      
      <div className="mt-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsLoading(true);
            loginWithGoogle('seeker')
              .then(() => router.replace('/seeker-dashboard'))
              .catch((err: any) => {
                console.error("Google login error:", err);
                setError(err.message || "Error logging in with Google");
              })
              .finally(() => setIsLoading(false));
          }}
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 py-3 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
          </svg>
          Continue with Google
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
  );
}

// Separate component for companies login that uses the company API
function CompanyLoginForm() {
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCompanyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!companyEmail || !companyPassword) {
      setError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      // Use the company API endpoint for authentication
      const res = await fetch("/api/company/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: companyEmail, password: companyPassword })
      });

      const data = await res.json();      if (res.ok) {
        // Save token and company data in localStorage
        if (data.company) {
          // The dashboard expects the token to be the company ID encoded in base64
          const companyIdToken = btoa(data.company.id);
          localStorage.setItem("token", companyIdToken);
          localStorage.setItem("companyId", data.company.id);
          localStorage.setItem("companyName", data.company.name || companyEmail);
          
          if (data.company.firebaseUid) {
            localStorage.setItem("companyFirebaseUid", data.company.firebaseUid);
          }
          
          // Also save the Firebase token if needed for other operations
          if (data.token) {
            localStorage.setItem("firebaseToken", data.token);
          }
        }

        // Set authentication cookie
        document.cookie = "isAuthenticated=true; path=/; max-age=86400"; // 24 hours
        
        router.replace("/company-dashboard");
      } else {
        setError(data.error || "Invalid email or password or company not approved.");
      }
    } catch (err: any) {
      console.error("Error during company login:", err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleCompanyLogin} className="p-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="mb-6">
        <label htmlFor="company-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="company-email"
          type="email"
          name="email"
          placeholder="Enter your company email"
          value={companyEmail}
          onChange={(e) => setCompanyEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
          autoComplete="work email"
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
          name="password"
          placeholder="Enter your password"
          value={companyPassword}
          onChange={(e) => setCompanyPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="mt-2 text-right">
        <Link href="/forgot-password" className="text-xs text-orange-500 hover:text-orange-700 font-medium">
          Forgot password?
        </Link>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full bg-orange-500 text-white py-3 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors font-medium ${
          isLoading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {isLoading ? "Logging in..." : "Login as Company"}
      </button>
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have a company account?{" "}
          <Link href="/company-register" className="text-orange-500 hover:text-orange-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </form>
  );
}

function LoginContent() {
  const [activeTab, setActiveTab] = useState<"seeker" | "company">("seeker");

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-900 text-white p-4">
        <div className="w-full max-w-md">
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
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
              <SeekerLoginForm />
            )}
            
            {/* Company Login Form */}
            {activeTab === "company" && (
              <CompanyLoginForm />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function UnifiedLoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}

export default UnifiedLoginPage;
