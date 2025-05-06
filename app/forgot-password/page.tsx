"use client";
import React, { useState } from "react";
import Layout from '../../components/Layout';

export default function ForgotPasswordPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("If an account exists, you will receive an email with instructions to reset your password.");
      } else {
        setError(data.error || "Error requesting password recovery.");
      }
    } catch (err) {
      setError("Error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-900">
        <div className="absolute top-4 left-4">
          <button
            type="button"
            onClick={() => window.location.href = "/"}
            className="flex items-center text-orange-600 hover:text-orange-700 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </button>
        </div>
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Reset password</h2>
          <form onSubmit={handleSubmit}>
            <label className="block mb-2 text-gray-700">Email or username</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded mb-4 text-black"
              value={emailOrUsername}
              onChange={e => setEmailOrUsername(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send recovery link"}
            </button>
          </form>
          {message && <div className="mt-4 text-green-600">{message}</div>}
          {error && <div className="mt-4 text-red-600">{error}</div>}
        </div>
      </div>
    </Layout>
  );
}
