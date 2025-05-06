"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust path as needed
import bcrypt from "bcryptjs";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../../styles/phone-input.css'; // Custom styling for PhoneInput
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import Layout from '../../components/Layout';

const SeekerSignupPage: React.FC = () => {
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
      const hashedPassword = await bcrypt.hash(password, 10);
      const seekersRef = collection(db, "seekers");

      await addDoc(seekersRef, {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        createdAt: new Date(),
      });

      router.replace("/admin-login");
    } catch (err) {
      setError("An error occurred during signup. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setIsLoading(true);

    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // This gives you a Google Access Token, which you can use to access the Google API.
      const user = result.user;
      
      // Check if user already exists in your database
      if (user.email && db) { // Add null check for db
        // Store user data in Firestore
        const seekersRef = collection(db, "seekers");
        await addDoc(seekersRef, {
          email: user.email,
          firstName: user.displayName?.split(' ')[0] || "",
          lastName: user.displayName?.split(' ').slice(1).join(' ') || "",
          phoneNumber: user.phoneNumber || "",
          googleId: user.uid,
          createdAt: new Date(),
        });

        router.replace("/admin-login");
      } else {
        setError("Unable to connect to database or missing email information.");
      }
    } catch (err: any) {
      console.error("Google signup error:", err);
      setError(err.message || "Failed to sign up with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-500 text-white p-4">
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
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-orange-500 text-white py-2 px-6 rounded-full font-semibold text-sm cursor-pointer transition-colors hover:bg-orange-300 border-none mt-3 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
          <button
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className={`w-full bg-white text-black py-2 px-6 rounded-full font-semibold text-sm cursor-pointer transition-colors hover:bg-gray-200 border-none mt-3 flex items-center justify-center ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FcGoogle className="mr-2 text-base" /> Sign Up with Google
          </button>
          <div className="flex flex-row justify-between mt-3">
            <p className="text-center text-xs text-gray-400">
              Already have an account?{" "}
              <a href="/admin-login" className="text-orange-400 hover:underline">
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
