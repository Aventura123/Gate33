"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "../../components/global.css";
import { logSystemActivity } from "../../utils/logSystem";

const AdminLoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!username || !password) {
      setError("Please enter both username and password");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Attempting admin login for:", username);
      
      // Usar URL relativa para compatibilidade com qualquer ambiente
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: username, password: password })
      });

      console.log("Response status:", res.status);
      
      // Verificar se a resposta é válida antes de tentar analisar JSON
      if (!res.ok) {
        let errorMessage = `Error ${res.status}: ${res.statusText}`;
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        
        throw new Error(errorMessage);
      }
      
      // Verificação mais segura para análise de JSON
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        console.warn("Response is not JSON. Content-Type:", contentType);
        data = await res.text();
        try {
          // Tentar analisar manualmente se o corpo for JSON
          data = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse response as JSON:", e);
          throw new Error("Invalid server response format");
        }
      }
      
      console.log("Response received:", data);

      if (data.success) {
        console.log("Admin login successful!");

        // Save token in localStorage
        if (data.token) {
          localStorage.setItem("token", data.token);
          console.log("Admin token saved in localStorage");
        } else {
          console.warn("Token not found in response");
        }

        // Save admin data in localStorage
        if (data.admin) {
          console.log("Admin data:", data.admin);
          localStorage.setItem("userId", data.admin.id);
          localStorage.setItem("userName", data.admin.name || data.admin.username);
          localStorage.setItem("userRole", data.admin.role || "viewer");
          
          if (data.admin.photoURL) {
            localStorage.setItem("userPhoto", data.admin.photoURL);
          }
          
          // Registrar o login no sistema de logs
          await logSystemActivity(
            "login",
            data.admin.name || data.admin.username || username,
            {
              adminId: data.admin.id,
              role: data.admin.role || "viewer",
              timestamp: new Date().toISOString(),
              loginMethod: "admin-portal"
            }
          );
        } else {
          console.warn("Admin data not found in response");
        }

        document.cookie = "isAuthenticated=true; path=/; max-age=86400"; // 24 hours
        console.log("Authentication cookie set, redirecting to admin dashboard");
        router.replace("/admin/dashboard");
      } else {
        console.error("Error during login:", data.error);
        setError(data.error || "Invalid username or password");
        
        // Registrar tentativa de login malsucedida
        await logSystemActivity(
          "login",
          username,
          {
            success: false,
            error: data.error || "Invalid username or password",
            timestamp: new Date().toISOString(),
            loginMethod: "admin-portal"
          }
        );
      }
    } catch (err: any) {
      console.error("Error during login process:", err);
      setError(err.message || "An error occurred. Please try again.");
      
      // Registrar erro de login
      await logSystemActivity(
        "login",
        username,
        {
          success: false,
          error: err.message || "Unknown error",
          timestamp: new Date().toISOString(),
          loginMethod: "admin-portal"
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          <h2 className="text-3xl font-bold text-white">Admin Login</h2>
          <p className="mt-2 text-sm text-gray-200">Access your admin dashboard</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-orange-500 p-1"></div>
          <form onSubmit={handleLogin} className="p-8">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
                required
              />
            </div>
            
            <div className="mb-2 text-right">
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
                {isLoading ? "Logging in..." : "Login to Admin Panel"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;