"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust path as needed
import bcrypt from "bcryptjs"; // Import bcryptjs
import Link from "next/link";

const SeekerLoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  // State to check if we are in production (Netlify)
  const [isProduction, setIsProduction] = useState(false);
  
  useEffect(() => {
    // Check if we are in production environment (Netlify)
    setIsProduction(window.location.hostname.includes('netlify.app'));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Starting login process for email:", email);
      
      // First try to use the API route
      try {
        const res = await fetch("/api/seeker/auth", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ email, password })
        });
        
        console.log("API response status:", res.status);
        
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            console.log("Login successful via API");
            localStorage.setItem("seekerToken", data.token);
            if (data.seeker) {
              localStorage.setItem("seekerId", data.seeker.id);
              localStorage.setItem("seekerName", data.seeker.name || data.seeker.email);
              if (data.seeker.photoURL) {
                localStorage.setItem("seekerPhoto", data.seeker.photoURL);
              }
            }
            document.cookie = "isAuthenticated=true; path=/; max-age=86400"; // 24 hours
            router.replace("/seeker-dashboard");
            return;
          }
        }
        
        // If the API fails, continue with the direct method
        console.log("API authentication failed, trying direct Firestore method");
      } catch (apiError) {
        console.error("Error with API auth, falling back to direct method:", apiError);
      }

      // Direct method using Firestore (fallback)
      if (!db) {
        setError("Database connection is not available. Please try again later.");
        setIsLoading(false);
        console.error("Firestore not initialized in seeker login");
        return;
      }

      const seekersRef = collection(db, "seekers");
      const q = query(seekersRef, where("email", "==", email));
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
        console.error("Password hash not found or invalid for seeker:", email);
        setError("Invalid email or password."); // Avoid exposing internal errors to the user
        setIsLoading(false);
        return;
      }

      console.log("Comparing entered password with stored hash...");
      let passwordMatches = false;
      
      // Check bcrypt hash
      if (storedHash.startsWith('$2')) {
        passwordMatches = await bcrypt.compare(password, storedHash);
      } else {
        // Direct comparison for non-encrypted passwords (for testing)
        passwordMatches = (password === storedHash);
      }

      if (passwordMatches) {
        console.log("Password matches. Login successful.");
        const seekerId = seekerDoc.id;
        const token = btoa(seekerId); // Base64 encode the seeker ID
        localStorage.setItem("seekerToken", token);
        localStorage.setItem("seekerId", seekerId);
        localStorage.setItem("seekerName", seekerData.name || seekerData.email || email);
        if (seekerData.photoURL) {
          localStorage.setItem("seekerPhoto", seekerData.photoURL);
        }
        document.cookie = "isAuthenticated=true; path=/; max-age=86400"; // 24 hours
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

  return (
    <>
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-500 text-white p-4">
        <div className="absolute top-4 right-4">
          <Link href="/" className="text-white text-lg font-semibold hover:underline">Back to Home &rarr;</Link>
        </div>
        <div className="bg-black/70 p-10 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-3xl font-semibold text-orange-500 mb-6 text-center">Seeker Login</h1>
          
          {isProduction && (
            <div className="bg-yellow-800/50 text-yellow-200 p-3 rounded mb-4 text-sm">
              <p>This site is running on Netlify. Some functions may not be available.</p>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-orange-500 text-white py-3 px-8 rounded-full font-semibold text-lg cursor-pointer transition-colors hover:bg-orange-300 border-none mt-5 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-4">
            Don't have an account?{" "}
            <Link href="/seeker-signup" className="text-orange-400 hover:underline">
              Sign Up
            </Link>
          </p>
          <p className="text-center text-sm text-gray-400 mt-2">
            Are you a company?{" "}
            <Link href="/company-login" className="text-orange-400 hover:underline">
              Login Here
            </Link>
          </p>
        </div>
      </main>
    </>
  );
};

export default SeekerLoginPage;
