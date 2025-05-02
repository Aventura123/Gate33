"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Layout from "../../components/Layout";
import { logSystemActivity } from "../../utils/logSystem";
import bcrypt from "bcryptjs";

const SupportLogin: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  // Check if the user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");

    if (token) {
      // If already logged in and is support or super_admin, redirect to the dashboard
      if (role === "support" || role === "super_admin") {
        router.replace("/support-dashboard");
      }
    }
  }, [router]);

  // Function to reset a user's password (development only)
  const handleResetPassword = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, check if the user exists
      const usersRef = collection(db, "admins");
      const q = query(usersRef, where("username", "==", username));
      let querySnapshot = await getDocs(q);

      // If not found by username, try by email
      if (querySnapshot.empty) {
        const q2 = query(usersRef, where("email", "==", username));
        querySnapshot = await getDocs(q2);
      }

      if (querySnapshot.empty) {
        setError("User not found. Please check the username or email.");
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Display debug information (development only)
      setDebugInfo({
        id: userDoc.id,
        username: userData.username || 'N/A',
        email: userData.email || 'N/A', 
        role: userData.role || 'N/A',
        currentPassword: userData.password || 'N/A'
      });
      setShowDebugInfo(true);

      // Update the password (to '123456' - development only)
      const hashedPassword = await bcrypt.hash("123456", 10);
      await updateDoc(doc(db, "admins", userDoc.id), {
        password: hashedPassword
      });

      setPassword("123456"); // Auto-fill the password field
      setError(null);
      alert(`Password reset to '123456' successfully! You can now log in.`);
      setResetMode(false);

    } catch (err: any) {
      console.error("Error resetting password:", err);
      setError(err.message || "An error occurred while resetting the password.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setShowDebugInfo(false);
    setDebugInfo(null);

    try {
      // Display data for debugging
      console.log(`Attempting to log in with username: ${username}`);

      if (!db) {
        throw new Error("Firestore database is not available");
      }

      // First, try to find the user by the 'username' field
      let usersRef = collection(db, "admins");
      let q = query(usersRef, where("username", "==", username));
      let querySnapshot = await getDocs(q);

      // If not found by username, try by email
      if (querySnapshot.empty) {
        console.log("User not found by 'username', trying 'email'");
        q = query(usersRef, where("email", "==", username));
        querySnapshot = await getDocs(q);
      }

      // If still not found, try by user_id (if this field exists)
      if (querySnapshot.empty) {
        console.log("User not found by 'email', trying 'user_id'");
        q = query(usersRef, where("user_id", "==", username));
        querySnapshot = await getDocs(q);
      }

      // If still not found, check if the login is with email@teste.com or support@teste.com
      if (querySnapshot.empty && (username === "email@teste.com" || username === "support@teste.com")) {
        console.log("Test email detected, searching for any support user");
        q = query(usersRef, where("role", "==", "support"));
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        console.log("No user found after all attempts");
        throw new Error("Incorrect username or password.");
      }

      // Get the user document
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      console.log("User document found:", {
        id: userDoc.id,
        role: userData.role,
        hasPasswordField: !!userData.password
      });

      // Verify the password
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (!passwordMatch) {
        console.log("Incorrect password");

        // Store information for debug mode (DEVELOPMENT ONLY)
        if (process.env.NODE_ENV !== 'production') {
          setDebugInfo({
            id: userDoc.id,
            username: userData.username || 'N/A',
            email: userData.email || 'N/A', 
            role: userData.role || 'N/A',
            currentPassword: userData.password || 'N/A'
          });
        }

        throw new Error("Incorrect username or password.");
      }

      const userRole = userData.role;
      const userId = userDoc.id;

      // Check if the user has support permissions
      if (userRole !== "support" && userRole !== "super_admin") {
        console.log(`Incompatible role: ${userRole}`);
        throw new Error(`You do not have permission to access the support panel. Current role: ${userRole}`);
      }

      console.log("Login successful! Role:", userRole);

      // Generate a simple token (in production, use a more secure method like JWT)
      const simpleToken = btoa(`${userId}:${Date.now()}`);

      // Save data in localStorage
      localStorage.setItem("token", simpleToken);
      localStorage.setItem("userId", userId);
      localStorage.setItem("userName", userData.name || username);
      localStorage.setItem("userRole", userRole);

      // Log access in the activity log using the logging utility
      await logSystemActivity(
        "login",
        userData.name || username,
        {
          userId: userId,
          username: username,
          userRole: userRole,
          loginType: "support-portal",
          timestamp: new Date().toISOString(),
          browser: navigator.userAgent
        }
      );

      console.log("Login recorded in the system logs");

      // Redirect to the dashboard
      router.push("/support-dashboard");
    } catch (err: any) {
      console.error("Login error:", err);

      setError(err.message || "An error occurred during login.");

      // Log unsuccessful login attempt
      try {
        await logSystemActivity(
          "login",
          username,
          {
            success: false,
            error: err.message || "Unknown error",
            loginType: "support-portal",
            timestamp: new Date().toISOString()
          }
        );
      } catch (logError) {
        console.error("Error logging login failure:", logError);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleResetMode = () => {
    setResetMode(!resetMode);
    setError(null);
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black text-white">
        <div className="w-full max-w-md">
          <div className="bg-black/70 rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-blue-500">Support Panel</h1>
              <p className="text-gray-400 mt-2">
                {resetMode ? "Reset your password" : "Log in with your support credentials"}
              </p>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-600 text-white px-4 py-3 rounded mb-4">
                <p>{error}</p>
              </div>
            )}

            {/* Login or Reset Form */}
            {resetMode ? (
              <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-gray-300 mb-2">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Reset Password"}
                </button>

                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={toggleResetMode}
                    className="text-blue-400 hover:underline text-sm"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>

                {/* Password recovery link - development environment only */}
                {process.env.NODE_ENV !== 'production' && (
                  <div className="text-center mt-4">
                    <button 
                      type="button" 
                      onClick={toggleResetMode}
                      className="text-blue-400 hover:underline text-sm"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Debug information - development only */}
            {showDebugInfo && debugInfo && process.env.NODE_ENV !== 'production' && (
              <div className="mt-6 p-4 bg-gray-900 rounded-md border border-gray-700 text-sm">
                <h4 className="text-yellow-500 font-medium mb-2">Debug Information:</h4>
                <pre className="text-gray-300 text-xs overflow-x-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SupportLogin;