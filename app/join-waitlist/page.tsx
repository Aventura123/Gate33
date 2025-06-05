"use client";
import React, { useState } from "react";

export default function JoinWaitlistPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      // Dynamic import for SSR safety
      const { getDocs, collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");
      // Check for duplicates
      const snapshot = await getDocs(collection(db, "jobAlertSubscribers"));
      const exists = snapshot.docs.some(doc => doc.data().email === email);
      if (exists) {
        setError("This email is already subscribed.");
        return;
      }
      await addDoc(collection(db, "jobAlertSubscribers"), {
        email,
        createdAt: serverTimestamp(),
        active: true
      });
      setSubmitted(true);
      setEmail("");
    } catch (err) {
      setError("Failed to join waitlist. Please try again later.");
    }
  };

  return (    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 min-h-screen bg-gradient-to-br from-orange-900 to-black">
      <div className="max-w-xl w-full bg-black/40 border border-orange-500/20 rounded-xl shadow-lg p-8 text-center">        <h1 className="text-3xl md:text-4xl font-bold text-orange-400 mb-4">Be the First to Know</h1>
        <p className="text-gray-300 mb-6 text-lg">Sign up to get notified when we launch and receive exclusive platform updates.</p>
        {submitted ? (
          <div className="text-green-400 text-lg font-semibold py-8">Thank you for joining the waitlist!<br />We'll keep you updated.</div>
        ) : (<form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
            <input
              type="email"
              className="w-full px-4 py-3 rounded bg-gray-800 text-white border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded transition"
            >
              Join the Waitlist
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
