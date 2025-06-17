"use client";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Layout from '../../components/Layout';

export const dynamic = "force-dynamic";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Password reset successfully! You can now log in.");
        setTimeout(() => router.replace("/login"), 2000);
      } else {
        setError(data.error || "Error resetting password.");
      }
    } catch (err) {
      setError("Error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-900">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center !text-black">Reset password</h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2 !text-gray-700 font-medium">New password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded mb-4 !text-black !bg-white border-gray-300 focus:border-orange-500 focus:outline-none"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <label className="block mb-2 !text-gray-700 font-medium">Confirm new password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded mb-4 !text-black !bg-white border-gray-300 focus:border-orange-500 focus:outline-none"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition-colors font-medium"
            disabled={loading}
          >
            {loading ? "Saving..." : "Reset password"}
          </button>
        </form>
        {message && <div className="mt-4 !text-green-600 font-medium">{message}</div>}
        {error && <div className="mt-4 !text-red-600 font-medium">{error}</div>}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Layout>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </Layout>
  );
}
