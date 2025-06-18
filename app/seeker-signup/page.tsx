"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust path as needed
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../../styles/phone-input.css'; // Custom styling for PhoneInput
import Layout from '../../components/Layout';
import { AuthProvider, useAuth } from '../../components/AuthProvider'; // Import Auth context

const isProduction = process.env.NEXT_PUBLIC_DEPLOY_STAGE === "production";

// Componente separado para o signup dos seekers que usa Firebase Auth
function SeekerSignupForm() {
  const { signup, loginWithGoogle } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password || !firstName || !lastName || !phoneNumber || !confirmPassword) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (!db) {
      setError("Database connection is not available. Please try again later.");
      setIsLoading(false);
      console.error("Firestore not initialized in seeker signup");
      return;
    }

    try {
      // Check if phone number already exists (email check handled by Firebase Auth)
      const seekersRef = collection(db, "seekers");
      const phoneQuery = query(seekersRef, where("phoneNumber", "==", phoneNumber));
      const phoneSnapshot = await getDocs(phoneQuery);
      
      if (!phoneSnapshot.empty) {
        setError("An account with this phone number already exists.");
        setIsLoading(false);
        return;
      }
      
      // Create user account with Firebase Auth
      const userData = {
        firstName,
        lastName,
        phoneNumber,
        name: firstName,
        surname: lastName,
        notificationPreferences: { marketing: true },
      };
      
      // Use the signup function from AuthProvider
      await signup(email, password, userData, 'seeker');
      
      // Redirect to dashboard on successful signup
      router.replace("/seeker-dashboard");
    } catch (err) {
      setError("An error occurred during signup. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-900 text-white p-4">
      <div className="absolute top-4 right-4">
        <a href="/" className="text-white text-lg font-semibold hover:underline">Back to Home &rarr;</a>
      </div>
      <div className="bg-black/70 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-semibold text-orange-500 mb-4 text-center">Seeker Signup</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-xs font-medium text-gray-300 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Your First Name"
              className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-xs font-medium text-gray-300 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Your Last Name"
              className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-300 mb-1">
              Phone Number
            </label>
            <div className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg">
              <PhoneInput
                international
                defaultCountry="PT"
                value={phoneNumber}
                onChange={setPhoneNumber as (value: string | undefined) => void}
                placeholder="Enter phone number"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="********"
              className="w-full p-2 bg-white border border-orange-500/30 rounded-lg text-black text-sm"
              required
            />
          </div>
          {error && (
            <div className="text-center mb-3">
              <p className="text-red-500 text-xs">{error}</p>
              <a href="/forgot-password" className="text-orange-400 text-xs hover:underline">
                Forgot your password? Click here to recover it
              </a>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-orange-500 text-white py-2 px-6 rounded-full font-semibold text-sm cursor-pointer transition-colors hover:bg-orange-300 border-none mt-3 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Signing up..." : "Sign Up"}
          </button>
          
          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-400"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs">OR</span>
            <div className="flex-grow border-t border-gray-400"></div>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              loginWithGoogle('seeker')
                .then(() => router.replace('/seeker-dashboard'))
                .catch(err => {
                  console.error("Google signup error:", err);
                  setError(err.message || "Error signing up with Google");
                })
                .finally(() => setIsLoading(false));
            }}
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 py-2 px-6 rounded-full hover:bg-gray-50 font-semibold text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            Sign up with Google
          </button>
        </form>
        <div className="flex flex-row justify-between mt-3">
          <p className="text-center text-xs text-gray-400">
            Already have an account?{" "}
            <a href="/login" className="text-orange-400 hover:underline">
              Login
            </a>
          </p>
          <p className="text-center text-xs text-gray-400">
            Are you a company?{" "}
            <a href="/company-register" className="text-orange-400 hover:underline">
              Register Here
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

const SeekerSignupPage: React.FC = () => {
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth(); // Use Auth context

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password || !firstName || !lastName || !phoneNumber || !confirmPassword) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }    if (!db) {
      setError("Database connection is not available. Please try again later.");
      setIsLoading(false);
      console.error("Firestore not initialized in seeker signup");
      return;
    }    try {
      // Check if phone number already exists (email check handled by Firebase Auth)
      const seekersRef = collection(db, "seekers");
      const phoneQuery = query(seekersRef, where("phoneNumber", "==", phoneNumber));
      const phoneSnapshot = await getDocs(phoneQuery);
      
      if (!phoneSnapshot.empty) {
        setError("An account with this phone number already exists.");
        setIsLoading(false);
        return;
      }
      
      // Create user account with Firebase Auth
      const userData = {
        firstName,
        lastName,
        phoneNumber,
        name: firstName,
        surname: lastName,
        notificationPreferences: { marketing: true },
      };
      
      // Use the signup function from AuthProvider
      await signup(email, password, userData, 'seeker');
      
      // Redirect to dashboard on successful signup
      router.replace("/seeker-dashboard");
    } catch (err) {
      setError("An error occurred during signup. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-900 text-white p-4">
        <div className="absolute top-4 right-4">
          <a href="/" className="text-white text-lg font-semibold hover:underline">Back to Home &rarr;</a>
        </div>
        <div className="bg-black/70 p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-semibold text-orange-500 mb-4 text-center">Seeker Signup</h1>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-xs font-medium text-gray-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your First Name"
                className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-xs font-medium text-gray-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your Last Name"
                className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-300 mb-1">
                Phone Number
              </label>
              <div className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg">
                <PhoneInput
                  international
                  defaultCountry="PT"
                  value={phoneNumber}
                  onChange={setPhoneNumber as (value: string | undefined) => void}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full p-2 bg-black/50 border border-orange-500/30 rounded-lg text-white text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                className="w-full p-2 bg-white border border-orange-500/30 rounded-lg text-black text-sm"
                required
              />
            </div>
            {error && (
              <div className="text-center mb-3">
                <p className="text-red-500 text-xs">{error}</p>
                <a href="/forgot-password" className="text-orange-400 text-xs hover:underline">
                  Forgot your password? Click here to recover it
                </a>
              </div>
            )}            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-orange-500 text-white py-2 px-6 rounded-full font-semibold text-sm cursor-pointer transition-colors hover:bg-orange-300 border-none mt-3 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Signing up..." : "Sign Up"}
            </button>
            
            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-400"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-xs">OR</span>
              <div className="flex-grow border-t border-gray-400"></div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                loginWithGoogle('seeker')
                  .then(() => router.replace('/seeker-dashboard'))
                  .catch(err => {
                    console.error("Google signup error:", err);
                    setError(err.message || "Error signing up with Google");
                  })
                  .finally(() => setIsLoading(false));
              }}
              className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 py-2 px-6 rounded-full hover:bg-gray-50 font-semibold text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
              </svg>
              Sign up with Google
            </button>
          </form>
          <div className="flex flex-row justify-between mt-3">            <p className="text-center text-xs text-gray-400">
              Already have an account?{" "}
              <a href="/login" className="text-orange-400 hover:underline">
                Login
              </a>
            </p>
            <p className="text-center text-xs text-gray-400">
              Are you a company?{" "}
              <a href="/company-register" className="text-orange-400 hover:underline">
                Register Here
              </a>
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default SeekerSignupPage;
